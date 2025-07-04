import { Router } from 'express';
import CollectionController from '../controllers/CollectionController';

const router = Router();

router.post('/', CollectionController.createCollection);
router.get('/', CollectionController.getCollections);
router.post('/:collectionId/books/:bookId', CollectionController.addBook);

export default router;