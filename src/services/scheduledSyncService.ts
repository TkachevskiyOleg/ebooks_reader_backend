import * as cron from 'node-cron';
import BookIntegrationService from './bookIntegrationService';
import prisma from '../prisma';

class ScheduledSyncService {
  private static isRunning = false;
  private static jobs: cron.ScheduledTask[] = [];

  // Start all scheduled tasks
  static start(): void {
    if (this.isRunning) {
      console.log('Scheduled sync service is already running');
      return;
    }

    console.log('Starting scheduled sync service...');
    this.isRunning = true;

    // Daily trending books sync at 2 AM
    const dailyTrendingSync = cron.schedule('0 2 * * *', async () => {
      await this.syncTrendingBooks();
    }, {
      timezone: 'Europe/Kiev'
    });

    // Weekly metadata enhancement for books without complete metadata (Sundays at 3 AM)
    const weeklyMetadataSync = cron.schedule('0 3 * * 0', async () => {
      await this.enhanceIncompleteMetadata();
    }, {
      timezone: 'Europe/Kiev'
    });

    // Monthly popular books import (1st of each month at 4 AM)
    const monthlyPopularBooksSync = cron.schedule('0 4 1 * *', async () => {
      await this.importPopularBooks();
    }, {
      timezone: 'Europe/Kiev'
    });

    // Daily cleanup of old sync logs (keep last 30 days) at 1 AM
    const dailyLogCleanup = cron.schedule('0 1 * * *', async () => {
      await this.cleanupOldLogs();
    }, {
      timezone: 'Europe/Kiev'
    });

    // Start all jobs
    dailyTrendingSync.start();
    weeklyMetadataSync.start();
    monthlyPopularBooksSync.start();
    dailyLogCleanup.start();

    this.jobs = [dailyTrendingSync, weeklyMetadataSync, monthlyPopularBooksSync, dailyLogCleanup];

    console.log('Scheduled sync service started with the following jobs:');
    console.log('- Daily trending books sync: Every day at 2 AM');
    console.log('- Weekly metadata enhancement: Every Sunday at 3 AM');
    console.log('- Monthly popular books import: 1st of each month at 4 AM');
    console.log('- Daily log cleanup: Every day at 1 AM');
  }

  // Stop all scheduled tasks
  static stop(): void {
    if (!this.isRunning) {
      console.log('Scheduled sync service is not running');
      return;
    }

    console.log('Stopping scheduled sync service...');
    
    this.jobs.forEach(job => {
      job.stop();
      job.destroy();
    });
    
    this.jobs = [];
    this.isRunning = false;
    
    console.log('Scheduled sync service stopped');
  }

