import { Router } from 'express';
import prisma from '../prisma';
import { authMiddleware } from '../middleware/authMiddleware';

/**
 * @swagger
 * tags:
 *   name: Mobile
 *   description: Мобільні маршрути для синхронізації прогресу, закладок, нотаток
 */

/**
 * @swagger
 * /api/mobile/sync-progress:
 *   post:
 *     summary: Синхронізувати прогрес читання
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookId:
 *                 type: integer
 *               progress:
 *                 type: number
 *               position:
 *                 type: string
 *     responses:
 *       200:
 *         description: Прогрес синхронізовано
 */

/**
 * @swagger
 * /api/mobile/bookmarks:
 *   get:
 *     summary: Отримати закладки
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: bookId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Список закладок
 */

/**
 * @swagger
 * /api/mobile/bookmarks:
 *   post:
 *     summary: Створити закладку
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookId:
 *                 type: integer
 *               position:
 *                 type: string
 *               note:
 *                 type: string
 *     responses:
 *       201:
 *         description: Закладку створено
 */

/**
 * @swagger
 * /api/mobile/bookmarks/{id}:
 *   delete:
 *     summary: Видалити закладку
 *     tags: [Mobile]
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
 *         description: Закладку видалено
 */

/**
 * @swagger
 * /api/mobile/notes:
 *   get:
 *     summary: Отримати нотатки
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: bookId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Список нотаток
 */

/**
 * @swagger
 * /api/mobile/sync-notes:
 *   post:
 *     summary: Синхронізувати нотатки
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookId:
 *                 type: integer
 *               notes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     content:
 *                       type: string
 *                     position:
 *                       type: string
 *     responses:
 *       200:
 *         description: Нотатки синхронізовано
 */

const router = Router();

router.post('/sync-progress', authMiddleware, async (request, response) => {
  try {
    const { bookId, progress, position, userId } = request.body;

    if (progress < 0 || progress > 1) {
      return response.status(400).json({ error: 'Неприпустиме значення прогресу' });
    }

    await prisma.readingProgress.upsert({
      where: { 
        bookId_userId: { 
          bookId: parseInt(bookId), 
          userId: parseInt(userId) 
        }
      },
      update: { progress, position },
      create: {
        bookId: parseInt(bookId),
        userId: parseInt(userId),
        progress,
        position
      }
    });

    response.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Помилка синхронізації прогресу' });
  }
});

router.get('/bookmarks', authMiddleware, async (request, response) => {
  try {
    const { bookId, userId } = request.query;
    
    if (!bookId || !userId) {
      return response.status(400).json({ error: 'Необхідно вказати bookId та userId' });
    }

    const bookmarks = await prisma.bookmark.findMany({
      where: { 
        bookId: parseInt(bookId as string),
        userId: parseInt(userId as string)
      }
    });
    
    response.json(bookmarks);
  } catch (error) {
    response.status(500).json({ error: 'Помилка завантаження закладок' });
  }
});

router.post('/bookmarks', authMiddleware, async (request, response) => {
  try {
    const { bookId, userId, position, note } = request.body;
    
    const bookmark = await prisma.bookmark.create({
      data: {
        bookId: parseInt(bookId),
        userId: parseInt(userId),
        position,
        note
      }
    });
    
    response.status(201).json(bookmark);
  } catch (error) {
    response.status(500).json({ error: 'Помилка створення закладки' });
  }
});

router.delete('/bookmarks/:id', authMiddleware, async (request, response) => {
  try {
    await prisma.bookmark.delete({
      where: { id: parseInt(request.params.id) }
    });
    response.status(204).send();
  } catch (error) {
    response.status(500).json({ error: 'Помилка видалення закладки' });
  }
});

router.get('/notes', authMiddleware, async (request, response) => {
  try {
    const { bookId, userId } = request.query;
    
    if (!bookId || !userId) {
      return response.status(400).json({ error: 'Необхідно вказати bookId та userId' });
    }

    const notes = await prisma.note.findMany({
      where: { 
        bookId: parseInt(bookId as string),
        userId: parseInt(userId as string)
      }
    });
    response.json(notes);
  } catch (error) {
    response.status(500).json({ error: 'Помилка завантаження нотаток' });
  }
});

router.post('/sync-notes', authMiddleware, async (request, response) => {
  try {
    const { bookId, userId, notes } = request.body;
    await prisma.note.deleteMany({
      where: {
        bookId: parseInt(bookId),
        userId: parseInt(userId)
      }
    });

    const createdNotes = await prisma.note.createMany({
      data: notes.map((note: any) => ({
        bookId: parseInt(bookId),
        userId: parseInt(userId),
        content: note.content,
        position: note.position
      }))
    });
    response.status(200).json({ success: true, count: createdNotes.count });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Помилка синхронізації нотаток' });
  }
});

export default router;