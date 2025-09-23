import express from 'express';
import ExternalBookController from '../controllers/ExternalBookController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Всі маршрути потребують авторизації
router.use(authMiddleware);

/**
 * @swagger
 * /api/external-books/search:
 *   get:
 *     summary: Пошук книг у зовнішніх джерелах
 *     tags: [External Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Пошуковий запит
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [google_books, open_library, gutenberg]
 *         description: Джерело для пошуку (опціонально)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Кількість результатів
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Зміщення для пагінації
 *     responses:
 *       200:
 *         description: Результати пошуку
 *       400:
 *         description: Невірні параметри
 *       401:
 *         description: Неавторизовано
 */
router.get('/search', ExternalBookController.searchBooks);

/**
 * @swagger
 * /api/external-books/free:
 *   get:
 *     summary: Пошук безкоштовних книг
 *     tags: [External Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Пошуковий запит
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Кількість результатів
 *     responses:
 *       200:
 *         description: Список безкоштовних книг
 *       400:
 *         description: Невірні параметри
 *       401:
 *         description: Неавторизовано
 */
router.get('/free', ExternalBookController.searchFreeBooks);

/**
 * @swagger
 * /api/external-books/popular:
 *   get:
 *     summary: Отримання популярних книг
 *     tags: [External Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Кількість результатів
 *     responses:
 *       200:
 *         description: Список популярних книг
 *       401:
 *         description: Неавторизовано
 */
router.get('/popular', ExternalBookController.getPopularBooks);

/**
 * @swagger
 * /api/external-books/import:
 *   post:
 *     summary: Імпорт книги з зовнішнього джерела
 *     tags: [External Books]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - externalId
 *               - source
 *             properties:
 *               externalId:
 *                 type: string
 *                 description: ID книги в зовнішньому джерелі
 *               source:
 *                 type: string
 *                 enum: [google_books, open_library, gutenberg]
 *                 description: Джерело книги
 *     responses:
 *       201:
 *         description: Книга успішно імпортована
 *       400:
 *         description: Невірні параметри
 *       401:
 *         description: Неавторизовано
 *       409:
 *         description: Книга вже імпортована
 */
router.post('/import', ExternalBookController.importBook);

/**
 * @swagger
 * /api/external-books/imported:
 *   get:
 *     summary: Отримання списку імпортованих книг
 *     tags: [External Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Номер сторінки
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Кількість результатів на сторінці
 *     responses:
 *       200:
 *         description: Список імпортованих книг
 *       401:
 *         description: Неавторизовано
 */
router.get('/imported', ExternalBookController.getImportedBooks);

/**
 * @swagger
 * /api/external-books/update-metadata:
 *   post:
 *     summary: Оновлення метаданих зовнішніх книг
 *     tags: [External Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [google_books, open_library, gutenberg]
 *         description: Джерело для оновлення (опціонально)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Максимальна кількість книг для оновлення
 *     responses:
 *       200:
 *         description: Метадані оновлені
 *       401:
 *         description: Неавторизовано
 */
router.post('/update-metadata', ExternalBookController.updateExternalBooksMetadata);

export default router;