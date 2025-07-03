import { Router } from 'express';
import BookController from '../controllers/BookController';
import upload from '../middleware/uploadMiddleware';

const router = Router();

router.post('/', upload.single('file'), BookController.uploadBook);
router.get('/', BookController.getAllBooks);
router.get('/:id', BookController.getBookById);
router.delete('/:id', BookController.deleteBook);
router.get('/file/:id', BookController.downloadBook);

export default router;