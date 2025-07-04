import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

prisma.$connect()
  .then(() => console.log('Database connected'))
  .catch(err => console.error('Database connection error:', err));

export default prisma;