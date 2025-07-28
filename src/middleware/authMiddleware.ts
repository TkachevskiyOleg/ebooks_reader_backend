import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';

export interface AuthRequest extends Request {
  user?: { 
    userId: number; 
    login: string;
    role: string;  
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Необхідна авторизація' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { 
      userId: number; 
      login: string;
      role: string;  
    };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Невірний або прострочений токен' });
  }
}