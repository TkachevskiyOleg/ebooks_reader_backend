import { Request, Response } from 'express';
import prisma from '../prisma';
import fs from 'fs/promises';
import path from 'path';
import { extractMetadata } from '../utils/metadataExtractor';
import { STORAGE_PATH } from '../config';
import fsSync from 'fs'; 
import { AuthRequest } from '../middleware/authMiddleware';
import { v2 as cloudinary } from 'cloudinary';

async function copyFileToStorage(source: string, filename: string): Promise<string> {
  const storagePath = path.join(STORAGE_PATH, filename);
  await fs.copyFile(source, storagePath);
  return storagePath;
}

class BookController {
  static async uploadBook(req: AuthRequest, res: Response): Promise<void> {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const bookFile = files && files['file'] && files['file'][0];
      const coverFile = files && files['cover'] && files['cover'][0];
      if (!bookFile) {
        res.status(400).json({ error: 'Файл книги не завантажено' });
        return;
      }
      const filePath = bookFile.path;
      const fileName = bookFile.filename;
      const userId = req.user?.userId;
      const { title, author, format, publisher, language } =
        await extractMetadata(filePath, bookFile.originalname);
      const storagePath = await copyFileToStorage(filePath, fileName);
      const isPublic = req.body.isPublic === 'true';
      let imageUrl = null;
      if (coverFile) {
        const uploadResult = await cloudinary.uploader.upload(coverFile.path, {
          folder: 'ebook_covers',
          transformation: [{ width: 600, height: 800, crop: 'limit' }],
        });
        imageUrl = uploadResult.secure_url || uploadResult.url;
        await fs.unlink(coverFile.path).catch(() => {});
      }
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
          userId: userId,
          isPublic: isPublic,
          imageUrl: imageUrl
        }
      });
      res.status(201).json(book);
    } catch (error) {
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
    response.status(500).json({ error: 'Помилка при завантаженні файлу' });
  }
}

  static async getPublicBooks(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: 'Неавторизовано' });
        return;
      }
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;
      const { title, author, language, format } = req.query;
      const where: any = { isPublic: true };
      if (title) where.title = { contains: title as string, mode: 'insensitive' };
      if (author) where.author = { contains: author as string, mode: 'insensitive' };
      if (language) where.language = { equals: language as string };
      if (format) where.format = { equals: format as string };
      const totalCount = await prisma.book.count({ where });
      const books = await prisma.book.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          author: true,
          format: true,
          publisher: true,
          language: true,
          createdAt: true,
          updatedAt: true
        }
      });
      res.json({ totalCount, page, limit, books });
    } catch (error) {
      res.status(500).json({ error: 'Помилка при отриманні загальної бібліотеки' });
    }
  }

  static async addToMyBooks(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { bookId } = req.body;
      if (!userId) {
        res.status(401).json({ error: 'Неавторизовано' });
        return;
      }
      if (!bookId || isNaN(parseInt(bookId))) {
        res.status(400).json({ error: 'Невірний bookId' });
        return;
      }
      const publicBook = await prisma.book.findFirst({ where: { id: parseInt(bookId), isPublic: true } });
      if (!publicBook) {
        res.status(404).json({ error: 'Публічну книгу не знайдено' });
        return;
      }
      const alreadyAdded = await prisma.book.findFirst({ where: { originalFilePath: publicBook.originalFilePath, userId } });
      if (alreadyAdded) {
        res.status(409).json({ error: 'Книга вже додана у вашу бібліотеку' });
        return;
      }
      const newBook = await prisma.book.create({
        data: {
          title: publicBook.title,
          author: publicBook.author,
          format: publicBook.format,
          publisher: publicBook.publisher,
          language: publicBook.language,
          storagePath: publicBook.storagePath,
          filePath: publicBook.filePath,
          originalFilePath: publicBook.originalFilePath,
          userId: userId,
          isPublic: false
        }
      });
      res.status(201).json(newBook);
    } catch (error) {
      res.status(500).json({ error: 'Помилка при додаванні книги у вашу бібліотеку' });
    }
  }

  static async downloadPublicBook(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: 'Неавторизовано' });
        return;
      }
      const bookId = parseInt(req.params.id);
      if (isNaN(bookId)) {
        res.status(400).json({ error: 'Невірний ID книги' });
        return;
      }
      const book = await prisma.book.findFirst({ where: { id: bookId, isPublic: true } });
      if (!book) {
        res.status(404).json({ error: 'Публічну книгу не знайдено' });
        return;
      }
      const filePath = path.join(__dirname, '../../', book.filePath);
      if (!fsSync.existsSync(filePath)) {
        res.status(404).json({ error: 'Файл не знайдено' });
        return;
      }
      res.download(filePath, book.title + (book.format ? '.' + book.format : ''));
    } catch (error) {
      res.status(500).json({ error: 'Помилка при завантаженні публічної книги' });
    }
  }

  static async uploadCover(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const bookId = parseInt(req.params.id);
      if (!userId) {
        res.status(401).json({ error: 'Неавторизовано' });
        return;
      }
      if (isNaN(bookId)) {
        res.status(400).json({ error: 'Невірний ID книги' });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: 'Файл обкладинки не завантажено' });
        return;
      }
      const book = await prisma.book.findFirst({ where: { id: bookId, OR: [{ userId }, { isPublic: true }] } });
      if (!book) {
        res.status(404).json({ error: 'Книгу не знайдено або немає доступу' });
        return;
      }
      const imageUrl = (req.file as any).url || (req.file as any).secure_url || (req.file as any).path;
      if (!imageUrl) {
        res.status(500).json({ error: 'Не вдалося отримати посилання на обкладинку' });
        return;
      }
      await prisma.book.update({ where: { id: bookId }, data: { imageUrl } });
      res.json({ success: true, imageUrl });
    } catch (error) {
      res.status(500).json({ error: 'Помилка при завантаженні обкладинки' });
    }
  }
}

export default BookController;