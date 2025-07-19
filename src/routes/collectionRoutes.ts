import { Router } from 'express';
import CollectionController from '../controllers/CollectionController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authMiddleware, CollectionController.createCollection);
router.get('/', authMiddleware, CollectionController.getAllCollections);
router.get('/:id', authMiddleware, CollectionController.getCollectionById);
router.post('/:collectionId/books/:bookId', authMiddleware, CollectionController.addBook);
router.delete('/:collectionId/books/:bookId', authMiddleware, CollectionController.removeBook);
router.delete('/:id', authMiddleware, CollectionController.deleteCollection);

export default router;