import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

router.post('/sync-progress', async (request, response) => {
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

router.get('/bookmarks', async (request, response) => {
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

router.post('/bookmarks', async (request, response) => {
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

router.delete('/bookmarks/:id', async (request, response) => {
  try {
    await prisma.bookmark.delete({
      where: { id: parseInt(request.params.id) }
    });
    response.status(204).send();
  } catch (error) {
    response.status(500).json({ error: 'Помилка видалення закладки' });
  }
});

router.get('/notes', async (request, response) => {
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

router.post('/sync-notes', async (request, response) => {
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