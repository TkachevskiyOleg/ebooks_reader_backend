import { Router } from 'express';
import TagController from '../controllers/TagController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authMiddleware, TagController.createTag);       
router.get('/', authMiddleware, TagController.getAllTags);     
router.post('/:bookId/:tagId', authMiddleware, TagController.addTagToBook); 

export default router;