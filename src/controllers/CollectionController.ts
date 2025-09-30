import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import prisma from '../prisma';

export default class CollectionController {
  static async createCollection(request: AuthRequest, response: Response) {
    try {
      const userId = request.user!.userId;
      const { name } = request.body;
      
      if (!name || name.trim().length === 0) {
        return response.status(400).json({ error: 'Назва колекції не може бути пустою' });
      }
      
      const collection = await prisma.collection.create({
        data: { 
          name: name.trim(),
          userId: userId
        }
      });
      response.status(201).json(collection);
    } catch (error) {
      response.status(500).json({ error: 'Помилка створення колекції' });
    }
  }

  static async getAllCollections(request: AuthRequest, response: Response) {
    try {
      const userId = request.user!.userId;
      
      const collections = await prisma.collection.findMany({
        where: { userId: userId },
        include: { 
          books: {
            select: {
              id: true,
              title: true,
              author: true,
              format: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      response.json(collections);
    } catch (error) {
      response.status(500).json({ error: 'Помилка завантаження колекцій' });
    }
  }

  static async getCollectionById(request: AuthRequest, response: Response) {
    try {
      const userId = request.user!.userId;
      const collectionId = parseInt(request.params.id);
      
      if (isNaN(collectionId)) {
        return response.status(400).json({ error: 'Невірний ID колекції' });
      }
      
      const collection = await prisma.collection.findFirst({
        where: { 
          id: collectionId,
          userId: userId
        },
        include: { 
          books: {
            select: {
              id: true,
              title: true,
              author: true,
              format: true,
              imageUrl: true
            }
          }
        }
      });
      
      if (!collection) {
        return response.status(404).json({ error: 'Колекцію не знайдено' });
      }
      
      response.json(collection);
    } catch (error) {
      response.status(500).json({ error: 'Помилка завантаження колекції' });
    }
  }

  static async addBook(request: AuthRequest, response: Response) {
    try {
      const userId = request.user!.userId;
      const collectionId = parseInt(request.params.collectionId);
      const bookId = parseInt(request.params.bookId);
      
      if (isNaN(collectionId) || isNaN(bookId)) {
        return response.status(400).json({ error: 'Невірний ID колекції або книги' });
      }
      
      const collection = await prisma.collection.findFirst({
        where: { 
          id: collectionId,
          userId: userId
        }
      });
      
      if (!collection) {
        return response.status(404).json({ error: 'Колекцію не знайдено' });
      }
      
      const book = await prisma.book.findFirst({
        where: {
          id: bookId,
          OR: [
            { userId: userId },
            { isPublic: true }
          ]
        }
      });
      
      if (!book) {
        return response.status(404).json({ error: 'Книгу не знайдено' });
      }
      
      const updated = await prisma.collection.update({
        where: { id: collectionId },
        data: {
          books: {
            connect: { id: bookId }
          }
        }
      });
      response.status(200).json({ message: 'Книгу додано до колекції', collectionId, bookId });
    } catch (error) {
      response.status(500).json({ error: 'Помилка додавання книги' });
    }
  }

  static async removeBook(request: AuthRequest, response: Response) {
    try {
      const userId = request.user!.userId;
      const collectionId = parseInt(request.params.collectionId);
      const bookId = parseInt(request.params.bookId);
      
      if (isNaN(collectionId) || isNaN(bookId)) {
        return response.status(400).json({ error: 'Невірний ID колекції або книги' });
      }
      
      const collection = await prisma.collection.findFirst({
        where: { 
          id: collectionId,
          userId: userId
        }
      });
      
      if (!collection) {
        return response.status(404).json({ error: 'Колекцію не знайдено' });
      }
      
      await prisma.collection.update({
        where: { id: collectionId },
        data: {
          books: {
            disconnect: { id: bookId }
          }
        }
      });
      
      response.status(200).json({ message: 'Книгу видалено з колекції' });
    } catch (error) {
      response.status(500).json({ error: 'Помилка видалення книги з колекції' });
    }
  }

  static async deleteCollection(request: AuthRequest, response: Response) {
    try {
      const userId = request.user!.userId;
      const collectionId = parseInt(request.params.id);
      
      if (isNaN(collectionId)) {
        return response.status(400).json({ error: 'Невірний ID колекції' });
      }
      
      const collection = await prisma.collection.findFirst({
        where: { 
          id: collectionId,
          userId: userId
        }
      });
      
      if (!collection) {
        return response.status(404).json({ error: 'Колекцію не знайдено' });
      }
      
      await prisma.collection.delete({
        where: { id: collectionId }
      });
      
      response.status(204).send();
    } catch (error) {
      response.status(500).json({ error: 'Помилка видалення колекції' });
    }
  }
}