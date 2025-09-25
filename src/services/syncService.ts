import axios from 'axios';
import fs from 'fs';
import path from 'path';
import prisma from '../prisma';
import { STORAGE_PATH, OPENLIBRARY_ENRICH, OPDS_FEEDS, SYNC_MAX_FILE_MB, SYNC_STORAGE_QUOTA_MB, SYNC_GUTENDEX_PAGES, SYNC_MAX_ITEMS_PER_RUN } from '../config';
import { syncOpdsFeeds } from '../services/opdsService';

type GutendexBook = {
  id: number;
  title: string;
  authors: { name: string }[];
  languages: string[];
  subjects: string[];
  bookshelves?: string[];
  formats: Record<string, string | null>;
};

async function ensureDirectoryExists(directoryPath: string): Promise<void> {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

function getDirectorySizeBytes(directoryPath: string): number {
  if (!fs.existsSync(directoryPath)) return 0;
  const files = fs.readdirSync(directoryPath);
  let total = 0;
  for (const f of files) {
    const p = path.join(directoryPath, f);
    const stat = fs.statSync(p);
    if (stat.isFile()) total += stat.size;
  }
  return total;
}

async function downloadFile(url: string, destinationPath: string): Promise<void> {
  await ensureDirectoryExists(path.dirname(destinationPath));
  const response = await axios.get(url, { responseType: 'stream', timeout: 30000, validateStatus: s => s! >= 200 && s < 400 });
  const contentLength = Number(response.headers['content-length'] || 0);
  const maxBytes = SYNC_MAX_FILE_MB > 0 ? SYNC_MAX_FILE_MB * 1024 * 1024 : Infinity;
  if (contentLength && contentLength > maxBytes) {
    throw new Error('File too large');
  }
  if (SYNC_STORAGE_QUOTA_MB > 0) {
    const current = getDirectorySizeBytes(STORAGE_PATH);
    if (current + (contentLength || 0) > SYNC_STORAGE_QUOTA_MB * 1024 * 1024) {
      throw new Error('Storage quota exceeded');
    }
  }
  const writer = fs.createWriteStream(destinationPath);
  await new Promise<void>((resolve, reject) => {
    let downloaded = 0;
    response.data.on('data', (chunk: Buffer) => {
      downloaded += chunk.length;
      if (downloaded > maxBytes) {
        response.data.destroy(new Error('File too large'));
      }
      if (SYNC_STORAGE_QUOTA_MB > 0) {
        const current = getDirectorySizeBytes(STORAGE_PATH);
        if (current + downloaded > SYNC_STORAGE_QUOTA_MB * 1024 * 1024) {
          response.data.destroy(new Error('Storage quota exceeded'));
        }
      }
    });
    response.data.pipe(writer);
    let finished = false;
    const cleanup = (err?: unknown) => {
      if (finished) return;
      finished = true;
      writer.close();
      if (err) reject(err);
      else resolve();
    };
    writer.on('finish', () => cleanup());
    writer.on('error', cleanup);
    response.data.on('error', cleanup);
  });
}

function pickBestFormat(formats: Record<string, string | null>): { url: string; format: string } | null {
  // Prefer epub without images, then epub generic, then pdf, then txt
  const preferredOrder = [
    'application/epub+zip',
    'application/pdf',
    'text/plain; charset=utf-8',
    'text/plain',
  ];
  for (const mime of preferredOrder) {
    const url = formats[mime];
    if (url && typeof url === 'string') {
      if (url.endsWith('.zip') && mime !== 'application/epub+zip') continue;
      const ext = mime.includes('epub') ? 'epub' : mime.includes('pdf') ? 'pdf' : 'txt';
      return { url, format: ext };
    }
  }
  for (const [mime, url] of Object.entries(formats)) {
    if (url && typeof url === 'string' && /^https?:\/\//.test(url)) {
      const ext =
        mime.includes('epub') ? 'epub' : mime.includes('pdf') ? 'pdf' : mime.includes('txt') ? 'txt' : 'bin';
      return { url, format: ext };
    }
  }
  return null;
}

export interface SyncSummary {
  source: string;
  fetched: number;
  created: number;
  skipped: number;
}

async function upsertTags(bookId: number, subjects: string[]): Promise<void> {
  const uniqueTags = Array.from(new Set(subjects.map(s => s.trim()).filter(Boolean))).slice(0, 15);
  for (const tagName of uniqueTags) {
    const tag = await prisma.tag.upsert({
      where: { name: tagName },
      update: {},
      create: { name: tagName },
    });
    await prisma.book.update({
      where: { id: bookId },
      data: { tags: { connect: { id: tag.id } } },
    });
  }
}

export async function syncGutendex(pageLimit = SYNC_GUTENDEX_PAGES, maxItems = SYNC_MAX_ITEMS_PER_RUN): Promise<SyncSummary> {

  let created = 0;
  let skipped = 0;
  let fetched = 0;

  const publicUploadsDir = path.join('uploads', 'public');
  await ensureDirectoryExists(publicUploadsDir);
  await ensureDirectoryExists(STORAGE_PATH);

  let nextUrl: string | null = 'https://gutendex.com/books/';
  for (let page = 0; page < pageLimit && nextUrl; page++) {
    let data: { results: GutendexBook[]; next: string | null } = { results: [], next: null };
    try {
      const resp = await axios.get(nextUrl, { timeout: 45000 });
      data = resp.data as { results: GutendexBook[]; next: string | null };
    } catch (e) {
      break;
    }
    fetched += data.results.length;

    for (const gb of data.results) {
      if (created + skipped >= maxItems) {
        nextUrl = null; 
        break;
      }
      const sourceKey = `gutendex:${gb.id}`;
      const existing = await prisma.book.findFirst({ where: { originalFilePath: sourceKey } });
      if (existing) {
        skipped += 1;
        continue;
      }
      const best = pickBestFormat(gb.formats);
      if (!best) {
        skipped += 1;
        continue;
      }

      const safeTitle = gb.title.replace(/[^a-z0-9\-_]+/gi, '_').slice(0, 80) || `book_${gb.id}`;
      const filename = `gutenberg-${gb.id}-${safeTitle}.${best.format}`;
      const downloadsPath = path.join('uploads', 'public', filename);
      const storagePath = path.join(STORAGE_PATH, filename);

      try {
        await downloadFile(best.url, storagePath);
        // Also copy to publicly served uploads so clients can download
        await ensureDirectoryExists(path.dirname(downloadsPath));
        fs.copyFileSync(storagePath, downloadsPath);
      } catch (err) {
        // If storage download fails, skip this book
        skipped += 1;
        continue;
      }

      const author = gb.authors && gb.authors.length > 0 ? gb.authors.map(a => a.name).join(', ') : null;
      const imageUrl = (gb.formats['image/jpeg'] as string) || null;
      const language = gb.languages && gb.languages.length > 0 ? gb.languages[0] : undefined;
      const genre = (gb.bookshelves && gb.bookshelves[0]) || undefined;

      const createdBook = await prisma.book.create({
        data: {
          title: gb.title,
          author: author || undefined,
          format: best.format,
          publisher: undefined,
          language: language,
          storagePath: storagePath,
          filePath: `/${downloadsPath.replace(/\\/g, '/')}`,
          originalFilePath: sourceKey,
          isPublic: true,
          imageUrl: imageUrl || undefined,
        },
      });

      if (!createdBook.imageUrl && OPENLIBRARY_ENRICH) {
        try {
          const qTitle = encodeURIComponent(gb.title);
          const qAuthor = author ? encodeURIComponent(author.split(',')[0]) : '';
          const url = `https://openlibrary.org/search.json?title=${qTitle}${qAuthor ? `&author=${qAuthor}` : ''}&limit=1`;
          const ol = await axios.get(url, { timeout: 15000 });
          const doc = ol.data && ol.data.docs && ol.data.docs[0];
          if (doc && doc.cover_i) {
            const coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
            await prisma.book.update({ where: { id: createdBook.id }, data: { imageUrl: coverUrl } });
          }
        } catch {}
      }

      if (gb.subjects && gb.subjects.length > 0) {
        await upsertTags(createdBook.id, gb.subjects);
      }
      created += 1;
    }
    nextUrl = data.next;
  }

  return { source: 'gutendex', fetched, created, skipped };
}

export async function syncAllSources(): Promise<SyncSummary[]> {
  const summaries: SyncSummary[] = [];
  const gut = await syncGutendex(1);
  summaries.push(gut);
  if (OPDS_FEEDS && OPDS_FEEDS.length > 0) {
    const opds = await syncOpdsFeeds();
    summaries.push(...opds);
  }
  return summaries;
}
