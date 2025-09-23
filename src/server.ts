import app from './app';
import prisma from './prisma';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { SYNC_ENABLED, SYNC_CRON } from './config';
import { syncAllSources } from './services/syncService';

dotenv.config();

const PORT = process.env.PORT || 3000;

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const publicUploads = path.join(uploadDir, 'public');
if (!fs.existsSync(publicUploads)) {
  fs.mkdirSync(publicUploads, { recursive: true });
}

app.listen(PORT, () => {
  console.log(` Сервер запущено на порту ${PORT}`);
  console.log(` API доступне за адресою: http://localhost:${PORT}`);
  console.log(` Документація: http://localhost:${PORT}/api/docs`);
  if (SYNC_ENABLED) {
    try {
      console.log(` Планувальник синхронізації увімкнено. CRON: ${SYNC_CRON}`);
      cron.schedule(SYNC_CRON, async () => {
        try {
          const result = await syncAllSources();
          console.log('Синхронізація завершена:', JSON.stringify(result));
        } catch (err) {
          console.error('Помилка синхронізації:', err);
        }
      });
    } catch (err) {
      console.error('Не вдалося запустити планувальник:', err);
    }
  } else {
    console.log(' Планувальник синхронізації вимкнено (SYNC_ENABLED != true)');
  }
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit();
});