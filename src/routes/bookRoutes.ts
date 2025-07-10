import { Router } from 'express';
import BookController from '../controllers/BookController';
import upload from '../middleware/uploadMiddleware';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Books
 *   description: Операції з книгами
 */

/**
 * @swagger
 * /api/books/:
 *   post:
 *     summary: Додати книгу
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Книга додана
 */
router.post('/', authMiddleware, upload.single('file'), BookController.uploadBook);

/**
 * @swagger
 * /api/books/:
 *   get:
 *     summary: Список книг користувача
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список книг
 */
router.get('/', authMiddleware, BookController.getAllBooks);

/**
 * @swagger
 * /api/books/{id}:
 *   get:
 *     summary: Отримати книгу за id
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Книга
 */
router.get('/:id', authMiddleware, BookController.getBookById);

/**
 * @swagger
 * /api/books/{id}:
 *   delete:
 *     summary: Видалити книгу
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Книгу видалено
 */
router.delete('/:id', authMiddleware, BookController.deleteBook);

/**
 * @swagger
 * /api/books/file/{id}:
 *   get:
 *     summary: Завантажити файл книги
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Файл книги
 */
router.get('/file/:id', authMiddleware, BookController.downloadBook);

export default router;