import { Request, Response } from 'express';
import prisma from '../prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import crypto from 'crypto';

class AuthController {
  static validateLoginPassword(login: string, password: string) {
    const loginRegex = /^[a-zA-Z0-9]{6,}$/;
    const passwordRegex = /^[a-zA-Z0-9]{6,}$/;
    if (!loginRegex.test(login)) {
      return 'Логін має містити лише латинські літери та цифри, мінімум 6 символів, без пробілів і спецсимволів';
    }
    if (!passwordRegex.test(password)) {
      return 'Пароль має містити лише латинські літери та цифри, мінімум 6 символів, без пробілів і спецсимволів';
    }
    return null;
  }

  static generateRefreshToken() {
    return crypto.randomBytes(40).toString('hex');
  }

  static async register(req: Request, res: Response) {
    try {
      const { login, password, role = 'USER' } = req.body; 
      if (!login || !password) {
        return res.status(400).json({ error: 'Логін і пароль обовʼязкові' });
      }
      const validationError = AuthController.validateLoginPassword(login, password);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }
      const existingUser = await prisma.user.findUnique({ where: { login } });
      if (existingUser) {
        return res.status(409).json({ error: 'Користувач з таким логіном вже існує' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const refreshToken = AuthController.generateRefreshToken();
      const user = await prisma.user.create({
        data: { 
          login, 
          password: hashedPassword, 
          refreshToken,
          role      
        }
      });
      const token = jwt.sign({ 
        userId: user.id, 
        login: user.login,
        role: user.role  
      }, JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({
        message: 'Користувача створено',
        user: { id: user.id, login: user.login, role: user.role },  
        token,
        refreshToken
      });
    } catch (error) {
      res.status(500).json({ error: 'Помилка при реєстрації' });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { login, password } = req.body;
      if (!login || !password) {
        return res.status(400).json({ error: 'Логін і пароль обовʼязкові' });
      }
      const validationError = AuthController.validateLoginPassword(login, password);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }
      const user = await prisma.user.findUnique({ where: { login } });
      if (!user) {
        return res.status(401).json({ error: 'Невірний логін або пароль' });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Невірний логін або пароль' });
      }
      const refreshToken = AuthController.generateRefreshToken();
      await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });
      const token = jwt.sign({ 
        userId: user.id, 
        login: user.login,
        role: user.role  
      }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, refreshToken });
    } catch (error) {
      res.status(500).json({ error: 'Помилка при вході' });
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token обовʼязковий' });
      }
      const user = await prisma.user.findFirst({ where: { refreshToken } });
      if (!user) {
        return res.status(401).json({ error: 'Невірний refresh token' });
      }
      const token = jwt.sign({ 
        userId: user.id, 
        login: user.login,
        role: user.role  
      }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token });
    } catch (error) {
      res.status(500).json({ error: 'Помилка оновлення токена' });
    }
  }

  static async me(req: Request, res: Response) {
    try {
      const userReq = req as any;
      if (!userReq.user) {
        return res.status(401).json({ error: 'Неавторизовано' });
      }
      const user = await prisma.user.findUnique({
        where: { id: userReq.user.userId },
        select: { 
          id: true, 
          login: true,
          role: true  
        }
      });
      if (!user) {
        return res.status(404).json({ error: 'Користувача не знайдено' });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Помилка отримання профілю' });
    }
  }
}

export default AuthController;