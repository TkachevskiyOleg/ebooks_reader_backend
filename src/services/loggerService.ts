import fs from 'fs/promises';
import path from 'path';

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: any;
  error?: any;
}

export class LoggerService {
  private logDir: string;
  private maxLogSize: number = 10 * 1024 * 1024; // 10MB
  private maxLogFiles: number = 5;

  constructor(logDir: string = 'logs') {
    this.logDir = logDir;
    this.ensureLogDirectory();
  }

  /**
   * Створення директорії для логів
   */
  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.access(this.logDir);
    } catch {
      await fs.mkdir(this.logDir, { recursive: true });
    }
  }

  /**
   * Запис логу
   */
  private async writeLog(level: LogLevel, message: string, context?: any, error?: any): Promise<void> {
    try {
      const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        context,
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : undefined
      };

      const logLine = JSON.stringify(logEntry) + '\n';
      const logFile = path.join(this.logDir, `${level.toLowerCase()}.log`);
      
      await fs.appendFile(logFile, logLine);
      
      // Ротація логів
      await this.rotateLogs(logFile);
      
      // Вивід в консоль
      this.logToConsole(level, message, context, error);
    } catch (err) {
      console.error('Помилка запису логу:', err);
    }
  }

  /**
   * Ротація логів
   */
  private async rotateLogs(logFile: string): Promise<void> {
    try {
      const stats = await fs.stat(logFile);
      
      if (stats.size > this.maxLogSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFile = `${logFile}.${timestamp}`;
        
        await fs.rename(logFile, rotatedFile);
        
        // Видалення старих файлів
        const files = await fs.readdir(this.logDir);
        const logFiles = files
          .filter(file => file.startsWith(path.basename(logFile)) && file !== path.basename(logFile))
          .sort()
          .reverse();
        
        if (logFiles.length > this.maxLogFiles) {
          const filesToDelete = logFiles.slice(this.maxLogFiles);
          for (const file of filesToDelete) {
            await fs.unlink(path.join(this.logDir, file));
          }
        }
      }
    } catch (error) {
      console.error('Помилка ротації логів:', error);
    }
  }

  /**
   * Вивід в консоль
   */
  private logToConsole(level: LogLevel, message: string, context?: any, error?: any): void {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    const errorStr = error ? `\nError: ${error.message}` : '';
    
    const logMessage = `[${timestamp}] ${level}: ${message}${contextStr}${errorStr}`;
    
    switch (level) {
      case LogLevel.ERROR:
        console.error(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.INFO:
        console.info(logMessage);
        break;
      case LogLevel.DEBUG:
        console.debug(logMessage);
        break;
    }
  }

  /**
   * Логування помилки
   */
  async error(message: string, error?: any, context?: any): Promise<void> {
    await this.writeLog(LogLevel.ERROR, message, context, error);
  }

  /**
   * Логування попередження
   */
  async warn(message: string, context?: any): Promise<void> {
    await this.writeLog(LogLevel.WARN, message, context);
  }

  /**
   * Логування інформації
   */
  async info(message: string, context?: any): Promise<void> {
    await this.writeLog(LogLevel.INFO, message, context);
  }

  /**
   * Логування налагодження
   */
  async debug(message: string, context?: any): Promise<void> {
    await this.writeLog(LogLevel.DEBUG, message, context);
  }

  /**
   * Логування API запитів
   */
  async logApiRequest(method: string, url: string, statusCode: number, responseTime: number, userId?: number): Promise<void> {
    const context = {
      method,
      url,
      statusCode,
      responseTime: `${responseTime}ms`,
      userId
    };
    
    const level = statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    await this.writeLog(level, `API Request: ${method} ${url}`, context);
  }

  /**
   * Логування зовнішніх API запитів
   */
  async logExternalApiRequest(service: string, endpoint: string, statusCode: number, responseTime: number, error?: any): Promise<void> {
    const context = {
      service,
      endpoint,
      statusCode,
      responseTime: `${responseTime}ms`
    };
    
    const level = statusCode >= 400 || error ? LogLevel.ERROR : LogLevel.INFO;
    const message = error ? `External API Error: ${service} ${endpoint}` : `External API Request: ${service} ${endpoint}`;
    
    await this.writeLog(level, message, context, error);
  }

  /**
   * Логування планувальника
   */
  async logScheduler(jobName: string, status: 'started' | 'completed' | 'failed', duration?: number, error?: any): Promise<void> {
    const context = {
      jobName,
      status,
      duration: duration ? `${duration}ms` : undefined
    };
    
    const level = status === 'failed' ? LogLevel.ERROR : LogLevel.INFO;
    const message = `Scheduler Job: ${jobName} ${status}`;
    
    await this.writeLog(level, message, context, error);
  }

  /**
   * Логування імпорту книг
   */
  async logBookImport(source: string, externalId: string, status: 'started' | 'completed' | 'failed', userId?: number, error?: any): Promise<void> {
    const context = {
      source,
      externalId,
      status,
      userId
    };
    
    const level = status === 'failed' ? LogLevel.ERROR : LogLevel.INFO;
    const message = `Book Import: ${source} ${externalId} ${status}`;
    
    await this.writeLog(level, message, context, error);
  }

  /**
   * Отримання логів
   */
  async getLogs(level?: LogLevel, limit: number = 100): Promise<LogEntry[]> {
    try {
      const logFile = level ? path.join(this.logDir, `${level.toLowerCase()}.log`) : path.join(this.logDir, 'info.log');
      
      const content = await fs.readFile(logFile, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      
      const logs = lines
        .slice(-limit)
        .map(line => {
          try {
            return JSON.parse(line) as LogEntry;
          } catch {
            return null;
          }
        })
        .filter(log => log !== null) as LogEntry[];
      
      return logs.reverse(); // Найновіші спочатку
    } catch (error) {
      console.error('Помилка читання логів:', error);
      return [];
    }
  }

  /**
   * Очищення старих логів
   */
  async cleanupOldLogs(daysToKeep: number = 30): Promise<void> {
    try {
      const files = await fs.readdir(this.logDir);
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      for (const file of files) {
        const filePath = path.join(this.logDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          await this.info(`Deleted old log file: ${file}`);
        }
      }
    } catch (error) {
      await this.error('Помилка очищення старих логів', error);
    }
  }
}

export default new LoggerService();