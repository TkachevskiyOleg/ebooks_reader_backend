import { Request, Response } from 'express';
import prisma from '../prisma';
import fs from 'fs/promises';
import path from 'path';
import { extractMetadata } from '../utils/metadataExtractor';
import { STORAGE_PATH } from '../config';
import fsSync from 'fs'; 
import { AuthRequest } from '../middleware/authMiddleware';

async function copyFileToStorage(source: string, filename: string): Promise<string> {
  const storagePath = path.join(STORAGE_PATH, filename);
  await fs.copyFile(source, storagePath);
  return storagePath;
}

class BookController {
  static async uploadBook(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Файл не завантажено' });
        return;
      }

      const filePath = req.file.path;
      const fileName = req.file.filename;
      const userId = req.user?.userId;
      const { title, author, format, publisher, language } =
        await extractMetadata(filePath, req.file.originalname);

      const storagePath = await copyFileToStorage(filePath, fileName);

      const book = await prisma.book.create({
        data: {
          title,
          author,
          format,
          publisher,
          language,
          filePath: `/uploads/${fileName}`,
          storagePath: storagePath,
          originalFilePath: filePath, 
          userId: userId
        }
      });

      res.status(201).json(book);
    } catch (error) {
      console.error('[uploadBook] ERROR:', error);
      res.status(500).json({ error: 'Помилка при завантаженні книги' });
    }
  }

  static async getAllBooks(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Неавторизовано' });
      return;
    }
    const books = await prisma.book.findMany({ where: { userId } });
    res.json(books);
  } catch (error) {
    console.error('[getAllBooks] ERROR:', error);
    res.status(500).json({ error: 'Помилка при отриманні книг' });
  }
}

  static async getBookById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const book = await prisma.book.findFirst({
        where: { id: parseInt(req.params.id), userId }
      });
      if (book) {
        res.json(book);
      } else {
        res.status(404).json({ error: 'Книгу не знайдено' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Помилка при отриманні книги' });
    }
  }

  static async deleteBook(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const book = await prisma.book.findFirst({ where: { id: parseInt(req.params.id), userId } });
      if (!book) {
        res.status(404).json({ error: 'Книгу не знайдено або немає доступу' });
        return;
      }
      await prisma.book.delete({ where: { id: book.id } });
      const filePath = path.join(__dirname, '../../', book.filePath);
      if (fsSync.existsSync(filePath)) {
        fsSync.unlinkSync(filePath);
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Помилка при видаленні книги' });
    }
  }

static async downloadBook(req: AuthRequest, response: Response) {
  try {
    const userId = req.user?.userId;
    const book = await prisma.book.findFirst({ where: { id: parseInt(req.params.id), userId } });
    if (!book) {
      return response.status(404).json({ error: 'Книгу не знайдено або немає доступу' });
    }
    const resolvedPath = path.resolve(__dirname, '../../', book.filePath);
    const uploadsDir = path.resolve(__dirname, '../../uploads');
    const normalizedPath = resolvedPath.replace(/\\/g, '/');
    const normalizedUploadsDir = uploadsDir.replace(/\\/g, '/');
    if (!normalizedPath.startsWith(normalizedUploadsDir)) {
      return response.status(400).json({ error: 'Неприпустимий шлях' });
    }
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Помилка при завантаженні файлу' });
  }
}
}

export default BookController;