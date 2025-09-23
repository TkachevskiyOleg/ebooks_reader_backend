import * as cron from 'node-cron';
import externalBookService from './externalBookService';

class SchedulerService {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  constructor() {
    this.initializeDefaultJobs();
  }

  private initializeDefaultJobs(): void {
    // Щоденна синхронізація з Google Books (о 2:00 ранку)
    this.addJob('daily-google-books', '0 2 * * *', async () => {
      console.log('Запуск щоденної синхронізації з Google Books...');
      try {
        const queries = [
          'fiction',
          'science',
          'history',
          'programming',
          'ukrainian literature'
        ];
        
        for (const query of queries) {
          await externalBookService.syncBooksFromGoogleBooks(query, 10);
          // Затримка між запитами, щоб не перевантажити API
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        console.log('Щоденна синхронізація з Google Books завершена');
      } catch (error) {
        console.error('Помилка при щоденній синхронізації з Google Books:', error);
      }
    });

    // Щотижнева синхронізація з Open Library (по неділях о 3:00 ранку)
    this.addJob('weekly-open-library', '0 3 * * 0', async () => {
      console.log('Запуск щотижневої синхронізації з Open Library...');
      try {
        const queries = [
          'classic literature',
          'science fiction',
          'mystery',
          'romance',
          'biography'
        ];
        
        for (const query of queries) {
          await externalBookService.syncBooksFromOpenLibrary(query, 15);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        console.log('Щотижнева синхронізація з Open Library завершена');
      } catch (error) {
        console.error('Помилка при щотижневій синхронізації з Open Library:', error);
      }
    });

    // Щомісячна синхронізація з Project Gutenberg (1 числа о 4:00 ранку)
    this.addJob('monthly-gutenberg', '0 4 1 * *', async () => {
      console.log('Запуск щомісячної синхронізації з Project Gutenberg...');
      try {
        const queries = [
          'classic',
          'philosophy',
          'religion',
          'history',
          'adventure'
        ];
        
        for (const query of queries) {
          await externalBookService.syncBooksFromGutenberg(query, 20);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        console.log('Щомісячна синхронізація з Project Gutenberg завершена');
      } catch (error) {
        console.error('Помилка при щомісячній синхронізації з Project Gutenberg:', error);
      }
    });

    // Щогодинна перевірка на нові книги (тільки для популярних запитів)
    this.addJob('hourly-popular-books', '0 * * * *', async () => {
      console.log('Запуск щогодинної перевірки популярних книг...');
      try {
        const popularQueries = ['bestseller', 'new release', 'trending'];
        
        for (const query of popularQueries) {
          await externalBookService.syncBooksFromGoogleBooks(query, 5);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('Щогодинна перевірка популярних книг завершена');
      } catch (error) {
        console.error('Помилка при щогодинній перевірці популярних книг:', error);
      }
    });
  }

  addJob(name: string, cronExpression: string, task: () => Promise<void>): void {
    if (this.jobs.has(name)) {
      this.removeJob(name);
    }

    const job = cron.schedule(cronExpression, task, {
      scheduled: false,
      timezone: 'Europe/Kiev'
    });

    this.jobs.set(name, job);
    job.start();
    console.log(`Додано завдання: ${name} (${cronExpression})`);
  }

  removeJob(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.stop();
      job.destroy();
      this.jobs.delete(name);
      console.log(`Видалено завдання: ${name}`);
    }
  }

  startJob(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.start();
      console.log(`Запущено завдання: ${name}`);
    } else {
      console.log(`Завдання не знайдено: ${name}`);
    }
  }

  stopJob(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.stop();
      console.log(`Зупинено завдання: ${name}`);
    } else {
      console.log(`Завдання не знайдено: ${name}`);
    }
  }

  getJobStatus(name: string): { running: boolean; nextRun?: Date } | null {
    const job = this.jobs.get(name);
    if (!job) return null;

    return {
      running: job.running || false,
      // node-cron не надає прямого доступу до nextRun, тому повертаємо undefined
    };
  }

  getAllJobs(): Array<{ name: string; running: boolean }> {
    return Array.from(this.jobs.entries()).map(([name, job]) => ({
      name,
      running: job.running || false
    }));
  }

  startAllJobs(): void {
    this.jobs.forEach((job, name) => {
      job.start();
      console.log(`Запущено завдання: ${name}`);
    });
  }

  stopAllJobs(): void {
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`Зупинено завдання: ${name}`);
    });
  }

  // Метод для ручного запуску синхронізації
  async runManualSync(source: 'google_books' | 'open_library' | 'gutenberg', query: string, limit: number = 20): Promise<any> {
    console.log(`Ручний запуск синхронізації: ${source} з запитом "${query}"`);
    
    switch (source) {
      case 'google_books':
        return await externalBookService.syncBooksFromGoogleBooks(query, limit);
      case 'open_library':
        return await externalBookService.syncBooksFromOpenLibrary(query, limit);
      case 'gutenberg':
        return await externalBookService.syncBooksFromGutenberg(query, limit);
      default:
        throw new Error(`Невідоме джерело: ${source}`);
    }
  }

  // Метод для запуску повної синхронізації з усіх джерел
  async runFullSync(): Promise<{
    googleBooks: any;
    openLibrary: any;
    gutenberg: any;
  }> {
    console.log('Запуск повної синхронізації з усіх джерел...');
    
    const [googleBooks, openLibrary, gutenberg] = await Promise.allSettled([
      externalBookService.syncBooksFromGoogleBooks('popular books', 30),
      externalBookService.syncBooksFromOpenLibrary('classic literature', 30),
      externalBookService.syncBooksFromGutenberg('classic', 30)
    ]);

    return {
      googleBooks: googleBooks.status === 'fulfilled' ? googleBooks.value : { error: 'Failed' },
      openLibrary: openLibrary.status === 'fulfilled' ? openLibrary.value : { error: 'Failed' },
      gutenberg: gutenberg.status === 'fulfilled' ? gutenberg.value : { error: 'Failed' }
    };
  }
}

export default new SchedulerService();