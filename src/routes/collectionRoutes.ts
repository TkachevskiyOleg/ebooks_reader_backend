import { Router } from 'express';
import CollectionController from '../controllers/CollectionController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authMiddleware, CollectionController.createCollection);
router.get('/:id', authMiddleware, CollectionController.getCollectionById);
router.post('/:collectionId/books/:bookId', authMiddleware, CollectionController.addBook);

export default router;