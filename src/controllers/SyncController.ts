import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import externalBookService from '../services/externalBookService';
import schedulerService from '../services/schedulerService';
import { healthChecker } from '../utils/healthCheck';
import prisma from '../prisma';

class SyncController {
  // Ручна синхронізація з конкретним джерелом
  static async syncFromSource(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { source, query, limit } = req.body;
      
      if (!source || !query) {
        res.status(400).json({ 
          error: 'Необхідно вказати source та query' 
        });
        return;
      }

      if (!['google_books', 'open_library', 'gutenberg'].includes(source)) {
        res.status(400).json({ 
          error: 'Невідоме джерело. Доступні: google_books, open_library, gutenberg' 
        });
        return;
      }

      const result = await schedulerService.runManualSync(
        source, 
        query, 
        limit || 20
      );

      res.json({
        success: true,
        source,
        query,
        result
      });
    } catch (error) {
      console.error('Помилка при синхронізації:', error);
      res.status(500).json({ 
        error: 'Помилка при синхронізації',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Повна синхронізація з усіх джерел
  static async fullSync(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await schedulerService.runFullSync();
      
      res.json({
        success: true,
        message: 'Повна синхронізація завершена',
        results: result
      });
    } catch (error) {
      console.error('Помилка при повній синхронізації:', error);
      res.status(500).json({ 
        error: 'Помилка при повній синхронізації',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Пошук книг у всіх джерелах без збереження
  static async searchAllSources(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { query, limit } = req.query;
      
      if (!query || typeof query !== 'string') {
        res.status(400).json({ 
          error: 'Необхідно вказати query параметр' 
        });
        return;
      }

      const results = await externalBookService.searchAllSources(
        query, 
        limit ? parseInt(limit as string) : 10
      );

      res.json({
        success: true,
        query,
        results
      });
    } catch (error) {
      console.error('Помилка при пошуку:', error);
      res.status(500).json({ 
        error: 'Помилка при пошуку',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Отримання логів синхронізації
  static async getSyncLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { limit, source } = req.query;
      
      let whereClause: any = {};
      if (source && typeof source === 'string') {
        whereClause.source = source;
      }

      const logs = await prisma.syncLog.findMany({
        where: whereClause,
        orderBy: { startedAt: 'desc' },
        take: limit ? parseInt(limit as string) : 50
      });

      res.json({
        success: true,
        logs
      });
    } catch (error) {
      console.error('Помилка при отриманні логів:', error);
      res.status(500).json({ 
        error: 'Помилка при отриманні логів',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Управління планувальником завдань
  static async getSchedulerStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const jobs = schedulerService.getAllJobs();
      
      res.json({
        success: true,
        jobs
      });
    } catch (error) {
      console.error('Помилка при отриманні статусу планувальника:', error);
      res.status(500).json({ 
        error: 'Помилка при отриманні статусу планувальника',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Запуск/зупинка конкретного завдання
  static async controlJob(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { jobName, action } = req.body;
      
      if (!jobName || !action) {
        res.status(400).json({ 
          error: 'Необхідно вказати jobName та action' 
        });
        return;
      }

      if (!['start', 'stop'].includes(action)) {
        res.status(400).json({ 
          error: 'Action повинен бути start або stop' 
        });
        return;
      }

      if (action === 'start') {
        schedulerService.startJob(jobName);
      } else {
        schedulerService.stopJob(jobName);
      }

      res.json({
        success: true,
        message: `Завдання ${jobName} ${action === 'start' ? 'запущено' : 'зупинено'}`
      });
    } catch (error) {
      console.error('Помилка при управлінні завданням:', error);
      res.status(500).json({ 
        error: 'Помилка при управлінні завданням',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Отримання статистики синхронізації
  static async getSyncStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { days = 30 } = req.query;
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

      const stats = await prisma.syncLog.aggregate({
        where: {
          startedAt: {
            gte: daysAgo
          }
        },
        _sum: {
          booksAdded: true,
          booksUpdated: true
        },
        _count: {
          id: true
        }
      });

      const sourceStats = await prisma.syncLog.groupBy({
        by: ['source'],
        where: {
          startedAt: {
            gte: daysAgo
          }
        },
        _sum: {
          booksAdded: true,
          booksUpdated: true
        },
        _count: {
          id: true
        }
      });

      const statusStats = await prisma.syncLog.groupBy({
        by: ['status'],
        where: {
          startedAt: {
            gte: daysAgo
          }
        },
        _count: {
          id: true
        }
      });

      res.json({
        success: true,
        period: `${days} днів`,
        totalStats: {
          totalSyncs: stats._count.id,
          totalBooksAdded: stats._sum.booksAdded || 0,
          totalBooksUpdated: stats._sum.booksUpdated || 0
        },
        sourceStats,
        statusStats
      });
    } catch (error) {
      console.error('Помилка при отриманні статистики:', error);
      res.status(500).json({ 
        error: 'Помилка при отриманні статистики',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Оновлення існуючих книг з зовнішніх джерел
  static async updateExistingBooks(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { source, limit = 50 } = req.body;
      
      if (!source || !['google_books', 'open_library', 'gutenberg'].includes(source)) {
        res.status(400).json({ 
          error: 'Необхідно вказати валідне джерело' 
        });
        return;
      }

      // Отримуємо книги, які потребують оновлення (старіші за 7 днів)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const booksToUpdate = await prisma.book.findMany({
        where: {
          externalSource: source,
          OR: [
            { lastSyncedAt: null },
            { lastSyncedAt: { lt: sevenDaysAgo } }
          ]
        },
        take: parseInt(limit)
      });

      let updated = 0;
      const errors: string[] = [];

      for (const book of booksToUpdate) {
        try {
          if (book.externalId) {
            // Тут можна додати логіку для оновлення конкретної книги
            // Поки що просто оновлюємо lastSyncedAt
            await prisma.book.update({
              where: { id: book.id },
              data: { lastSyncedAt: new Date() }
            });
            updated++;
          }
        } catch (error) {
          errors.push(`Помилка при оновленні книги ${book.title}: ${error}`);
        }
      }

      res.json({
        success: true,
        message: `Оновлено ${updated} книг з джерела ${source}`,
        updated,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('Помилка при оновленні існуючих книг:', error);
      res.status(500).json({ 
        error: 'Помилка при оновленні існуючих книг',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Перевірка здоров'я зовнішніх API
  static async healthCheck(req: AuthRequest, res: Response): Promise<void> {
    try {
      const healthSummary = await healthChecker.getHealthSummary();
      
      res.json({
        success: true,
        health: healthSummary
      });
    } catch (error) {
      console.error('Помилка при перевірці здоров\'я:', error);
      res.status(500).json({ 
        error: 'Помилка при перевірці здоров\'я',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

export default SyncController;