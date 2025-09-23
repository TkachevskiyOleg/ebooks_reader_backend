import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import googleBooksService from '../services/googleBooksService';
import openLibraryService from '../services/openLibraryService';
import gutenbergService from '../services/gutenbergService';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { STORAGE_PATH } from '../config';

class ExternalBookController {
  /**
   * Пошук книг у всіх зовнішніх джерелах
   */
  static async searchBooks(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { query, source, limit = 20, offset = 0 } = req.query;
      
      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Запит для пошуку не вказано' });
        return;
      }

      const results: any = {
        google_books: [],
        open_library: [],
        gutenberg: [],
        total: 0
      };

      // Пошук в Google Books
      if (!source || source === 'google_books') {
        try {
          const googleResults = await googleBooksService.searchBooks(
            query as string, 
            parseInt(limit as string), 
            parseInt(offset as string)
          );
          results.google_books = googleResults.items?.map(volume => 
            googleBooksService.convertToExternalBook(volume)
          ) || [];
        } catch (error) {
          console.error('Помилка пошуку в Google Books:', error);
        }
      }

      // Пошук в Open Library
      if (!source || source === 'open_library') {
        try {
          const openLibraryResults = await openLibraryService.searchBooks(
            query as string, 
            parseInt(limit as string), 
            parseInt(offset as string)
          );
          results.open_library = openLibraryResults.docs.map(work => 
            openLibraryService.convertToExternalBook(work)
          );
        } catch (error) {
          console.error('Помилка пошуку в Open Library:', error);
        }
      }

      // Пошук в Project Gutenberg
      if (!source || source === 'gutenberg') {
        try {
          const gutenbergResults = await gutenbergService.searchBooks(
            query as string, 
            parseInt(limit as string), 
            parseInt(offset as string)
          );
          results.gutenberg = gutenbergResults.results.map(book => 
            gutenbergService.convertToExternalBook(book)
          );
        } catch (error) {
          console.error('Помилка пошуку в Project Gutenberg:', error);
        }
      }

      results.total = results.google_books.length + results.open_library.length + results.gutenberg.length;

