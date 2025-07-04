import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

router.post('/sync-progress', async (request, response) => {
  try {
    const { bookId, progress, userId } = request.body;
    response.status(200).json({ success: true });
  } catch (error) {
    response.status(500).json({ error: 'Помилка синхронізації' });
  }
});

router.get('/:bookId/bookmarks', async (request, response) => {
  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: { bookId: parseInt(request.params.bookId) }
    });
    response.json(bookmarks);
  } catch (error) {
    response.status(500).json({ error: 'Помилка завантаження закладок' });
  }
});

export default router;