import path from 'path';

export const STORAGE_PATH = process.env.STORAGE_DIR 
  || path.resolve(__dirname, '../../book-storage');

export const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

// Перевіряємо і створюємо директорію при запуску
import fs from 'fs';
if (!fs.existsSync(STORAGE_PATH)) {
  fs.mkdirSync(STORAGE_PATH, { recursive: true });
}