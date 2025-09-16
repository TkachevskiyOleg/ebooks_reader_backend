import { Request, Response } from 'express';
import prisma from '../prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, API_BASE_URL } from '../config';
import crypto from 'crypto';
import { sendEmail } from '../services/emailService';

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

  static validateEmail(email: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Невалідна електронна пошта';
    }
    return null;
  }

  static generateRefreshToken() {
    return crypto.randomBytes(40).toString('hex');
  }

  static generateShortToken(bytes = 20) {
    return crypto.randomBytes(bytes).toString('hex');
  }

  static generateFourDigitCode() {
    return (Math.floor(1000 + Math.random() * 9000)).toString();
  }

  static async register(req: Request, res: Response) {
    try {
      const { email: rawEmail, login, password, role = 'USER' } = req.body; 
      if (!rawEmail || !login || !password) {
        return res.status(400).json({ error: 'Пошта, логін і пароль обовʼязкові' });
      }
      const email = String(rawEmail).trim().toLowerCase();
      const validationError = AuthController.validateLoginPassword(login, password);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }
      const emailError = AuthController.validateEmail(email);
      if (emailError) {
        return res.status(400).json({ error: emailError });
      }
      const existingByLogin = await prisma.user.findUnique({ where: { login } });
      if (existingByLogin) {
        return res.status(409).json({ error: 'Користувач з таким логіном вже існує' });
      }
      const existingByEmail = await prisma.user.findUnique({ where: { email } });
      if (existingByEmail) {
        return res.status(409).json({ error: 'Користувач з такою поштою вже існує' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const refreshToken = AuthController.generateRefreshToken();
      const user = await prisma.user.create({
        data: { 
          email,
          login, 
          password: hashedPassword, 
          refreshToken,
          role,     
          emailVerificationToken: AuthController.generateShortToken(20),
          emailVerificationExpires: new Date(Date.now() + 1000 * 60 * 60 * 24)
        }
      });
      try {
        const verifyLink = `${API_BASE_URL}/api/auth/verify-email?token=${user.emailVerificationToken}`;
        await sendEmail(
          user.email!,
          'Підтвердження пошти',
          `<p>Підтвердіть свою пошту, натиснувши посилання:</p><p><a href="${verifyLink}">${verifyLink}</a></p>`
        );
      } catch (e) {
      }
      const token = jwt.sign({ 
        userId: user.id, 
        login: user.login,
        email: user.email!,
        role: user.role  
      }, JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({
        message: 'Користувача створено',
        user: { id: user.id, email: user.email, login: user.login, role: user.role },  
        token,
        refreshToken
      });
    } catch (error) {
      res.status(500).json({ error: 'Помилка при реєстрації' });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email: rawEmail, password } = req.body;
      if (!rawEmail || !password) {
        return res.status(400).json({ error: 'Пошта і пароль обовʼязкові' });
      }
      const email = String(rawEmail).trim().toLowerCase();
      const emailError = AuthController.validateEmail(email);
      if (emailError) {
        return res.status(400).json({ error: emailError });
      }
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: 'Невірна пошта або пароль' });
      }
      if (!user.isEmailVerified) {
        return res.status(403).json({ error: 'Пошта не підтверджена' });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Невірна пошта або пароль' });
      }
      const refreshToken = AuthController.generateRefreshToken();
      await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });
      const token = jwt.sign({ 
        userId: user.id, 
        login: user.login,
        email: user.email!,
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
        email: user.email!,
        role: user.role  
      }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token });
    } catch (error) {
      res.status(500).json({ error: 'Помилка оновлення токена' });
    }
  }

  static async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.query as { token?: string };
      if (!token) {
        return res.status(400).json({ error: 'Токен обовʼязковий' });
      }
      const user = await prisma.user.findFirst({ where: { emailVerificationToken: token } });
      if (!user || (user.emailVerificationExpires && user.emailVerificationExpires < new Date())) {
        return res.status(400).json({ error: 'Невірний або прострочений токен' });
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { isEmailVerified: true, emailVerificationToken: null, emailVerificationExpires: null }
      });
      return res.json({ message: 'Пошту підтверджено' });
    } catch (error) {
      return res.status(500).json({ error: 'Помилка підтвердження пошти' });
    }
  }

  static async resendVerification(req: Request, res: Response) {
    try {
      const { email: rawEmail } = req.body;
      if (!rawEmail) return res.status(400).json({ error: 'Пошта обовʼязкова' });
      const email = String(rawEmail).trim().toLowerCase();
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(404).json({ error: 'Користувача не знайдено' });
      if (user.isEmailVerified) return res.json({ message: 'Пошта вже підтверджена' });
      const token = AuthController.generateShortToken(20);
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerificationToken: token, emailVerificationExpires: new Date(Date.now() + 1000 * 60 * 60 * 24) }
      });
      const verifyLink = `${API_BASE_URL}/api/auth/verify-email?token=${token}`;
      await sendEmail(email, 'Підтвердження пошти', `<p>Підтвердіть пошту: <a href="${verifyLink}">${verifyLink}</a></p>`);
      return res.json({ message: 'Лист відправлено' });
    } catch (error) {
      return res.status(500).json({ error: 'Помилка відправки листа' });
    }
  }

  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email: rawEmail } = req.body;
      if (!rawEmail) return res.status(400).json({ error: 'Пошта обовʼязкова' });
      const email = String(rawEmail).trim().toLowerCase();
      const user = await prisma.user.findUnique({ where: { email } });
      // Do not reveal whether user exists
      if (!user) return res.json({ message: 'Якщо користувач існує, лист відправлено' });
      const token = AuthController.generateShortToken(20);
      const code = AuthController.generateFourDigitCode();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: token,
          passwordResetExpires: new Date(Date.now() + 1000 * 60 * 30),
          passwordResetCode: code,
          passwordResetCodeExpires: new Date(Date.now() + 1000 * 60 * 10)
        }
      });
      const resetLink = `${API_BASE_URL}/api/auth/reset-password?token=${token}`;
      await sendEmail(
        email,
        'Скидання пароля',
        `<p>Ваш код підтвердження: <b>${code}</b> (діє 10 хв).</p><p>Або скористайтесь посиланням: <a href="${resetLink}">${resetLink}</a></p>`
      );
      return res.json({ message: 'Якщо користувач існує, лист відправлено' });
    } catch (error) {
      return res.status(500).json({ error: 'Помилка запиту відновлення пароля' });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, code, email: rawEmail, newPassword } = req.body as { token?: string; code?: string; email?: string; newPassword?: string };
      if ((!token && (!code || !rawEmail)) || !newPassword) {
        return res.status(400).json({ error: 'Потрібен токен АБО (код + email), і новий пароль' });
      }
      const passwordRegex = /^[a-zA-Z0-9]{6,}$/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({ error: 'Пароль має містити лише латиницю та цифри, мінімум 6 символів' });
      }
      let user = null as any;
      if (token) {
        user = await prisma.user.findFirst({ where: { passwordResetToken: token } });
        if (!user || (user.passwordResetExpires && user.passwordResetExpires < new Date())) {
          return res.status(400).json({ error: 'Невірний або прострочений токен' });
        }
      } else {
        const email = String(rawEmail!).trim().toLowerCase();
        user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordResetCode || user.passwordResetCode !== code) {
          return res.status(400).json({ error: 'Невірний код' });
        }
        if (user.passwordResetCodeExpires && user.passwordResetCodeExpires < new Date()) {
          return res.status(400).json({ error: 'Код прострочено' });
        }
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null,
          passwordResetCode: null,
          passwordResetCodeExpires: null
        }
      });
      return res.json({ message: 'Пароль оновлено' });
    } catch (error) {
      return res.status(500).json({ error: 'Помилка скидання пароля' });
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
          email: true,
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