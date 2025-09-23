import { Router } from 'express';
import SyncController from '../controllers/SyncController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Всі маршрути потребують авторизації
router.use(authMiddleware);

// Ручна синхронізація з конкретним джерелом
router.post('/sync/source', SyncController.syncFromSource);

// Повна синхронізація з усіх джерел
router.post('/sync/full', SyncController.fullSync);

// Пошук книг у всіх джерелах без збереження
router.get('/search', SyncController.searchAllSources);

// Отримання логів синхронізації
router.get('/logs', SyncController.getSyncLogs);

// Управління планувальником завдань
router.get('/scheduler/status', SyncController.getSchedulerStatus);
router.post('/scheduler/control', SyncController.controlJob);

// Статистика синхронізації
router.get('/stats', SyncController.getSyncStats);

// Оновлення існуючих книг
router.post('/update-existing', SyncController.updateExistingBooks);

// Перевірка здоров'я зовнішніх API
router.get('/health', SyncController.healthCheck);

export default router;