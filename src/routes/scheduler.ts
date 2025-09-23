import express from 'express';
import SchedulerController from '../controllers/SchedulerController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Всі маршрути потребують авторизації
router.use(authMiddleware);

/**
 * @swagger
 * /api/scheduler/status:
 *   get:
 *     summary: Отримання статусу завдань планувальника
 *     tags: [Scheduler]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Статус завдань планувальника
 *       401:
 *         description: Неавторизовано
 *       403:
 *         description: Доступ заборонено
 */
router.get('/status', SchedulerController.getJobsStatus);

/**
 * @swagger
 * /api/scheduler/run/{jobName}:
 *   post:
 *     summary: Ручний запуск завдання планувальника
 *     tags: [Scheduler]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobName
 *         required: true
 *         schema:
 *           type: string
 *           enum: [update-metadata, fetch-popular-books, cleanup-old-records, sync-gutenberg]
 *         description: Назва завдання для запуску
 *     responses:
 *       200:
 *         description: Завдання запущено
 *       400:
 *         description: Невірна назва завдання
 *       401:
 *         description: Неавторизовано
 *       403:
 *         description: Доступ заборонено
 */
router.post('/run/:jobName', SchedulerController.runJob);

/**
 * @swagger
 * /api/scheduler/stats:
 *   get:
 *     summary: Отримання статистики планувальника
 *     tags: [Scheduler]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Статистика планувальника
 *       401:
 *         description: Неавторизовано
 *       403:
 *         description: Доступ заборонено
 */
router.get('/stats', SchedulerController.getSchedulerStats);

export default router;