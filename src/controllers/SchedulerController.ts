import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import schedulerService from '../services/schedulerService';

class SchedulerController {
  /**
   * Отримання статусу завдань планувальника
   */
  static async getJobsStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ error: 'Неавторизовано' });
        return;
      }

      // Перевірка ролі адміністратора
      const user = await require('../prisma').default.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (!user || user.role !== 'ADMIN') {
        res.status(403).json({ error: 'Доступ заборонено. Потрібна роль адміністратора' });
        return;
      }

      const status = schedulerService.getJobsStatus();
      res.json({
        jobs: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Помилка при отриманні статусу завдань:', error);
      res.status(500).json({ error: 'Помилка при отриманні статусу завдань' });
    }
  }

  /**
   * Ручний запуск завдання
   */
  static async runJob(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { jobName } = req.params;
      
      if (!userId) {
        res.status(401).json({ error: 'Неавторизовано' });
        return;
      }

      // Перевірка ролі адміністратора
      const user = await require('../prisma').default.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (!user || user.role !== 'ADMIN') {
        res.status(403).json({ error: 'Доступ заборонено. Потрібна роль адміністратора' });
        return;
      }

      const availableJobs = ['update-metadata', 'fetch-popular-books', 'cleanup-old-records', 'sync-gutenberg'];
      
      if (!availableJobs.includes(jobName)) {
        res.status(400).json({ 
          error: 'Невідоме завдання',
          availableJobs 
        });
        return;
      }

      // Запуск завдання в фоновому режимі
      schedulerService.runJobManually(jobName).catch(error => {
        console.error(`Помилка виконання завдання ${jobName}:`, error);
      });

      res.json({
        message: `Завдання "${jobName}" запущено`,
        jobName,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Помилка при запуску завдання:', error);
      res.status(500).json({ error: 'Помилка при запуску завдання' });
    }
  }

  /**
   * Отримання статистики планувальника
   */
  static async getSchedulerStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ error: 'Неавторизовано' });
        return;
      }

      // Перевірка ролі адміністратора
      const user = await require('../prisma').default.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (!user || user.role !== 'ADMIN') {
        res.status(403).json({ error: 'Доступ заборонено. Потрібна роль адміністратора' });
        return;
      }

      const prisma = require('../prisma').default;

      // Статистика зовнішніх книг
      const [totalExternalBooks, booksBySource, recentImports] = await Promise.all([
        prisma.externalBook.count(),
        prisma.externalBook.groupBy({
          by: ['source'],
          _count: {
            source: true
          }
        }),
        prisma.book.count({
          where: {
            externalBookId: { not: null },
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // За останні 7 днів
            }
          }
        })
      ]);

      // Статистика оновлень
      const lastUpdates = await prisma.externalBook.findMany({
        select: {
          source: true,
          lastCheckedAt: true
        },
        orderBy: {
          lastCheckedAt: 'desc'
        },
        take: 10
      });

      res.json({
        externalBooks: {
          total: totalExternalBooks,
          bySource: booksBySource.reduce((acc, item) => {
            acc[item.source] = item._count.source;
            return acc;
          }, {} as { [key: string]: number })
        },
        imports: {
          recent: recentImports
        },
        lastUpdates: lastUpdates,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Помилка при отриманні статистики планувальника:', error);
      res.status(500).json({ error: 'Помилка при отриманні статистики планувальника' });
    }
  }
}

export default SchedulerController;