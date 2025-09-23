import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import BookIntegrationService, { ExternalBookSource } from '../services/bookIntegrationService';
import prisma from '../prisma';

class ExternalBooksController {
  // Search books across all external sources
  static async searchExternalBooks(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: 'Неавторизовано' });
        return;
      }

      const { query, maxPerSource = 10 } = req.query;
      
      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Пошуковий запит обов\'язковий' });
        return;
      }

      const startTime = Date.now();
      
      try {
        const books = await BookIntegrationService.searchAllSources(
          query, 
          parseInt(maxPerSource as string) || 10
        );
        
        const duration = Date.now() - startTime;
        
        // Log the search operation
        await prisma.syncLog.create({
          data: {
            source: 'all_sources',
            operation: 'search',
            query: query,
            resultCount: books.length,
            successCount: books.length,
            duration,
            status: 'success'
          }
        });

        res.json({
          query,
          totalResults: books.length,
          books: books.map(book => ({
            ...book,
            canImport: !!book.downloadUrl
          }))
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        
        await prisma.syncLog.create({
          data: {
            source: 'all_sources',
            operation: 'search',
            query: query,
            resultCount: 0,
            errorCount: 1,
            duration,
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        });
        
        throw error;
      }
    } catch (error) {
      console.error('Помилка пошуку зовнішніх книг:', error);
      res.status(500).json({ 
        error: 'Помилка пошуку зовнішніх книг',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Search books from specific source
  static async searchSpecificSource(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: 'Неавторизовано' });
        return;
      }

      const { source } = req.params;
      const { query, limit = 20 } = req.query;
      
      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Пошуковий запит обов\'язковий' });
        return;
      }

      const limitNum = parseInt(limit as string) || 20;
      let books: ExternalBookSource[] = [];

      const startTime = Date.now();

      try {
        switch (source) {
          case 'google_books':
            books = await BookIntegrationService.searchGoogleBooks(query, limitNum);
            break;
          case 'open_library':
            books = await BookIntegrationService.searchOpenLibrary(query, limitNum);
            break;
          case 'project_gutenberg':
            books = await BookIntegrationService.searchProjectGutenberg(query, limitNum);
            break;
          case 'internet_archive':
            books = await BookIntegrationService.searchInternetArchive(query, limitNum);
            break;
          default:
            res.status(400).json({ error: 'Невідоме джерело книг' });
            return;
        }

        const duration = Date.now() - startTime;
        
        await prisma.syncLog.create({
          data: {
            source,
            operation: 'search',
            query: query,
            resultCount: books.length,
            successCount: books.length,
            duration,
            status: 'success'
          }
        });

        res.json({
          source,
          query,
          totalResults: books.length,
          books: books.map(book => ({
            ...book,
            canImport: !!book.downloadUrl
          }))
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        
        await prisma.syncLog.create({
          data: {
            source,
            operation: 'search',
            query: query,
            resultCount: 0,
            errorCount: 1,
            duration,
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        });
        
        throw error;
      }
    } catch (error) {
      console.error(`Помилка пошуку в ${req.params.source}:`, error);
      res.status(500).json({ 
        error: `Помилка пошуку в ${req.params.source}`,
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Import external book to user's library
  static async importExternalBook(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Неавторизовано' });
        return;
      }

      const { externalBook, isPublic = false } = req.body;
      
      if (!externalBook || typeof externalBook !== 'object') {
        res.status(400).json({ error: 'Дані зовнішньої книги обов\'язкові' });
        return;
      }

      if (!externalBook.downloadUrl) {
        res.status(400).json({ error: 'URL для завантаження не знайдено' });
        return;
      }

      const startTime = Date.now();

      try {
        // Check if book already exists
        const existingBook = await prisma.book.findFirst({
          where: {
            OR: [
              { originalFilePath: externalBook.downloadUrl },
              { 
                AND: [
                  { title: externalBook.title },
                  { author: externalBook.author },
                  { userId }
                ]
              }
            ]
          }
        });

        if (existingBook) {
          res.status(409).json({ 
            error: 'Книга вже існує в бібліотеці',
            existingBook: {
              id: existingBook.id,
              title: existingBook.title,
              author: existingBook.author
            }
          });
          return;
        }

        const importedBook = await BookIntegrationService.importExternalBook(
          externalBook,
          userId,
          isPublic
        );

        // Update the book with external source info
        const updatedBook = await prisma.book.update({
          where: { id: importedBook.id },
          data: {
            externalId: externalBook.id,
            externalSource: externalBook.source,
            isbn: externalBook.isbn,
            pageCount: externalBook.pageCount,
            description: externalBook.description,
            publishedDate: externalBook.publishedDate,
            lastSyncedAt: new Date()
          }
        });

        const duration = Date.now() - startTime;

        await prisma.syncLog.create({
          data: {
            source: externalBook.source,
            operation: 'import',
            query: externalBook.title,
            resultCount: 1,
            successCount: 1,
            duration,
            status: 'success'
          }
        });

        res.status(201).json({
          message: 'Книга успішно імпортована',
          book: updatedBook
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        
        await prisma.syncLog.create({
          data: {
            source: externalBook.source || 'unknown',
            operation: 'import',
            query: externalBook.title || 'unknown',
            resultCount: 0,
            errorCount: 1,
            duration,
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        });
        
        throw error;
      }
    } catch (error) {
      console.error('Помилка імпорту зовнішньої книги:', error);
      res.status(500).json({ 
        error: 'Помилка імпорту зовнішньої книги',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Enhance existing book metadata
  static async enhanceBookMetadata(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Неавторизовано' });
        return;
      }

      const bookId = parseInt(req.params.id);
      if (isNaN(bookId)) {
        res.status(400).json({ error: 'Невірний ID книги' });
        return;
      }

      // Verify user owns the book or it's public
      const book = await prisma.book.findFirst({
        where: {
          id: bookId,
          OR: [{ userId }, { isPublic: true }]
        }
      });

      if (!book) {
        res.status(404).json({ error: 'Книгу не знайдено або немає доступу' });
        return;
      }

      const startTime = Date.now();

      try {
        const enhancedBook = await BookIntegrationService.enhanceBookMetadata(bookId);
        
        // Update lastSyncedAt
        await prisma.book.update({
          where: { id: bookId },
          data: { lastSyncedAt: new Date() }
        });

        const duration = Date.now() - startTime;

        await prisma.syncLog.create({
          data: {
            source: 'all_sources',
            operation: 'enhance',
            query: book.title,
            resultCount: 1,
            successCount: 1,
            duration,
            status: 'success'
          }
        });

        res.json({
          message: 'Метадані книги покращено',
          book: enhancedBook
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        
        await prisma.syncLog.create({
          data: {
            source: 'all_sources',
            operation: 'enhance',
            query: book.title,
            resultCount: 0,
            errorCount: 1,
            duration,
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        });
        
        throw error;
      }
    } catch (error) {
      console.error('Помилка покращення метаданих:', error);
      res.status(500).json({ 
        error: 'Помилка покращення метаданих',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Get trending/popular books
  static async getTrendingBooks(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: 'Неавторизовано' });
        return;
      }

      const { limit = 50 } = req.query;
      const limitNum = parseInt(limit as string) || 50;

      const startTime = Date.now();

      try {
        const trendingBooks = await BookIntegrationService.getTrendingBooks(limitNum);
        
        const duration = Date.now() - startTime;

        await prisma.syncLog.create({
          data: {
            source: 'all_sources',
            operation: 'trending',
            resultCount: trendingBooks.length,
            successCount: trendingBooks.length,
            duration,
            status: 'success'
          }
        });

        res.json({
          totalResults: trendingBooks.length,
          books: trendingBooks.map(book => ({
            ...book,
            canImport: !!book.downloadUrl
          }))
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        
        await prisma.syncLog.create({
          data: {
            source: 'all_sources',
            operation: 'trending',
            resultCount: 0,
            errorCount: 1,
            duration,
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        });
        
        throw error;
      }
    } catch (error) {
      console.error('Помилка отримання популярних книг:', error);
      res.status(500).json({ 
        error: 'Помилка отримання популярних книг',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Bulk enhance metadata for user's books
  static async bulkEnhanceMetadata(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Неавторизовано' });
        return;
      }

      const { bookIds, enhanceAll = false } = req.body;

      let booksToEnhance;
      
      if (enhanceAll) {
        booksToEnhance = await prisma.book.findMany({
          where: { userId },
          select: { id: true, title: true }
        });
      } else if (bookIds && Array.isArray(bookIds)) {
        booksToEnhance = await prisma.book.findMany({
          where: { 
            id: { in: bookIds.map((id: any) => parseInt(id)) },
            userId 
          },
          select: { id: true, title: true }
        });
      } else {
        res.status(400).json({ error: 'Необхідно вказати bookIds або встановити enhanceAll=true' });
        return;
      }

      if (booksToEnhance.length === 0) {
        res.status(404).json({ error: 'Книги для покращення не знайдено' });
        return;
      }

      const startTime = Date.now();
      const results = {
        total: booksToEnhance.length,
        enhanced: 0,
        failed: 0,
        errors: [] as string[]
      };

      // Process books in batches to avoid overwhelming external APIs
      const batchSize = 5;
      for (let i = 0; i < booksToEnhance.length; i += batchSize) {
        const batch = booksToEnhance.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (book) => {
            try {
              await BookIntegrationService.enhanceBookMetadata(book.id);
              await prisma.book.update({
                where: { id: book.id },
                data: { lastSyncedAt: new Date() }
              });
              results.enhanced++;
            } catch (error) {
              results.failed++;
              results.errors.push(`${book.title}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          })
        );

        // Small delay between batches to be respectful to APIs
        if (i + batchSize < booksToEnhance.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const duration = Date.now() - startTime;

      await prisma.syncLog.create({
        data: {
          source: 'all_sources',
          operation: 'bulk_enhance',
          resultCount: results.total,
          successCount: results.enhanced,
          errorCount: results.failed,
          duration,
          status: results.failed === 0 ? 'success' : results.enhanced > 0 ? 'partial' : 'failed',
          errorMessage: results.errors.length > 0 ? results.errors.join('; ') : null
        }
      });

      res.json({
        message: 'Масове покращення метаданих завершено',
        results
      });
    } catch (error) {
      console.error('Помилка масового покращення метаданих:', error);
      res.status(500).json({ 
        error: 'Помилка масового покращення метаданих',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Get sync logs/statistics
  static async getSyncLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Неавторизовано' });
        return;
      }

      // Check if user is admin (you might want to add admin role check)
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.role !== 'ADMIN') {
        res.status(403).json({ error: 'Доступ заборонено' });
        return;
      }

      const { page = 1, limit = 50, source, operation, status } = req.query;
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const where: any = {};
      if (source) where.source = source;
      if (operation) where.operation = operation;
      if (status) where.status = status;

      const [logs, totalCount] = await Promise.all([
        prisma.syncLog.findMany({
          where,
          skip,
          take: parseInt(limit as string),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.syncLog.count({ where })
      ]);

      // Get statistics
      const stats = await prisma.syncLog.groupBy({
        by: ['source', 'status'],
        _count: { id: true },
        _sum: { 
          resultCount: true,
          successCount: true,
          errorCount: true,
          duration: true
        }
      });

      res.json({
        logs,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit as string))
        },
        statistics: stats
      });
    } catch (error) {
      console.error('Помилка отримання логів синхронізації:', error);
      res.status(500).json({ 
        error: 'Помилка отримання логів синхронізації',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

export default ExternalBooksController;