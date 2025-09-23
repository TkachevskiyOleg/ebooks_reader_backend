import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import ScheduledSyncService from '../services/scheduledSyncService';
import prisma from '../prisma';

class AdminController {
  // Middleware to check admin role
  static async checkAdminRole(req: AuthRequest, res: Response, next: Function): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Неавторизовано' });
        return;
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.role !== 'ADMIN') {
        res.status(403).json({ error: 'Потрібні права адміністратора' });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Помилка перевірки прав доступу' });
    }
  }

  // Get sync service status
  static async getSyncServiceStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const status = ScheduledSyncService.getStatus();
      
      // Get recent sync statistics
      const recentLogs = await prisma.syncLog.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      // Get sync statistics by source
      const sourceStats = await prisma.syncLog.groupBy({
        by: ['source'],
        _count: { id: true },
        _sum: { 
          successCount: true,
          errorCount: true,
          duration: true
        },
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      });

      res.json({
        syncService: status,
        recentLogs,
        sourceStatistics: sourceStats,
        summary: {
          totalBooks: await prisma.book.count(),
          publicBooks: await prisma.book.count({ where: { isPublic: true } }),
          booksWithExternalSource: await prisma.book.count({ 
            where: { externalSource: { not: null } } 
          }),
          lastSyncOperations: await prisma.syncLog.count({
            where: {
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
              }
            }
          })
        }
      });
    } catch (error) {
      console.error('Помилка отримання статусу сервісу синхронізації:', error);
      res.status(500).json({ 
        error: 'Помилка отримання статусу сервісу синхронізації',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Start sync service
  static async startSyncService(req: AuthRequest, res: Response): Promise<void> {
    try {
      ScheduledSyncService.start();
      
      await prisma.syncLog.create({
        data: {
          source: 'admin',
          operation: 'service_start',
          resultCount: 1,
          successCount: 1,
          status: 'success'
        }
      });

      res.json({ 
        message: 'Сервіс синхронізації запущено',
        status: ScheduledSyncService.getStatus()
      });
    } catch (error) {
      console.error('Помилка запуску сервісу синхронізації:', error);
      res.status(500).json({ 
        error: 'Помилка запуску сервісу синхронізації',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Stop sync service
  static async stopSyncService(req: AuthRequest, res: Response): Promise<void> {
    try {
      ScheduledSyncService.stop();
      
      await prisma.syncLog.create({
        data: {
          source: 'admin',
          operation: 'service_stop',
          resultCount: 1,
          successCount: 1,
          status: 'success'
        }
      });

      res.json({ 
        message: 'Сервіс синхронізації зупинено',
        status: ScheduledSyncService.getStatus()
      });
    } catch (error) {
      console.error('Помилка зупинки сервісу синхронізації:', error);
      res.status(500).json({ 
        error: 'Помилка зупинки сервісу синхронізації',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Manual sync trigger
  static async triggerManualSync(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { operation } = req.params;
      
      if (!['trending', 'metadata', 'popular', 'cleanup'].includes(operation)) {
        res.status(400).json({ error: 'Невідома операція синхронізації' });
        return;
      }

      const startTime = Date.now();
      
      // Run the sync operation
      await ScheduledSyncService.runManualSync(operation as any);
      
      const duration = Date.now() - startTime;

      await prisma.syncLog.create({
        data: {
          source: 'admin',
          operation: `manual_${operation}`,
          resultCount: 1,
          successCount: 1,
          duration,
          status: 'success'
        }
      });

      res.json({ 
        message: `Ручна синхронізація "${operation}" виконана успішно`,
        duration: `${duration}ms`
      });
    } catch (error) {
      const duration = Date.now() - Date.now();
      
      await prisma.syncLog.create({
        data: {
          source: 'admin',
          operation: `manual_${req.params.operation}`,
          resultCount: 0,
          errorCount: 1,
          duration,
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      console.error('Помилка ручної синхронізації:', error);
      res.status(500).json({ 
        error: 'Помилка ручної синхронізації',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Manage external sources
  static async getExternalSources(req: AuthRequest, res: Response): Promise<void> {
    try {
      const sources = await prisma.externalSource.findMany({
        orderBy: { name: 'asc' }
      });

      res.json(sources);
    } catch (error) {
      console.error('Помилка отримання зовнішніх джерел:', error);
      res.status(500).json({ 
        error: 'Помилка отримання зовнішніх джерел',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Initialize default external sources
  static async initializeExternalSources(req: AuthRequest, res: Response): Promise<void> {
    try {
      const defaultSources = [
        {
          name: 'google_books',
          displayName: 'Google Books',
          isEnabled: true
        },
        {
          name: 'open_library',
          displayName: 'Open Library',
          isEnabled: true
        },
        {
          name: 'project_gutenberg',
          displayName: 'Project Gutenberg',
          isEnabled: true
        },
        {
          name: 'internet_archive',
          displayName: 'Internet Archive',
          isEnabled: true
        }
      ];

      const createdSources = [];
      
      for (const source of defaultSources) {
        const existingSource = await prisma.externalSource.findUnique({
          where: { name: source.name }
        });

        if (!existingSource) {
          const newSource = await prisma.externalSource.create({
            data: source
          });
          createdSources.push(newSource);
        }
      }

      res.json({
        message: `Ініціалізовано ${createdSources.length} нових джерел`,
        createdSources,
        allSources: await prisma.externalSource.findMany()
      });
    } catch (error) {
      console.error('Помилка ініціалізації зовнішніх джерел:', error);
      res.status(500).json({ 
        error: 'Помилка ініціалізації зовнішніх джерел',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Update external source
  static async updateExternalSource(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { displayName, apiKey, isEnabled } = req.body;

      const sourceId = parseInt(id);
      if (isNaN(sourceId)) {
        res.status(400).json({ error: 'Невірний ID джерела' });
        return;
      }

      const updatedSource = await prisma.externalSource.update({
        where: { id: sourceId },
        data: {
          displayName,
          apiKey,
          isEnabled
        }
      });

      res.json({
        message: 'Зовнішнє джерело оновлено',
        source: updatedSource
      });
    } catch (error) {
      console.error('Помилка оновлення зовнішнього джерела:', error);
      res.status(500).json({ 
        error: 'Помилка оновлення зовнішнього джерела',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Get system statistics
  static async getSystemStatistics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        totalBooks,
        publicBooks,
        externalBooks,
        totalUsers,
        booksLast24h,
        booksLastWeek,
        booksLastMonth,
        syncOperationsLast24h,
        syncOperationsLastWeek,
        topGenres,
        topAuthors,
        topSources
      ] = await Promise.all([
        // Basic counts
        prisma.book.count(),
        prisma.book.count({ where: { isPublic: true } }),
        prisma.book.count({ where: { externalSource: { not: null } } }),
        prisma.user.count(),
        
        // Time-based counts
        prisma.book.count({ where: { createdAt: { gte: oneDayAgo } } }),
        prisma.book.count({ where: { createdAt: { gte: oneWeekAgo } } }),
        prisma.book.count({ where: { createdAt: { gte: oneMonthAgo } } }),
        
        // Sync operations
        prisma.syncLog.count({ where: { createdAt: { gte: oneDayAgo } } }),
        prisma.syncLog.count({ where: { createdAt: { gte: oneWeekAgo } } }),
        
        // Top statistics
        prisma.book.groupBy({
          by: ['genre'],
          _count: { genre: true },
          where: { genre: { not: null } },
          orderBy: { _count: { genre: 'desc' } },
          take: 10
        }),
        
        prisma.book.groupBy({
          by: ['author'],
          _count: { author: true },
          where: { author: { not: null } },
          orderBy: { _count: { author: 'desc' } },
          take: 10
        }),
        
        prisma.book.groupBy({
          by: ['externalSource'],
          _count: { externalSource: true },
          where: { externalSource: { not: null } },
          orderBy: { _count: { externalSource: 'desc' } }
        })
      ]);

      res.json({
        overview: {
          totalBooks,
          publicBooks,
          externalBooks,
          totalUsers,
          privateBooks: totalBooks - publicBooks,
          localBooks: totalBooks - externalBooks
        },
        growth: {
          booksLast24h,
          booksLastWeek,
          booksLastMonth
        },
        syncActivity: {
          operationsLast24h: syncOperationsLast24h,
          operationsLastWeek: syncOperationsLastWeek
        },
        topStatistics: {
          genres: topGenres,
          authors: topAuthors,
          sources: topSources
        }
      });
    } catch (error) {
      console.error('Помилка отримання системної статистики:', error);
      res.status(500).json({ 
        error: 'Помилка отримання системної статистики',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Clean up system data
  static async cleanupSystemData(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { operation } = req.body;
      const results: any = {};

      switch (operation) {
        case 'old_logs':
          const deletedLogs = await prisma.syncLog.deleteMany({
            where: {
              createdAt: {
                lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Older than 30 days
              }
            }
          });
          results.deletedLogs = deletedLogs.count;
          break;

        case 'orphaned_books':
          // Find books with broken file paths
          const allBooks = await prisma.book.findMany({
            select: { id: true, storagePath: true, title: true }
          });
          
          const orphanedBooks = [];
          const fs = require('fs');
          
          for (const book of allBooks) {
            if (book.storagePath && !fs.existsSync(book.storagePath)) {
              orphanedBooks.push(book.id);
            }
          }
          
          if (orphanedBooks.length > 0) {
            const deletedBooks = await prisma.book.deleteMany({
              where: { id: { in: orphanedBooks } }
            });
            results.deletedOrphanedBooks = deletedBooks.count;
          } else {
            results.deletedOrphanedBooks = 0;
          }
          break;

        case 'duplicate_books':
          // Find potential duplicates based on title and author
          const duplicateGroups = await prisma.book.groupBy({
            by: ['title', 'author'],
            _count: { id: true },
            having: {
              id: {
                _count: {
                  gt: 1
                }
              }
            }
          });
          
          let duplicatesRemoved = 0;
          for (const group of duplicateGroups) {
            if (group.title && group.author) {
              const duplicates = await prisma.book.findMany({
                where: {
                  title: group.title,
                  author: group.author
                },
                orderBy: { createdAt: 'asc' }
              });
              
              // Keep the first one, delete the rest
              const toDelete = duplicates.slice(1);
              if (toDelete.length > 0) {
                await prisma.book.deleteMany({
                  where: {
                    id: { in: toDelete.map(book => book.id) }
                  }
                });
                duplicatesRemoved += toDelete.length;
              }
            }
          }
          results.duplicatesRemoved = duplicatesRemoved;
          break;

        default:
          res.status(400).json({ error: 'Невідома операція очищення' });
          return;
      }

      await prisma.syncLog.create({
        data: {
          source: 'admin',
          operation: `cleanup_${operation}`,
          resultCount: Object.values(results).reduce((sum: number, val: any) => sum + (typeof val === 'number' ? val : 0), 0),
          successCount: 1,
          status: 'success'
        }
      });

      res.json({
        message: `Операція очищення "${operation}" виконана успішно`,
        results
      });
    } catch (error) {
      console.error('Помилка очищення системних даних:', error);
      res.status(500).json({ 
        error: 'Помилка очищення системних даних',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

export default AdminController;