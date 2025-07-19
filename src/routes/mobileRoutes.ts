import { Router } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

router.post('/sync-progress', authMiddleware, async (request: AuthRequest, response) => {
  try {
    const { bookId, progress, position } = request.body;
    const userId = request.user!.userId;

    if (!bookId || isNaN(parseInt(bookId))) {
      return response.status(400).json({ error: 'Невірний bookId' });
    }

    if (typeof progress !== 'number' || progress < 0 || progress > 1) {
      return response.status(400).json({ error: 'Прогрес має бути числом від 0 до 1' });
    }

    if (!position || typeof position !== 'string') {
      return response.status(400).json({ error: 'Позиція не може бути пустою' });
    }

    await prisma.readingProgress.upsert({
      where: { 
        bookId_userId: { 
          bookId: parseInt(bookId), 
          userId: userId
        }
      },
      update: { progress, position },
      create: {
        bookId: parseInt(bookId),
        userId: userId,
        progress,
        position
      }
    });

    response.status(200).json({ success: true });
  } catch (error) {
    console.error('Помилка синхронізації прогресу:', error);
    response.status(500).json({ error: 'Помилка синхронізації прогресу' });
  }
});

router.get('/progress', authMiddleware, async (request: AuthRequest, response) => {
  try {
    const userId = request.user!.userId;
    
    const progress = await prisma.readingProgress.findMany({
      where: { userId: userId },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            format: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    response.json(progress);
  } catch (error) {
    console.error('Помилка завантаження прогресу:', error);
    response.status(500).json({ error: 'Помилка завантаження прогресу' });
  }
});

router.get('/bookmarks', authMiddleware, async (request: AuthRequest, response) => {
  try {
    const { bookId } = request.query;
    const userId = request.user!.userId;
    
    if (bookId) {
      if (isNaN(parseInt(bookId as string))) {
        return response.status(400).json({ error: 'Невірний bookId' });
      }

      const bookmarks = await prisma.bookmark.findMany({
        where: { 
          bookId: parseInt(bookId as string),
          userId: userId
        },
        include: {
          book: {
            select: {
              id: true,
              title: true,
              author: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      response.json(bookmarks);
    } else {
      const bookmarks = await prisma.bookmark.findMany({
        where: { userId: userId },
        include: {
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              format: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      response.json(bookmarks);
    }
  } catch (error) {
    console.error('Помилка завантаження закладок:', error);
    response.status(500).json({ error: 'Помилка завантаження закладок' });
  }
});

router.post('/bookmarks', authMiddleware, async (request: AuthRequest, response) => {
  try {
    const { bookId, position, note } = request.body;
    const userId = request.user!.userId;
    
    if (!bookId || isNaN(parseInt(bookId))) {
      return response.status(400).json({ error: 'Невірний bookId' });
    }

    if (!position || typeof position !== 'string') {
      return response.status(400).json({ error: 'Позиція не може бути пустою' });
    }
    const book = await prisma.book.findFirst({
      where: { 
        id: parseInt(bookId),
        userId: userId
      }
    });
    
    if (!book) {
      return response.status(404).json({ error: 'Книгу не знайдено' });
    }
    
    const bookmark = await prisma.bookmark.create({
      data: {
        bookId: parseInt(bookId),
        userId: userId,
        position,
        note: note || null
      }
    });
    
    response.status(201).json(bookmark);
  } catch (error) {
    console.error('Помилка створення закладки:', error);
    response.status(500).json({ error: 'Помилка створення закладки' });
  }
});

router.put('/bookmarks/:id', authMiddleware, async (request: AuthRequest, response) => {
  try {
    const { position, note } = request.body;
    const userId = request.user!.userId;
    const bookmarkId = parseInt(request.params.id);
    
    if (isNaN(bookmarkId)) {
      return response.status(400).json({ error: 'Невірний ID закладки' });
    }

    if (!position || typeof position !== 'string') {
      return response.status(400).json({ error: 'Позиція не може бути пустою' });
    }
    const bookmark = await prisma.bookmark.findFirst({
      where: { 
        id: bookmarkId,
        userId: userId
      }
    });
    
    if (!bookmark) {
      return response.status(404).json({ error: 'Закладку не знайдено' });
    }
    
    const updatedBookmark = await prisma.bookmark.update({
      where: { id: bookmarkId },
      data: {
        position,
        note: note || null
      }
    });
    
    response.json(updatedBookmark);
  } catch (error) {
    console.error('Помилка оновлення закладки:', error);
    response.status(500).json({ error: 'Помилка оновлення закладки' });
  }
});

router.delete('/bookmarks/:id', authMiddleware, async (request: AuthRequest, response) => {
  try {
    const userId = request.user!.userId;
    const bookmarkId = parseInt(request.params.id);
    
    if (isNaN(bookmarkId)) {
      return response.status(400).json({ error: 'Невірний ID закладки' });
    }
        const bookmark = await prisma.bookmark.findFirst({
      where: { 
        id: bookmarkId,
        userId: userId
      }
    });
    
    if (!bookmark) {
      return response.status(404).json({ error: 'Закладку не знайдено' });
    }
    
    await prisma.bookmark.delete({
      where: { id: bookmarkId }
    });
    response.status(204).send();
  } catch (error) {
    console.error('Помилка видалення закладки:', error);
    response.status(500).json({ error: 'Помилка видалення закладки' });
  }
});

router.get('/notes', authMiddleware, async (request: AuthRequest, response) => {
  try {
    const { bookId } = request.query;
    const userId = request.user!.userId;
    
    if (bookId) {
      if (isNaN(parseInt(bookId as string))) {
        return response.status(400).json({ error: 'Невірний bookId' });
      }

      const notes = await prisma.note.findMany({
        where: { 
          bookId: parseInt(bookId as string),
          userId: userId
        },
        include: {
          book: {
            select: {
              id: true,
              title: true,
              author: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      response.json(notes);
    } else {
      const notes = await prisma.note.findMany({
        where: { userId: userId },
        include: {
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              format: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      response.json(notes);
    }
  } catch (error) {
    console.error('Помилка завантаження нотаток:', error);
    response.status(500).json({ error: 'Помилка завантаження нотаток' });
  }
});

router.post('/notes', authMiddleware, async (request: AuthRequest, response) => {
  try {
    const { bookId, content, position } = request.body;
    const userId = request.user!.userId;
    
    if (!bookId || isNaN(parseInt(bookId))) {
      return response.status(400).json({ error: 'Невірний bookId' });
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return response.status(400).json({ error: 'Зміст нотатки не може бути пустим' });
    }

    if (!position || typeof position !== 'string') {
      return response.status(400).json({ error: 'Позиція не може бути пустою' });
    }
    const book = await prisma.book.findFirst({
      where: { 
        id: parseInt(bookId),
        userId: userId
      }
    });
    
    if (!book) {
      return response.status(404).json({ error: 'Книгу не знайдено' });
    }
    
    const note = await prisma.note.create({
      data: {
        bookId: parseInt(bookId),
        userId: userId,
        content: content.trim(),
        position
      }
    });
    
    response.status(201).json(note);
  } catch (error) {
    console.error('Помилка створення нотатки:', error);
    response.status(500).json({ error: 'Помилка створення нотатки' });
  }
});

router.put('/notes/:id', authMiddleware, async (request: AuthRequest, response) => {
  try {
    const { content, position } = request.body;
    const userId = request.user!.userId;
    const noteId = parseInt(request.params.id);
    
    if (isNaN(noteId)) {
      return response.status(400).json({ error: 'Невірний ID нотатки' });
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return response.status(400).json({ error: 'Зміст нотатки не може бути пустим' });
    }

    if (!position || typeof position !== 'string') {
      return response.status(400).json({ error: 'Позиція не може бути пустою' });
    }
    const note = await prisma.note.findFirst({
      where: { 
        id: noteId,
        userId: userId
      }
    });
    
    if (!note) {
      return response.status(404).json({ error: 'Нотатку не знайдено' });
    }
    
    const updatedNote = await prisma.note.update({
      where: { id: noteId },
      data: {
        content: content.trim(),
        position
      }
    });
    
    response.json(updatedNote);
  } catch (error) {
    console.error('Помилка оновлення нотатки:', error);
    response.status(500).json({ error: 'Помилка оновлення нотатки' });
  }
});

router.delete('/notes/:id', authMiddleware, async (request: AuthRequest, response) => {
  try {
    const userId = request.user!.userId;
    const noteId = parseInt(request.params.id);
    
    if (isNaN(noteId)) {
      return response.status(400).json({ error: 'Невірний ID нотатки' });
    }
        const note = await prisma.note.findFirst({
      where: { 
        id: noteId,
        userId: userId
      }
    });
    
    if (!note) {
      return response.status(404).json({ error: 'Нотатку не знайдено' });
    }
    
    await prisma.note.delete({
      where: { id: noteId }
    });
    response.status(204).send();
  } catch (error) {
    console.error('Помилка видалення нотатки:', error);
    response.status(500).json({ error: 'Помилка видалення нотатки' });
  }
});

router.post('/sync-notes', authMiddleware, async (request: AuthRequest, response) => {
  try {
    const { bookId, notes } = request.body;
    const userId = request.user!.userId;
    
    if (!bookId || isNaN(parseInt(bookId))) {
      return response.status(400).json({ error: 'Невірний bookId' });
    }

    if (!Array.isArray(notes)) {
      return response.status(400).json({ error: 'Notes має бути масивом' });
    }
    const book = await prisma.book.findFirst({
      where: { 
        id: parseInt(bookId),
        userId: userId
      }
    });
    
    if (!book) {
      return response.status(404).json({ error: 'Книгу не знайдено' });
    }
    
    await prisma.note.deleteMany({
      where: {
        bookId: parseInt(bookId),
        userId: userId
      }
    });

    if (notes.length > 0) {
      const createdNotes = await prisma.note.createMany({
        data: notes.map((note: any) => ({
          bookId: parseInt(bookId),
          userId: userId,
          content: note.content?.trim() || '',
          position: note.position || ''
        }))
      });
      response.status(200).json({ success: true, count: createdNotes.count });
    } else {
      response.status(200).json({ success: true, count: 0 });
    }
  } catch (error) {
    console.error('Помилка синхронізації нотаток:', error);
    response.status(500).json({ error: 'Помилка синхронізації нотаток' });
  }
});

export default router;