import app from './app';
import prisma from './prisma';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const PORT = process.env.PORT || 3000;

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущено на порту ${PORT}`);
  console.log(`📚 API доступне за адресою: http://localhost:${PORT}`);
  console.log(`📖 Swagger документація: http://localhost:${PORT}/api-docs`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit();
});