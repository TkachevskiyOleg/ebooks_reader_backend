import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import prisma from '../prisma';
import path from 'path';
import fs from 'fs';
import { STORAGE_PATH, OPDS_FEEDS, SYNC_MAX_FILE_MB, SYNC_STORAGE_QUOTA_MB, SYNC_MAX_ITEMS_PER_RUN } from '../config';

export interface SyncSummary {
  source: string;
  fetched: number;
  created: number;
  skipped: number;
}

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

async function download(url: string, dest: string): Promise<void> {
  await ensureDirectoryExists(path.dirname(dest));
  const response = await axios.get(url, { responseType: 'stream', timeout: 30000, validateStatus: s => s! >= 200 && s < 400 });
  const contentLength = Number(response.headers['content-length'] || 0);
  const maxBytes = SYNC_MAX_FILE_MB > 0 ? SYNC_MAX_FILE_MB * 1024 * 1024 : Infinity;
  if (contentLength && contentLength > maxBytes) throw new Error('File too large');
  if (SYNC_STORAGE_QUOTA_MB > 0) {
    const current = getDirectorySizeBytes(STORAGE_PATH);
    if (current + (contentLength || 0) > SYNC_STORAGE_QUOTA_MB * 1024 * 1024) {
      throw new Error('Storage quota exceeded');
    }
  }
  const writer = fs.createWriteStream(dest);
  await new Promise<void>((resolve, reject) => {
    let downloaded = 0;
    response.data.on('data', (chunk: Buffer) => {
      downloaded += chunk.length;
      if (downloaded > maxBytes) response.data.destroy(new Error('File too large'));
      if (SYNC_STORAGE_QUOTA_MB > 0) {
        const current = getDirectorySizeBytes(STORAGE_PATH);
        if (current + downloaded > SYNC_STORAGE_QUOTA_MB * 1024 * 1024) {
          response.data.destroy(new Error('Storage quota exceeded'));
        }
      }
    });
    response.data.pipe(writer);
    writer.on('finish', () => resolve());
    writer.on('error', reject);
    response.data.on('error', reject);
  });
}

function pickAcquisitionLink(entry: any): { href: string; format: string } | null {
  const links = entry.link || [];
  for (const l of links) {
    const attrs = l.$ || {};
    const href = attrs.href as string;
    const type = attrs.type as string;
    if (!href || !type) continue;
    if (/epub/i.test(type)) return { href, format: 'epub' };
    if (/pdf/i.test(type)) return { href, format: 'pdf' };
    if (/text|plain/i.test(type)) return { href, format: 'txt' };
  }
  return null;
}

export async function syncOpdsFeed(feedUrl: string): Promise<SyncSummary> {
  let fetched = 0, created = 0, skipped = 0;
  const xml = await axios.get(feedUrl, { timeout: 45000 });
  const parsed = await parseStringPromise(xml.data, { explicitArray: true });
  const entries = (((parsed || {}).feed || {}).entry) || [];
  fetched = entries.length;
  for (const entry of entries) {
    if (created + skipped >= SYNC_MAX_ITEMS_PER_RUN) break;
    const title = (entry.title && entry.title[0] && entry.title[0]._) || (entry.title && entry.title[0]) || 'Untitled';
    const author = entry.author && entry.author[0] && entry.author[0].name ? entry.author[0].name[0] : undefined;
    const acquisition = pickAcquisitionLink(entry);
    if (!acquisition) { skipped++; continue; }
    const idStr = (entry.id && entry.id[0]) || `${feedUrl}#${title}`;
    const sourceKey = `opds:${idStr}`;
    const existing = await prisma.book.findFirst({ where: { originalFilePath: sourceKey } });
    if (existing) { skipped++; continue; }
    const safeTitle = String(title).replace(/[^a-z0-9\-_]+/gi, '_').slice(0, 80) || 'book';
    const filename = `opds-${Buffer.from(idStr).toString('base64').slice(0,16)}-${safeTitle}.${acquisition.format}`;
    const storagePath = path.join(STORAGE_PATH, filename);
    const downloadPath = path.join('uploads', 'public', filename);
    try {
      await download(acquisition.href, storagePath);
      await ensureDirectoryExists(path.dirname(downloadPath));
      fs.copyFileSync(storagePath, downloadPath);
    } catch {
      skipped++; continue;
    }
    await prisma.book.create({
      data: {
        title: String(title),
        author: author,
        format: acquisition.format,
        filePath: `/${downloadPath.replace(/\\/g, '/')}`,
        storagePath: storagePath,
        originalFilePath: sourceKey,
        isPublic: true,
      }
    });
    created++;
  }
  return { source: feedUrl, fetched, created, skipped };
}

export async function syncOpdsFeeds(): Promise<SyncSummary[]> {
  const results: SyncSummary[] = [];
  for (const f of OPDS_FEEDS) {
    try {
      const r = await syncOpdsFeed(f);
      results.push(r);
    } catch (e) {
      results.push({ source: f, fetched: 0, created: 0, skipped: 0 });
    }
  }
  return results;
}


