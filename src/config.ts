import path from 'path';

export const STORAGE_PATH = process.env.STORAGE_DIR 
  || path.resolve(__dirname, '../../book-storage');

export const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

export const SMTP_HOST = process.env.SMTP_HOST || '';
export const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
export const SMTP_USER = process.env.SMTP_USER || '';
export const SMTP_PASS = process.env.SMTP_PASS || '';
export const MAIL_FROM = process.env.MAIL_FROM || SMTP_USER || 'no-reply@example.com';
export const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';
export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

import fs from 'fs';
if (!fs.existsSync(STORAGE_PATH)) {
  fs.mkdirSync(STORAGE_PATH, { recursive: true });
}