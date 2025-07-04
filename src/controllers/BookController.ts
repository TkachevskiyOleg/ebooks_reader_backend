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

    console.log('[uploadBook] filePath:', filePath);
    console.log('[uploadBook] originalName:', req.file.originalname);

    const { title, author, format, publisher, language } =
      await extractMetadata(filePath, req.file.originalname);

    console.log('[uploadBook] metadata:', { title, author, format, publisher, language });

    const book = await prisma.book.create({
      data: {
        title,
        author,
        format,
        publisher,
        language,
        filePath: `/uploads/${fileName}`
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
    const books = await prisma.book.findMany();
    res.json(books);
  } catch (error) {
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
    
    if (!resolvedPath.startsWith(path.resolve('uploads/'))) {
      return response.status(400).json({ error: 'Неприпустимий шлях' });
    }

    const fileName = book.filePath.split('/').pop() || 'book';
    const encodedFileName = encodeURIComponent(fileName);
    
    response.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);
    response.setHeader('Content-Type', 'application/octet-stream');
    response.sendFile(resolvedPath);
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Помилка при завантаженні файлу' });
    }
  }
}

export default BookController;