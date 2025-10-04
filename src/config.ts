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
export const SYNC_ENABLED = process.env.SYNC_ENABLED === 'true';
export const SYNC_CRON = process.env.SYNC_CRON || '0 * * * *';
export const OPENLIBRARY_ENRICH = process.env.OPENLIBRARY_ENRICH !== 'false';
export const OPDS_FEEDS = (process.env.OPDS_FEEDS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Sync safety limits
export const SYNC_MAX_FILE_MB = process.env.SYNC_MAX_FILE_MB ? parseInt(process.env.SYNC_MAX_FILE_MB, 10) : 50; // 50MB
export const SYNC_STORAGE_QUOTA_MB = process.env.SYNC_STORAGE_QUOTA_MB ? parseInt(process.env.SYNC_STORAGE_QUOTA_MB, 10) : 0; // 0 = unlimited
export const SYNC_GUTENDEX_PAGES = process.env.SYNC_GUTENDEX_PAGES ? parseInt(process.env.SYNC_GUTENDEX_PAGES, 10) : 1;
export const SYNC_MAX_ITEMS_PER_RUN = process.env.SYNC_MAX_ITEMS_PER_RUN ? parseInt(process.env.SYNC_MAX_ITEMS_PER_RUN, 10) : 64;
export const SYNC_GUTENDEX_LANGUAGES = (process.env.SYNC_GUTENDEX_LANGUAGES || '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

import fs from 'fs';
if (!fs.existsSync(STORAGE_PATH)) {
  fs.mkdirSync(STORAGE_PATH, { recursive: true });
}