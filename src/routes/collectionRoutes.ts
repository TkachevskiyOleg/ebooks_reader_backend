import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

// GET /api/collections
router.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Collections endpoint' });
});

export default router;