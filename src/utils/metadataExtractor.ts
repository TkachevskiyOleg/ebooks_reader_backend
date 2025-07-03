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
  const ext = path.extname(originalName).toLowerCase();
  const format = ext.replace('.', '');
  let defaultTitle = path.parse(originalName).name;
  
  try {
    const { stdout } = await execAsync(`ebook-meta "${filePath}" --json`);
    const metadata: BookMetadata = JSON.parse(stdout);

    return {
      title: metadata.title || defaultTitle,
      author: metadata.authors?.join(', ') || null,
      format,
      publisher: metadata.publisher,
      language: metadata.languages?.[0]
    };
  } catch (error) {
    console.error('Помилка отримання метаданих:', error);
    return {
      title: defaultTitle,
      author: null,
      format
    };
  }
}