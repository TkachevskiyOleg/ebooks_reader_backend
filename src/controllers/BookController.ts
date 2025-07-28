import { Request, Response } from 'express';
import prisma from '../prisma';
import { Prisma } from '@prisma/client';
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
      const { title, author, format, publisher, language, genre} =
        await extractMetadata(filePath, bookFile.originalname);
      const storagePath = await copyFileToStorage(filePath, fileName);
      const isPublic = req.body.isPublic === 'true';
      let imageUrl = null;
      if (coverFile) {
        try {
          const fileExists = await fs.access(coverFile.path).then(() => true).catch(() => false);
          if (!fileExists) {
            console.error('Файл обкладинки не існує:', coverFile.path);
          } else {
            console.log('Завантажую обкладинку:', coverFile.path);
            const uploadResult = await cloudinary.uploader.upload(coverFile.path, {
              folder: 'ebook_covers',
              transformation: [{ width: 600, height: 800, crop: 'limit' }],
            });
            imageUrl = uploadResult.secure_url || uploadResult.url;
            console.log('Обкладинка успішно завантажена:', imageUrl);
          }
        } catch (uploadError) {
          console.error('Помилка завантаження обкладинки:', uploadError);
        } finally {
          try {
            await fs.unlink(coverFile.path);
            console.log('Тимчасовий файл обкладинки видалено');
          } catch (deleteError) {
            console.error('Помилка видалення тимчасового файлу:', deleteError);
          }
        }
      }
      const book = await prisma.book.create({
        data: {
          title,
          author,
          format,
          publisher,
          language,
          genre,
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
      console.error('Помилка при завантаженні книги:', error);
      res.status(500).json({ 
        error: 'Помилка при завантаженні книги',
        details: error instanceof Error ? error.message : String(error)
      });
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

  static async getBooksByGenre(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { genre } = req.query;
    if (!genre || typeof genre !== 'string') {
      res.status(400).json({ error: 'Жанр не вказано або вказано невірно' });
      return;
    }

    const books = await prisma.book.findMany({
      where: { 
        genre: genre,
        isPublic: true 
      },
      select: {
        id: true,
        title: true,
        author: true,
        genre: true,
        format: true,
        imageUrl: true
      }
    });

    res.json(books);
  } catch (error) {
    res.status(500).json({ error: 'Помилка при отриманні книг за жанром' });
  }
}

static async getAllGenres(req: AuthRequest, res: Response): Promise<void> {
  try {
    const genres = await prisma.book.findMany({
      where: { isPublic: true },
      distinct: ['genre'],
      select: { genre: true }
    });
    const genreList = genres.map(book => book.genre).filter(Boolean);
    res.json(genreList);
  } catch (error) {
    res.status(500).json({ error: 'Помилка при отриманні списку жанрів' });
  }
 }
static async rateBook(req: AuthRequest, res: Response) {
  const { bookId } = req.params;
  const { value } = req.body;
  const userId = req.user!.userId;

  try {
    const rating = await prisma.rating.upsert({
      where: { bookId_userId: { bookId: parseInt(bookId), userId } },
      update: { value },
      create: { bookId: parseInt(bookId), userId, value },
    });

    const avgResult = await prisma.rating.aggregate({
      where: { bookId: parseInt(bookId) },
      _avg: { value: true },
    });

    await prisma.book.update({
      where: { id: parseInt(bookId) },
      data: { avgRating: avgResult._avg.value },
    });

    res.json(rating);
  } catch (error) {
    res.status(500).json({ error: 'Помилка при оцінюванні книги' });
  }
}

  static async filterBooks(req: AuthRequest, res: Response) {
  try {
    const {
      tags,          // Фільтр за тегами (через кому: "Детектив,Фантастика")
      minRating,     // Мінімальний рейтинг (число від 0 до 5)
      afterDate,     // Книги, додані після дати (ISO-рядок, наприклад "2024-01-01")
      language,      // Мова книги ("Українська", "Англійська" тощо)
      format,        // Формат (pdf epub)
      page = 1,      // Пагінація
      limit = 20     // Кількість книг на сторінку
    } = req.query;

    const where: Prisma.BookWhereInput = {
      isPublic: true,  
      AND: [
        tags ? { 
          tags: { 
            some: { 
              name: { 
                in: (tags as string).split(',') 
              } 
            } 
          } 
        } : {},
        minRating ? { 
          avgRating: { 
            gte: Number(minRating) 
          } 
        } : {},
        afterDate ? { 
          createdAt: { 
            gte: new Date(afterDate as string) 
          } 
        } : {},
        language ? { 
          language: language as string 
        } : {},
        format ? { 
          format: format as string 
        } : {}
      ]
    };

    const skip = (Number(page) - 1) * Number(limit);

    const [books, totalCount] = await Promise.all([
      prisma.book.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          tags: true,  
        },
        orderBy: {
          createdAt: 'desc'  
        }
      }),
      prisma.book.count({ where })
    ]);

    res.json({
      total: totalCount,
      page: Number(page),
      limit: Number(limit),
      books
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Помилка при фільтрації книг',
      details: error instanceof Error ? error.message : String(error)
    });
  }

}
}

export default BookController;