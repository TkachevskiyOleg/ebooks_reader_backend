import { Router } from 'express';
import BookController from '../controllers/BookController';
import upload, { uploadCover, uploadMultipart } from '../middleware/uploadMiddleware';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { syncAllSources, syncGutendex } from '../services/syncService';

const router = Router();

router.post('/', authMiddleware, uploadMultipart.fields([
  { name: 'file', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]), BookController.uploadBook);
router.get('/', authMiddleware, BookController.getAllBooks);
router.get('/public', authMiddleware, BookController.getPublicBooks);
router.get('/public/file/:id', authMiddleware, BookController.downloadPublicBook);
router.get('/filter', BookController.filterBooks);  
router.get('/home', authMiddleware, BookController.getHomeFeed);
router.get('/file/:id', authMiddleware, BookController.downloadBook);
router.get('/:id', authMiddleware, BookController.getBookById);
router.delete('/:id', authMiddleware, BookController.deleteBook);
router.post('/add-to-my', authMiddleware, BookController.addToMyBooks);
router.patch('/:id/cover', authMiddleware, uploadCover.single('cover'), BookController.uploadCover);
router.get('/genres', authMiddleware, BookController.getAllGenres);
router.get('/genre/:genre', authMiddleware, BookController.getBooksByGenre);
router.post('/:bookId/rate', authMiddleware, BookController.rateBook);

// Admin-only: trigger background sync
router.post('/sync', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Доступ заборонено' });
    }
    const pages = req.query.pages ? Number(req.query.pages) : undefined;
    const max = req.query.max ? Number(req.query.max) : undefined;
    let result;
    if (pages || max) {
      const gut = await syncGutendex(pages || undefined, max || undefined);
      result = [gut];
    } else {
      result = await syncAllSources();
    }
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: 'Помилка синхронізації', details: error instanceof Error ? error.message : String(error) });
  }
});

export default router;