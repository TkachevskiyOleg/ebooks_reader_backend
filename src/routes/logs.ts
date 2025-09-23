import express from 'express';
import LogsController from '../controllers/LogsController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Всі маршрути потребують авторизації
router.use(authMiddleware);

/**
 * @swagger
 * /api/logs:
 *   get:
 *     summary: Отримання логів системи
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [ERROR, WARN, INFO, DEBUG]
 *         description: Рівень логування
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Максимальна кількість записів
 *     responses:
 *       200:
 *         description: Список логів
 *       401:
 *         description: Неавторизовано
 *       403:
 *         description: Доступ заборонено
 */
router.get('/', LogsController.getLogs);

/**
 * @swagger
 * /api/logs/stats:
 *   get:
 *     summary: Отримання статистики логів
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Статистика логів
 *       401:
 *         description: Неавторизовано
 *       403:
 *         description: Доступ заборонено
 */
router.get('/stats', LogsController.getLogStats);

/**
 * @swagger
 * /api/logs/cleanup:
 *   post:
 *     summary: Очищення старих логів
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               daysToKeep:
 *                 type: integer
 *                 default: 30
 *                 description: Кількість днів для збереження логів
 *     responses:
 *       200:
 *         description: Логи очищені
 *       401:
 *         description: Неавторизовано
 *       403:
 *         description: Доступ заборонено
 */
router.post('/cleanup', LogsController.cleanupLogs);

export default router;