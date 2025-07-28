import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export default class TagController {
  static async createTag(req: AuthRequest, res: Response) {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Доступ заборонено' });
    }

    const { name } = req.body;
    try {
      const tag = await prisma.tag.create({ data: { name } });
      res.status(201).json(tag);
    } catch (error) {
      res.status(500).json({ error: 'Помилка при створенні тегу' });
    }
  }

  static async getAllTags(req: AuthRequest, res: Response) {
    try {
      const tags = await prisma.tag.findMany();
      res.json(tags);
    } catch (error) {
      res.status(500).json({ error: 'Помилка при отриманні тегів' });
    }
  }

  static async addTagToBook(req: AuthRequest, res: Response) {
    const { bookId, tagId } = req.params;
    try {
      await prisma.book.update({
        where: { id: parseInt(bookId) },
        data: { tags: { connect: { id: parseInt(tagId) } } },
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Помилка при додаванні тегу' });
    }
  }
}