      res.json(results);
    } catch (error) {
      console.error('Помилка при пошуку книг:', error);
      res.status(500).json({ error: 'Помилка при пошуку книг' });
    }
  }

  /**
   * Пошук безкоштовних книг
   */
  static async searchFreeBooks(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { query, limit = 20 } = req.query;
      
      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Запит для пошуку не вказано' });
        return;
      }

      const results: any = {
        google_books: [],
        open_library: [],
        gutenberg: [],
        total: 0
      };

      // Пошук безкоштовних книг в Google Books
      try {
        const googleResults = await googleBooksService.searchFreeBooks(
          query as string, 
          parseInt(limit as string)
        );
        results.google_books = googleResults.items?.map(volume => 
          googleBooksService.convertToExternalBook(volume)
        ) || [];
      } catch (error) {
        console.error('Помилка пошуку безкоштовних книг в Google Books:', error);
      }

      // Пошук безкоштовних книг в Open Library
      try {
        const openLibraryResults = await openLibraryService.searchFreeBooks(
          query as string, 
          parseInt(limit as string)
        );
        results.open_library = openLibraryResults.docs.map(work => 
          openLibraryService.convertToExternalBook(work)
        );
      } catch (error) {
        console.error('Помилка пошуку безкоштовних книг в Open Library:', error);
      }

      // Всі книги Project Gutenberg безкоштовні
      try {
        const gutenbergResults = await gutenbergService.searchBooks(
          query as string, 
          parseInt(limit as string)
        );
        results.gutenberg = gutenbergResults.results.map(book => 
          gutenbergService.convertToExternalBook(book)
        );
      } catch (error) {
        console.error('Помилка пошуку в Project Gutenberg:', error);
      }

      results.total = results.google_books.length + results.open_library.length + results.gutenberg.length;

      res.json(results);
    } catch (error) {
      console.error('Помилка при пошуку безкоштовних книг:', error);
      res.status(500).json({ error: 'Помилка при пошуку безкоштовних книг' });
    }
  }

  /**
   * Отримання популярних книг
   */
  static async getPopularBooks(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { limit = 20 } = req.query;

      const results: any = {
        google_books: [],
        open_library: [],
        gutenberg: [],
        total: 0
      };

      // Популярні книги з Google Books
      try {
        const googleResults = await googleBooksService.getPopularBooks(parseInt(limit as string));
        results.google_books = googleResults.items?.map(volume => 
          googleBooksService.convertToExternalBook(volume)
        ) || [];
      } catch (error) {
        console.error('Помилка отримання популярних книг з Google Books:', error);
      }

      // Популярні книги з Open Library
      try {
        const openLibraryResults = await openLibraryService.getPopularBooks(parseInt(limit as string));
        results.open_library = openLibraryResults.docs.map(work => 
          openLibraryService.convertToExternalBook(work)
        );
      } catch (error) {
        console.error('Помилка отримання популярних книг з Open Library:', error);
      }

      // Популярні книги з Project Gutenberg
      try {
        const gutenbergResults = await gutenbergService.getPopularBooks(parseInt(limit as string));
        results.gutenberg = gutenbergResults.results.map(book => 
          gutenbergService.convertToExternalBook(book)
        );
      } catch (error) {
        console.error('Помилка отримання популярних книг з Project Gutenberg:', error);
      }

      results.total = results.google_books.length + results.open_library.length + results.gutenberg.length;

      res.json(results);
    } catch (error) {
      console.error('Помилка при отриманні популярних книг:', error);
      res.status(500).json({ error: 'Помилка при отриманні популярних книг' });
    }
  }

  /**
   * Імпорт книги з зовнішнього джерела
   */
  static async importBook(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { externalId, source } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Неавторизовано' });
        return;
      }

      if (!externalId || !source) {
        res.status(400).json({ error: 'Не вказано externalId або source' });
        return;
      }

      // Перевірка чи книга вже імпортована
      const existingBook = await prisma.book.findFirst({
        where: {
          externalBook: {
            externalId: externalId.toString(),
            source: source
          }
        }
      });

      if (existingBook) {
        res.status(409).json({ error: 'Книга вже імпортована' });
        return;
      }

      let externalBookData: any = null;
      let downloadUrl: string | null = null;

      // Отримання даних з відповідного джерела
      switch (source) {
        case 'google_books':
          const googleBook = await googleBooksService.getBookById(externalId);
          externalBookData = googleBooksService.convertToExternalBook(googleBook);
          downloadUrl = externalBookData.downloadUrl;
          break;
        
        case 'open_library':
          const openLibraryWork = await openLibraryService.getWorkByKey(`/works/${externalId}`);
          externalBookData = openLibraryService.convertToExternalBook(openLibraryWork);
          downloadUrl = externalBookData.downloadUrl;
          break;
        
        case 'gutenberg':
          const gutenbergBook = await gutenbergService.getBookById(parseInt(externalId));
          externalBookData = gutenbergService.convertToExternalBook(gutenbergBook);
          downloadUrl = externalBookData.downloadUrl;
          break;
        
        default:
          res.status(400).json({ error: 'Невідоме джерело' });
          return;
      }

      // Збереження зовнішньої книги в базі
      const externalBook = await prisma.externalBook.upsert({
        where: {
          externalId_source: {
            externalId: externalId.toString(),
            source: source
          }
        },
        update: {
          ...externalBookData,
          lastCheckedAt: new Date()
        },
        create: {
          ...externalBookData,
          lastCheckedAt: new Date()
        }
      });

      // Завантаження файлу книги (якщо доступно)
      let filePath: string | null = null;
      let storagePath: string | null = null;

      if (downloadUrl) {
        try {
          const response = await axios.get(downloadUrl, { responseType: 'stream' });
          const fileName = `${externalId}_${Date.now()}.${getFileExtension(downloadUrl)}`;
          const fullPath = path.join(STORAGE_PATH, fileName);
          
          const writer = require('fs').createWriteStream(fullPath);
          response.data.pipe(writer);

          await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
          });

          filePath = `/uploads/${fileName}`;
          storagePath = fullPath;
        } catch (downloadError) {
          console.error('Помилка завантаження файлу:', downloadError);
          // Продовжуємо без файлу
        }
      }

      // Створення книги в базі
      const book = await prisma.book.create({
        data: {
          title: externalBookData.title,
          author: externalBookData.author,
          format: getFileExtension(downloadUrl || '') || 'unknown',
          publisher: externalBookData.publisher,
          language: externalBookData.language,
          genre: externalBookData.categories?.[0] || null,
          filePath: filePath || '',
          storagePath: storagePath,
          originalFilePath: downloadUrl,
          userId: userId,
          isPublic: false,
          imageUrl: externalBookData.imageUrl,
          externalBookId: externalBook.id
        }
      });

      res.status(201).json(book);
    } catch (error) {
      console.error('Помилка при імпорті книги:', error);
      res.status(500).json({ error: 'Помилка при імпорті книги' });
    }
  }

  /**
   * Отримання списку імпортованих зовнішніх книг
   */
  static async getImportedBooks(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { page = 1, limit = 20 } = req.query;

      if (!userId) {
        res.status(401).json({ error: 'Неавторизовано' });
        return;
      }

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const [books, totalCount] = await Promise.all([
        prisma.book.findMany({
          where: {
            userId: userId,
            externalBookId: { not: null }
          },
          include: {
            externalBook: true
          },
          skip,
          take,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.book.count({
          where: {
            userId: userId,
            externalBookId: { not: null }
          }
        })
      ]);

      res.json({
        books,
        totalCount,
        page: parseInt(page as string),
        limit: take
      });
    } catch (error) {
      console.error('Помилка при отриманні імпортованих книг:', error);
      res.status(500).json({ error: 'Помилка при отриманні імпортованих книг' });
    }
  }

  /**
   * Оновлення метаданих зовнішніх книг
   */
  static async updateExternalBooksMetadata(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { source, limit = 100 } = req.query;

      const whereClause: any = {
        lastCheckedAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Оновлюємо книги, які не перевірялися більше 24 годин
        }
      };

      if (source) {
        whereClause.source = source;
      }

      const externalBooks = await prisma.externalBook.findMany({
        where: whereClause,
        take: parseInt(limit as string),
        orderBy: { lastCheckedAt: 'asc' }
      });

      let updatedCount = 0;

      for (const externalBook of externalBooks) {
        try {
          let updatedData: any = null;

          switch (externalBook.source) {
            case 'google_books':
              const googleBook = await googleBooksService.getBookById(externalBook.externalId);
              updatedData = googleBooksService.convertToExternalBook(googleBook);
              break;
            
            case 'open_library':
              const openLibraryWork = await openLibraryService.getWorkByKey(`/works/${externalBook.externalId}`);
              updatedData = openLibraryService.convertToExternalBook(openLibraryWork);
              break;
            
            case 'gutenberg':
              const gutenbergBook = await gutenbergService.getBookById(parseInt(externalBook.externalId));
              updatedData = gutenbergService.convertToExternalBook(gutenbergBook);
              break;
          }

          if (updatedData) {
            await prisma.externalBook.update({
              where: { id: externalBook.id },
              data: {
                ...updatedData,
                lastCheckedAt: new Date()
              }
            });
            updatedCount++;
          }
        } catch (error) {
          console.error(`Помилка оновлення книги ${externalBook.externalId}:`, error);
        }
      }

      res.json({
        message: `Оновлено ${updatedCount} з ${externalBooks.length} книг`,
        updatedCount,
        totalChecked: externalBooks.length
      });
    } catch (error) {
      console.error('Помилка при оновленні метаданих:', error);
      res.status(500).json({ error: 'Помилка при оновленні метаданих' });
    }
  }
}

// Допоміжна функція для визначення розширення файлу
function getFileExtension(url: string): string {
  const match = url.match(/\.([^.?#]+)(?:\?|#|$)/);
  return match ? match[1] : 'unknown';
}

export default ExternalBookController;