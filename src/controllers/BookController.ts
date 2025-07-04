import { Request, Response } from 'express';
import prisma from '../prisma';
import fs from 'fs';
import path from 'path';
import { extractMetadata } from '../utils/metadataExtractor';

class BookController {
  static async uploadBook(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Файл не завантажено' });
        return;
      }

      const filePath = req.file.path;
      const fileName = req.file.filename;
      const { userId } = req.body; 

      const { title, author, format, publisher, language } =
        await extractMetadata(filePath, req.file.originalname);

      const book = await prisma.book.create({
        data: {
          title,
          author,
          format,
          publisher,
          language,
          filePath: `/uploads/${fileName}`,
          userId: userId ? parseInt(userId) : null
        }
      });

      res.status(201).json(book);
    } catch (error) {
      console.error('[uploadBook] ERROR:', error);
      res.status(500).json({ error: 'Помилка при завантаженні книги' });
    }
  }

  static async getAllBooks(req: Request, res: Response): Promise<void> {
  try {
    console.log('[getAllBooks] Query params:', req.query);
    const { userId } = req.query;
    
    const where = userId ? { userId: parseInt(userId as string) } : {};
    console.log('[getAllBooks] Where clause:', where);
    
    const books = await prisma.book.findMany({ where });
    console.log('[getAllBooks] Found books:', books.length);
    
    res.json(books);
  } catch (error) {
    console.error('[getAllBooks] ERROR:', error);
    res.status(500).json({ error: 'Помилка при отриманні книг' });
  }
}

  static async getBookById(req: Request, res: Response): Promise<void> {
    try {
      const book = await prisma.book.findUnique({
        where: { id: parseInt(req.params.id) }
      });
      if (book) {
        res.json(book);
      } else {
        res.status(404).json({ error: 'Книгу не знайдено' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Помилка при отриманні книги' });
    }
  }

  static async deleteBook(req: Request, res: Response): Promise<void> {
    try {
      const book = await prisma.book.delete({
        where: { id: parseInt(req.params.id) }
      });
      const filePath = path.join(__dirname, '../../', book.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Помилка при видаленні книги' });
    }
  }

static async downloadBook(request: Request, response: Response) {
  try {
    const book = await prisma.book.findUnique({
      where: { id: parseInt(request.params.id) }
    });

    if (!book) {
      return response.status(404).json({ error: 'Книгу не знайдено' });
    }

    const resolvedPath = path.resolve(__dirname, '../../', book.filePath);
    const uploadsDir = path.resolve(__dirname, '../../uploads');
    
    const normalizedPath = resolvedPath.replace(/\\/g, '/');
    const normalizedUploadsDir = uploadsDir.replace(/\\/g, '/');
    
    if (!normalizedPath.startsWith(normalizedUploadsDir)) {
      return response.status(400).json({ error: 'Неприпустимий шлях' });
    }

  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Помилка при завантаженні файлу' });
  }
}
}

export default BookController;