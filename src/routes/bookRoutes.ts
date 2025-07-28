import { Router } from 'express';
import BookController from '../controllers/BookController';
import upload, { uploadCover, uploadMultipart } from '../middleware/uploadMiddleware';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authMiddleware, uploadMultipart.fields([
  { name: 'file', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]), BookController.uploadBook);
router.get('/', authMiddleware, BookController.getAllBooks);
router.get('/public', authMiddleware, BookController.getPublicBooks);
router.get('/public/file/:id', authMiddleware, BookController.downloadPublicBook);
router.get('/:id', authMiddleware, BookController.getBookById);
router.delete('/:id', authMiddleware, BookController.deleteBook);
router.get('/file/:id', authMiddleware, BookController.downloadBook);
router.post('/add-to-my', authMiddleware, BookController.addToMyBooks);
router.patch('/:id/cover', authMiddleware, uploadCover.single('cover'), BookController.uploadCover);
router.get('/genres', authMiddleware, BookController.getAllGenres);
router.get('/genre/:genre', authMiddleware, BookController.getBooksByGenre);

export default router;