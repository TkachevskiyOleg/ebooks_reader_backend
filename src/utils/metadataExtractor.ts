import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

interface BookMetadata {
  title: string;
  authors: string[];
  publisher?: string;
  tags?: string[];
  formats: string[];
  languages?: string[];
  identifiers?: Record<string, string>;
}

export async function extractMetadata(filePath: string, originalName: string) {
  const extension = path.extname(originalName).toLowerCase();
  const format = extension.replace('.', '');
  const defaultTitle = path.parse(originalName).name;

  console.log('[extractMetadata] path:', filePath);
  console.log('[extractMetadata] original name:', originalName);

  try {
    const { stdout } = await execAsync(`ebook-meta "${filePath}" --json`);
    console.log('[extractMetadata] Raw stdout:', stdout);

    const metadata: BookMetadata = JSON.parse(stdout);
    console.log('[extractMetadata] Parsed metadata:', metadata);

    return {
      title: metadata.title || defaultTitle,
      author: metadata.authors?.join(', ') || null,
      format,
      publisher: metadata.publisher || null,
      language: metadata.languages?.[0] || null
    };
  } catch (error) {
    console.error('[extractMetadata] ERROR:', error);
    return {
      title: defaultTitle,
      author: null,
      format,
      publisher: null,
      language: null
    };
  }
}
