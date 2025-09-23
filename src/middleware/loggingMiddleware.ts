import { Request, Response, NextFunction } from 'express';
import loggerService from '../services/loggerService';

export interface LoggingRequest extends Request {
  startTime?: number;
}

/**
 * Middleware для логування API запитів
 */
export const loggingMiddleware = (req: LoggingRequest, res: Response, next: NextFunction): void => {
  req.startTime = Date.now();
  
  // Логування початку запиту
  loggerService.info(`API Request Started: ${req.method} ${req.path}`, {
    method: req.method,
    url: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as any).user?.userId
  });

  // Перехоплення відповіді
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = Date.now() - (req.startTime || 0);
    
    // Логування завершення запиту
    loggerService.logApiRequest(
      req.method,
      req.path,
      res.statusCode,
      responseTime,
      (req as any).user?.userId
    );
    
    return originalSend.call(this, data);
  };

  next();
};

export default loggingMiddleware;