import { Router } from 'express';
import BookController from '../controllers/BookController';
import upload from '../middleware/uploadMiddleware';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authMiddleware, upload.single('file'), BookController.uploadBook);
router.get('/', authMiddleware, BookController.getAllBooks);
router.get('/:id', authMiddleware, BookController.getBookById);
router.delete('/:id', authMiddleware, BookController.deleteBook);
router.get('/file/:id', authMiddleware, BookController.downloadBook);

export default router;