  // Manual trigger for trending books sync
  static async syncTrendingBooks(): Promise<void> {
    const startTime = Date.now();
    console.log('Starting trending books sync...');

    try {
      // Get trending books from all sources
      const trendingBooks = await BookIntegrationService.getTrendingBooks(100);
      
      let importedCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Import books that don't exist yet and are downloadable
      for (const book of trendingBooks) {
        if (!book.downloadUrl) continue;

        try {
          // Check if book already exists
          const existingBook = await prisma.book.findFirst({
            where: {
              OR: [
                { originalFilePath: book.downloadUrl },
                { 
                  AND: [
                    { title: book.title },
                    { author: book.author }
                  ]
                },
                {
                  AND: [
                    { externalId: book.id },
                    { externalSource: book.source }
                  ]
                }
              ]
            }
          });

          if (!existingBook) {
            // Import as public book
            const importedBook = await BookIntegrationService.importExternalBook(
              book,
              undefined, // No specific user
              true // Make it public
            );

            // Update with external source info
            await prisma.book.update({
              where: { id: importedBook.id },
              data: {
                externalId: book.id,
                externalSource: book.source,
                isbn: book.isbn,
                pageCount: book.pageCount,
                description: book.description,
                publishedDate: book.publishedDate,
                lastSyncedAt: new Date()
              }
            });

            importedCount++;
            console.log(`Imported trending book: ${book.title}`);
          }
        } catch (error) {
          errorCount++;
          const errorMsg = `Failed to import "${book.title}": ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }

        // Small delay to be respectful to external APIs
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const duration = Date.now() - startTime;
      const status = errorCount === 0 ? 'success' : importedCount > 0 ? 'partial' : 'failed';

      // Log the sync operation
      await prisma.syncLog.create({
        data: {
          source: 'all_sources',
          operation: 'trending_sync',
          resultCount: trendingBooks.length,
          successCount: importedCount,
          errorCount,
          duration,
          status,
          errorMessage: errors.length > 0 ? errors.join('; ') : null
        }
      });

      console.log(`Trending books sync completed. Imported: ${importedCount}, Errors: ${errorCount}, Duration: ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await prisma.syncLog.create({
        data: {
          source: 'all_sources',
          operation: 'trending_sync',
          resultCount: 0,
          errorCount: 1,
          duration,
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      console.error('Trending books sync failed:', error);
    }
  }

  // Enhance metadata for books with incomplete information
  static async enhanceIncompleteMetadata(): Promise<void> {
    const startTime = Date.now();
    console.log('Starting metadata enhancement for incomplete books...');

    try {
      // Find books with missing metadata (no genre, description, or image)
      const booksToEnhance = await prisma.book.findMany({
        where: {
          OR: [
            { genre: null },
            { description: null },
            { imageUrl: null },
            { publisher: null },
            { lastSyncedAt: null },
            {
              lastSyncedAt: {
                lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Older than 30 days
              }
            }
          ]
        },
        take: 50, // Limit to prevent overwhelming APIs
        orderBy: { createdAt: 'asc' }
      });

      let enhancedCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const book of booksToEnhance) {
        try {
          await BookIntegrationService.enhanceBookMetadata(book.id);
          
          // Update lastSyncedAt
          await prisma.book.update({
            where: { id: book.id },
            data: { lastSyncedAt: new Date() }
          });

          enhancedCount++;
          console.log(`Enhanced metadata for: ${book.title}`);
        } catch (error) {
          errorCount++;
          const errorMsg = `Failed to enhance "${book.title}": ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const duration = Date.now() - startTime;
      const status = errorCount === 0 ? 'success' : enhancedCount > 0 ? 'partial' : 'failed';

      await prisma.syncLog.create({
        data: {
          source: 'all_sources',
          operation: 'metadata_enhancement',
          resultCount: booksToEnhance.length,
          successCount: enhancedCount,
          errorCount,
          duration,
          status,
          errorMessage: errors.length > 0 ? errors.join('; ') : null
        }
      });

      console.log(`Metadata enhancement completed. Enhanced: ${enhancedCount}, Errors: ${errorCount}, Duration: ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await prisma.syncLog.create({
        data: {
          source: 'all_sources',
          operation: 'metadata_enhancement',
          resultCount: 0,
          errorCount: 1,
          duration,
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      console.error('Metadata enhancement failed:', error);
    }
  }

  // Import popular books from different genres
  static async importPopularBooks(): Promise<void> {
    const startTime = Date.now();
    console.log('Starting popular books import...');

    try {
      const popularGenres = [
        'fiction bestsellers',
        'science fiction',
        'fantasy',
        'mystery',
        'romance',
        'non-fiction',
        'biography',
        'history',
        'self-help',
        'technology'
      ];

      let totalImported = 0;
      let totalErrors = 0;
      const allErrors: string[] = [];

      for (const genre of popularGenres) {
        try {
          console.log(`Searching popular books in genre: ${genre}`);
          
          const books = await BookIntegrationService.searchAllSources(genre, 10);
          const downloadableBooks = books.filter(book => book.downloadUrl);

          let genreImported = 0;
          
          for (const book of downloadableBooks.slice(0, 5)) { // Limit to 5 per genre
            try {
              // Check if book already exists
              const existingBook = await prisma.book.findFirst({
                where: {
                  OR: [
                    { originalFilePath: book.downloadUrl },
                    { 
                      AND: [
                        { title: book.title },
                        { author: book.author }
                      ]
                    }
                  ]
                }
              });

              if (!existingBook) {
                const importedBook = await BookIntegrationService.importExternalBook(
                  book,
                  undefined, // No specific user
                  true // Make it public
                );

                await prisma.book.update({
                  where: { id: importedBook.id },
                  data: {
                    externalId: book.id,
                    externalSource: book.source,
                    isbn: book.isbn,
                    pageCount: book.pageCount,
                    description: book.description,
                    publishedDate: book.publishedDate,
                    lastSyncedAt: new Date()
                  }
                });

                genreImported++;
                totalImported++;
                console.log(`Imported popular book from ${genre}: ${book.title}`);
              }
            } catch (error) {
              totalErrors++;
              const errorMsg = `Failed to import "${book.title}" from ${genre}: ${error instanceof Error ? error.message : 'Unknown error'}`;
              allErrors.push(errorMsg);
              console.error(errorMsg);
            }

            // Delay between imports
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

          console.log(`Imported ${genreImported} books from genre: ${genre}`);
          
          // Delay between genres
          await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (error) {
          totalErrors++;
          const errorMsg = `Failed to process genre "${genre}": ${error instanceof Error ? error.message : 'Unknown error'}`;
          allErrors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      const duration = Date.now() - startTime;
      const status = totalErrors === 0 ? 'success' : totalImported > 0 ? 'partial' : 'failed';

      await prisma.syncLog.create({
        data: {
          source: 'all_sources',
          operation: 'popular_books_import',
          resultCount: popularGenres.length,
          successCount: totalImported,
          errorCount: totalErrors,
          duration,
          status,
          errorMessage: allErrors.length > 0 ? allErrors.slice(0, 10).join('; ') : null // Limit error message length
        }
      });

      console.log(`Popular books import completed. Imported: ${totalImported}, Errors: ${totalErrors}, Duration: ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await prisma.syncLog.create({
        data: {
          source: 'all_sources',
          operation: 'popular_books_import',
          resultCount: 0,
          errorCount: 1,
          duration,
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      console.error('Popular books import failed:', error);
    }
  }

  // Clean up old sync logs (keep last 30 days)
  static async cleanupOldLogs(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const deletedLogs = await prisma.syncLog.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo
          }
        }
      });

      console.log(`Cleaned up ${deletedLogs.count} old sync logs`);
    } catch (error) {
      console.error('Failed to cleanup old sync logs:', error);
    }
  }

  // Get sync service status
  static getStatus(): { isRunning: boolean; jobCount: number; nextRuns: any[] } {
    const nextRuns = this.jobs.map((job, index) => ({
      job: ['Daily Trending Sync', 'Weekly Metadata Enhancement', 'Monthly Popular Books', 'Daily Log Cleanup'][index],
      nextRun: job.getStatus()
    }));

    return {
      isRunning: this.isRunning,
      jobCount: this.jobs.length,
      nextRuns
    };
  }

  // Manual triggers for testing
  static async runManualSync(operation: 'trending' | 'metadata' | 'popular' | 'cleanup'): Promise<void> {
    switch (operation) {
      case 'trending':
        await this.syncTrendingBooks();
        break;
      case 'metadata':
        await this.enhanceIncompleteMetadata();
        break;
      case 'popular':
        await this.importPopularBooks();
        break;
      case 'cleanup':
        await this.cleanupOldLogs();
        break;
      default:
        throw new Error('Unknown operation');
    }
  }
}

export default ScheduledSyncService;