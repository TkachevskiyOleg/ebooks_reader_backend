import { Router } from 'express';
import AuthController from '../controllers/AuthController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Авторизація та аутентифікація
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Реєстрація користувача
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               login:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Користувача створено
 */
router.post('/register', AuthController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Логін користувача
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               login:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Успішний логін
 */
router.post('/login', AuthController.login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Оновлення access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Новий access token
 */
router.post('/refresh', AuthController.refresh);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Профіль користувача
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Дані користувача
 */
router.get('/me', authMiddleware, AuthController.me);

export default router; 