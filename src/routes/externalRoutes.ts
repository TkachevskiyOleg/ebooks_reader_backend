import { Router } from 'express';
import axios from 'axios';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { importGutendexById } from '../services/syncService';

const router = Router();

// Search Gutendex by query
router.get('/gutendex/search', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'Потрібен параметр q' });
    const r = await axios.get('https://gutendex.com/books', { params: { search: q } });
    const items = (r.data?.results || []).map((b: any) => ({
      source: 'gutendex',
      externalId: b.id,
      title: b.title,
      author: b.authors?.map((a: any) => a.name).join(', ') || null,
      imageUrl: b.formats?.['image/jpeg'] || null,
      language: b.languages?.[0] || null,
      subjects: b.subjects || [],
      formats: Object.keys(b.formats || {}),
    }));
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: 'Помилка пошуку Gutendex' });
  }
});

// Get Gutendex book details
router.get('/gutendex/books/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const r = await axios.get(`https://gutendex.com/books/${id}`);
    const b = r.data;
    res.json({
      source: 'gutendex',
      externalId: b.id,
      title: b.title,
      author: b.authors?.map((a: any) => a.name).join(', ') || null,
      imageUrl: b.formats?.['image/jpeg'] || null,
      language: b.languages?.[0] || null,
      subjects: b.subjects || [],
      bookshelves: b.bookshelves || [],
      formats: b.formats || {},
      raw: b,
    });
  } catch (e) {
    res.status(404).json({ error: 'Книгу не знайдено у Gutendex' });
  }
});

// Import single Gutendex book into our DB
router.post('/gutendex/import/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Доступ заборонено' });
    const id = Number(req.params.id);
    const r = await importGutendexById(id);
    if (!r.created && r.reason === 'exists') return res.json({ created: false, reason: 'exists', bookId: r.bookId });
    if (!r.created) return res.status(400).json(r);
    res.status(201).json(r);
  } catch (e) {
    res.status(500).json({ error: 'Помилка імпорту Gutendex' });
  }
});

export default router;


