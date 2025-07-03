import { Router } from 'express';
import BookController from '../controllers/BookController';
import upload from '../middleware/uploadMiddleware';

const router = Router();

// Upload book (multipart/form-data)
router.post('/', upload.single('file'), BookController.uploadBook);

// Get all books
router.get('/', BookController.getAllBooks);

// Get book by ID
router.get('/:id', BookController.getBookById);

// Delete book
router.delete('/:id', BookController.deleteBook);

export default router;