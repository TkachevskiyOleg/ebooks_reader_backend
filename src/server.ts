import app from './app';
import prisma from './prisma';
import dotenv from 'dotenv';
import fs from 'fs';
import schedulerService from './services/schedulerService';

dotenv.config();

const PORT = process.env.PORT || 3000;

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.listen(PORT, () => {
  console.log(` Сервер запущено на порту ${PORT}`);
  console.log(` API доступне за адресою: http://localhost:${PORT}`);
  console.log(` Документація: http://localhost:${PORT}/api-docs`);
  
  // Запуск планувальника завдань
  schedulerService.startAllJobs();
});

process.on('SIGINT', async () => {
  console.log('Зупинка сервера...');
  schedulerService.stopAllJobs();
  await prisma.$disconnect();
  process.exit();
});

process.on('SIGTERM', async () => {
  console.log('Зупинка сервера...');
  schedulerService.stopAllJobs();
  await prisma.$disconnect();
  process.exit();
});