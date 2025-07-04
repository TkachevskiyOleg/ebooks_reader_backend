import { Router } from 'express';
import CollectionController from '../controllers/CollectionController';

const router = Router();

router.post('/', CollectionController.createCollection);
router.get('/:id', CollectionController.getCollectionById);
router.post('/:collectionId/books/:bookId', CollectionController.addBook);

export default router;