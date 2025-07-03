import app from './app';
import prisma from './prisma';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

import fs from 'fs';
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit();
});