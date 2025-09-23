import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import loggerService, { LogLevel } from '../services/loggerService';
import prisma from '../prisma';

class LogsController {
  /**
   * Отримання логів
   */
  static async getLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ error: 'Неавторизовано' });
        return;
      }

      // Перевірка ролі адміністратора
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (!user || user.role !== 'ADMIN') {
        res.status(403).json({ error: 'Доступ заборонено. Потрібна роль адміністратора' });
        return;
      }

      const { level, limit = 100 } = req.query;
      
      const logLevel = level ? level as LogLevel : undefined;
      const logLimit = parseInt(limit as string) || 100;
      
      const logs = await loggerService.getLogs(logLevel, logLimit);
      
      res.json({
        logs,
        total: logs.length,
        level: logLevel,
        limit: logLimit
      });
    } catch (error) {
      console.error('Помилка при отриманні логів:', error);
      res.status(500).json({ error: 'Помилка при отриманні логів' });
    }
  }

  /**
   * Очищення старих логів
   */
  static async cleanupLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ error: 'Неавторизовано' });
        return;
      }

      // Перевірка ролі адміністратора
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (!user || user.role !== 'ADMIN') {
        res.status(403).json({ error: 'Доступ заборонено. Потрібна роль адміністратора' });
        return;
      }

      const { daysToKeep = 30 } = req.body;
      
      await loggerService.cleanupOldLogs(parseInt(daysToKeep));
      
      res.json({
        message: `Логи старші за ${daysToKeep} днів очищені`,
        daysToKeep: parseInt(daysToKeep)
      });
    } catch (error) {
      console.error('Помилка при очищенні логів:', error);
      res.status(500).json({ error: 'Помилка при очищенні логів' });
    }
  }

  /**
   * Отримання статистики логів
   */
  static async getLogStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ error: 'Неавторизовано' });
        return;
      }

      // Перевірка ролі адміністратора
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (!user || user.role !== 'ADMIN') {
        res.status(403).json({ error: 'Доступ заборонено. Потрібна роль адміністратора' });
        return;
      }

      const [errorLogs, warnLogs, infoLogs, debugLogs] = await Promise.all([
        loggerService.getLogs(LogLevel.ERROR, 1000),
        loggerService.getLogs(LogLevel.WARN, 1000),
        loggerService.getLogs(LogLevel.INFO, 1000),
        loggerService.getLogs(LogLevel.DEBUG, 1000)
      ]);

      // Підрахунок помилок за останні 24 години
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentErrors = errorLogs.filter(log => 
        new Date(log.timestamp) > last24Hours
      );

      // Підрахунок API запитів за останні 24 години
      const recentApiRequests = infoLogs.filter(log => 
        new Date(log.timestamp) > last24Hours && 
        log.message.includes('API Request')
      );

      res.json({
        total: {
          errors: errorLogs.length,
          warnings: warnLogs.length,
          info: infoLogs.length,
          debug: debugLogs.length
        },
        last24Hours: {
          errors: recentErrors.length,
          apiRequests: recentApiRequests.length
        },
        recentErrors: recentErrors.slice(0, 10), // Останні 10 помилок
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Помилка при отриманні статистики логів:', error);
      res.status(500).json({ error: 'Помилка при отриманні статистики логів' });
    }
  }
}

export default LogsController;