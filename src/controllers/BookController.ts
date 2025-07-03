import { Request, Response } from 'express';
import prisma from '../prisma';
import fs from 'fs';
import path from 'path';

class BookController {
  static async uploadBook(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const { title, author, format } = req.body;
      const filePath = `/uploads/${req.file.filename}`;

      const book = await prisma.book.create({
        data: {
          title,
          author,
          format,
          filePath
        }
      });

      res.status(201).json(book);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to upload book' });
    }
  }

  static async getAllBooks(req: Request, res: Response): Promise<void> {
    try {
      const books = await prisma.book.findMany();
      res.json(books);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch books' });
    }
  }

  static async getBookById(req: Request, res: Response): Promise<void> {
    try {
      const book = await prisma.book.findUnique({
        where: { id: parseInt(req.params.id) },
        include: { bookmarks: true, notes: true }
      });
      if (book) {
        res.json(book);
      } else {
        res.status(404).json({ error: 'Book not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch book' });
    }
  }

  static async deleteBook(req: Request, res: Response): Promise<void> {
    try {
      const book = await prisma.book.delete({
        where: { id: parseInt(req.params.id) }
      });

      // Delete physical file
      const filePath = path.join(__dirname, '../../', book.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete book' });
    }
  }
}

export default BookController;