import * as cron from 'node-cron';
import prisma from '../prisma';
import googleBooksService from './googleBooksService';
import openLibraryService from './openLibraryService';
import gutenbergService from './gutenbergService';

export class SchedulerService {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Запуск всіх запланованих завдань
   */
  startAllJobs(): void {
    console.log('Запуск планувальника завдань...');
    
    // Оновлення метаданих зовнішніх книг щодня о 2:00
    this.scheduleJob('update-metadata', '0 2 * * *', this.updateExternalBooksMetadata.bind(this));
    
    // Пошук нових популярних книг щотижня в понеділок о 3:00
    this.scheduleJob('fetch-popular-books', '0 3 * * 1', this.fetchPopularBooks.bind(this));
    
    // Очищення старих записів щомісяця 1 числа о 4:00
    this.scheduleJob('cleanup-old-records', '0 4 1 * *', this.cleanupOldRecords.bind(this));
    
    // Синхронізація з Project Gutenberg щодня о 5:00
    this.scheduleJob('sync-gutenberg', '0 5 * * *', this.syncGutenbergBooks.bind(this));
    
    console.log('Всі завдання планувальника запущені');
  }

  /**
   * Зупинка всіх завдань
   */
  stopAllJobs(): void {
    console.log('Зупинка планувальника завдань...');
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`Завдання "${name}" зупинено`);
    });
    this.jobs.clear();
  }

  /**
   * Планування завдання
   */
  private scheduleJob(name: string, cronExpression: string, task: () => Promise<void>): void {
    const job = cron.schedule(cronExpression, async () => {
      console.log(`Виконання завдання: ${name}`);
      try {
        await task();
        console.log(`Завдання "${name}" виконано успішно`);
      } catch (error) {
        console.error(`Помилка виконання завдання "${name}":`, error);
      }
    }, {
      scheduled: false,
      timezone: 'Europe/Kiev'
    });

    job.start();
    this.jobs.set(name, job);
    console.log(`Завдання "${name}" заплановано: ${cronExpression}`);
  }

  /**
   * Оновлення метаданих зовнішніх книг
   */
  private async updateExternalBooksMetadata(): Promise<void> {
    console.log('Початок оновлення метаданих зовнішніх книг...');
    
    const externalBooks = await prisma.externalBook.findMany({
      where: {
        lastCheckedAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Не перевірялися більше 24 годин
        }
      },
      take: 100, // Обмежуємо кількість для одного запуску
      orderBy: { lastCheckedAt: 'asc' }
    });

    let updatedCount = 0;
    let errorCount = 0;

    for (const externalBook of externalBooks) {
      try {
        let updatedData: any = null;

        switch (externalBook.source) {
          case 'google_books':
            const googleBook = await googleBooksService.getBookById(externalBook.externalId);
            updatedData = googleBooksService.convertToExternalBook(googleBook);
            break;
          
          case 'open_library':
            const openLibraryWork = await openLibraryService.getWorkByKey(`/works/${externalBook.externalId}`);
            updatedData = openLibraryService.convertToExternalBook(openLibraryWork);
            break;
          
          case 'gutenberg':
            const gutenbergBook = await gutenbergService.getBookById(parseInt(externalBook.externalId));
            updatedData = gutenbergService.convertToExternalBook(gutenbergBook);
            break;
        }

        if (updatedData) {
          await prisma.externalBook.update({
            where: { id: externalBook.id },
            data: {
              ...updatedData,
              lastCheckedAt: new Date()
            }
          });
          updatedCount++;
        }

        // Невелика затримка між запитами
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Помилка оновлення книги ${externalBook.externalId}:`, error);
        errorCount++;
      }
    }

    console.log(`Оновлення метаданих завершено. Оновлено: ${updatedCount}, помилок: ${errorCount}`);
  }

  /**
   * Отримання популярних книг
   */
  private async fetchPopularBooks(): Promise<void> {
    console.log('Початок отримання популярних книг...');
    
    const sources = [
      { name: 'google_books', service: googleBooksService },
      { name: 'open_library', service: openLibraryService },
      { name: 'gutenberg', service: gutenbergService }
    ];

    for (const source of sources) {
      try {
        console.log(`Отримання популярних книг з ${source.name}...`);
        
        let popularBooks: any[] = [];
        
        switch (source.name) {
          case 'google_books':
            const googleResults = await googleBooksService.getPopularBooks(50);
            popularBooks = googleResults.items?.map(volume => 
              googleBooksService.convertToExternalBook(volume)
            ) || [];
            break;
          
          case 'open_library':
            const openLibraryResults = await openLibraryService.getPopularBooks(50);
            popularBooks = openLibraryResults.docs.map(work => 
              openLibraryService.convertToExternalBook(work)
            );
            break;
          
          case 'gutenberg':
            const gutenbergResults = await gutenbergService.getPopularBooks(50);
            popularBooks = gutenbergResults.results.map(book => 
              gutenbergService.convertToExternalBook(book)
            );
            break;
        }

        // Збереження популярних книг
        for (const bookData of popularBooks) {
          try {
            await prisma.externalBook.upsert({
              where: {
                externalId_source: {
                  externalId: bookData.externalId,
                  source: bookData.source
                }
              },
              update: {
                ...bookData,
                lastCheckedAt: new Date()
              },
              create: {
                ...bookData,
                lastCheckedAt: new Date()
              }
            });
          } catch (error) {
            console.error(`Помилка збереження популярної книги ${bookData.externalId}:`, error);
          }
        }

        console.log(`Збережено ${popularBooks.length} популярних книг з ${source.name}`);
        
        // Затримка між джерелами
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Помилка отримання популярних книг з ${source.name}:`, error);
      }
    }

    console.log('Отримання популярних книг завершено');
  }

  /**
   * Очищення старих записів
   */
  private async cleanupOldRecords(): Promise<void> {
    console.log('Початок очищення старих записів...');
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    try {
      // Видалення старих зовнішніх книг, які не мають імпортованих копій
      const deletedExternalBooks = await prisma.externalBook.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo
          },
          importedBooks: {
            none: {}
          }
        }
      });

      console.log(`Видалено ${deletedExternalBooks.count} старих зовнішніх книг`);
    } catch (error) {
      console.error('Помилка очищення старих записів:', error);
    }

    console.log('Очищення старих записів завершено');
  }

  /**
   * Синхронізація з Project Gutenberg
   */
  private async syncGutenbergBooks(): Promise<void> {
    console.log('Початок синхронізації з Project Gutenberg...');
    
    try {
      // Отримання нових книг з Project Gutenberg
      const recentBooks = await gutenbergService.getRecentBooks(100);
      
      let syncedCount = 0;
      
      for (const book of recentBooks.results) {
        try {
          const bookData = gutenbergService.convertToExternalBook(book);
          
          await prisma.externalBook.upsert({
            where: {
              externalId_source: {
                externalId: bookData.externalId,
                source: bookData.source
              }
            },
            update: {
              ...bookData,
              lastCheckedAt: new Date()
            },
            create: {
              ...bookData,
              lastCheckedAt: new Date()
            }
          });
          
          syncedCount++;
          
          // Невелика затримка між запитами
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) {
          console.error(`Помилка синхронізації книги ${book.id}:`, error);
        }
      }

      console.log(`Синхронізація з Project Gutenberg завершена. Синхронізовано: ${syncedCount} книг`);
    } catch (error) {
      console.error('Помилка синхронізації з Project Gutenberg:', error);
    }
  }

  /**
   * Ручний запуск завдання
   */
  async runJobManually(jobName: string): Promise<void> {
    console.log(`Ручний запуск завдання: ${jobName}`);
    
    switch (jobName) {
      case 'update-metadata':
        await this.updateExternalBooksMetadata();
        break;
      case 'fetch-popular-books':
        await this.fetchPopularBooks();
        break;
      case 'cleanup-old-records':
        await this.cleanupOldRecords();
        break;
      case 'sync-gutenberg':
        await this.syncGutenbergBooks();
        break;
      default:
        throw new Error(`Невідоме завдання: ${jobName}`);
    }
  }

  /**
   * Отримання статусу завдань
   */
  getJobsStatus(): { [key: string]: boolean } {
    const status: { [key: string]: boolean } = {};
    this.jobs.forEach((job, name) => {
      status[name] = job.getStatus() === 'scheduled';
    });
    return status;
  }
}

export default new SchedulerService();