import { Request, Response } from 'express';
import prisma from '../prisma';

export default class CollectionController {
  static async createCollection(request: Request, response: Response) {
    try {
      const collection = await prisma.collection.create({
        data: { name: request.body.name }
      });
      response.status(201).json(collection);
    } catch (error) {
      response.status(500).json({ error: 'Помилка створення колекції' });
    }
  }

  static async addBook(request: Request, response: Response) {
    try {
      await prisma.collection.update({
        where: { id: parseInt(request.params.collectionId) },
        data: {
          books: { connect: { id: parseInt(request.params.bookId) } }
        }
      });
      response.status(204).send();
    } catch (error) {
      response.status(500).json({ error: 'Помилка додавання книги' });
    }
  }

  static async getCollections(request: Request, response: Response) {
    try {
      const collections = await prisma.collection.findMany({
        include: { books: true }
      });
      response.json(collections);
    } catch (error) {
      response.status(500).json({ error: 'Помилка завантаження колекцій' });
    }
  }
}