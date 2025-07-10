import { Router } from 'express';
import CollectionController from '../controllers/CollectionController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Collections
 *   description: Операції з колекціями книг
 */

/**
 * @swagger
 * /api/collections/:
 *   post:
 *     summary: Створити колекцію
 *     tags: [Collections]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Колекцію створено
 */

/**
 * @swagger
 * /api/collections/{id}:
 *   get:
 *     summary: Отримати колекцію за id
 *     tags: [Collections]
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
 *         description: Колекція
 */

/**
 * @swagger
 * /api/collections/{collectionId}/books/{bookId}:
 *   post:
 *     summary: Додати книгу до колекції
 *     tags: [Collections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: collectionId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Книгу додано до колекції
 */

router.post('/', authMiddleware, CollectionController.createCollection);
router.get('/:id', authMiddleware, CollectionController.getCollectionById);
router.post('/:collectionId/books/:bookId', authMiddleware, CollectionController.addBook);

export default router;