import axios from 'axios';
import prisma from '../prisma';

export interface ExternalBook {
  id: string;
  title: string;
  author?: string;
  description?: string;
  isbn?: string;
  pageCount?: number;
  publishedDate?: string;
  language?: string;
  publisher?: string;
  imageUrl?: string;
  downloadUrl?: string;
  format?: string;
  genre?: string;
}

export interface GoogleBooksResponse {
  items: Array<{
    id: string;
    volumeInfo: {
      title: string;
      authors?: string[];
      description?: string;
      industryIdentifiers?: Array<{
        type: string;
        identifier: string;
      }>;
      pageCount?: number;
      publishedDate?: string;
      language?: string;
      publisher?: string;
      imageLinks?: {
        thumbnail?: string;
        small?: string;
        medium?: string;
        large?: string;
      };
      categories?: string[];
    };
    accessInfo?: {
      epub?: {
        downloadLink?: string;
      };
      pdf?: {
        downloadLink?: string;
      };
    };
  }>;
}

export interface OpenLibraryResponse {
  docs: Array<{
    key: string;
    title: string;
    author_name?: string[];
    first_publish_year?: number;
    language?: string[];
    publisher?: string[];
    isbn?: string[];
    cover_i?: number;
    subject?: string[];
    ebook_count_i?: number;
  }>;
}

export interface GutenbergResponse {
  results: Array<{
    id: number;
    title: string;
    authors: Array<{
      name: string;
    }>;
    languages: string[];
    subjects: string[];
    bookshelves: string[];
    download_count: number;
    formats: {
      'text/plain'?: string;
      'text/html'?: string;
      'application/epub+zip'?: string;
      'application/pdf'?: string;
    };
  }>;
}

class ExternalBookService {
  private readonly GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';
  private readonly OPEN_LIBRARY_API = 'https://openlibrary.org/search.json';
  private readonly GUTENBERG_API = 'https://gutendex.com/books';

  async searchGoogleBooks(query: string, maxResults: number = 40): Promise<ExternalBook[]> {
    try {
      const response = await axios.get<GoogleBooksResponse>(this.GOOGLE_BOOKS_API, {
        params: {
          q: query,
          maxResults,
          printType: 'books',
          filter: 'ebooks'
        }
      });

      return response.data.items.map(item => ({
        id: item.id,
        title: item.volumeInfo.title,
        author: item.volumeInfo.authors?.join(', '),
        description: item.volumeInfo.description,
        isbn: item.volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier ||
              item.volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier,
        pageCount: item.volumeInfo.pageCount,
        publishedDate: item.volumeInfo.publishedDate,
        language: item.volumeInfo.language,
        publisher: item.volumeInfo.publisher,
        imageUrl: item.volumeInfo.imageLinks?.large || 
                 item.volumeInfo.imageLinks?.medium || 
                 item.volumeInfo.imageLinks?.small || 
                 item.volumeInfo.imageLinks?.thumbnail,
        downloadUrl: item.accessInfo?.epub?.downloadLink || item.accessInfo?.pdf?.downloadLink,
        format: item.accessInfo?.epub?.downloadLink ? 'epub' : 'pdf',
        genre: item.volumeInfo.categories?.[0]
      }));
    } catch (error) {
      console.error('Помилка при пошуку в Google Books:', error);
      throw new Error('Не вдалося отримати дані з Google Books');
    }
  }

  async searchOpenLibrary(query: string, limit: number = 50): Promise<ExternalBook[]> {
    try {
      const response = await axios.get<OpenLibraryResponse>(this.OPEN_LIBRARY_API, {
        params: {
          q: query,
          limit,
          has_fulltext: true,
          format: 'json'
        }
      });

      return response.data.docs.map(doc => ({
        id: doc.key,
        title: doc.title,
        author: doc.author_name?.join(', '),
        isbn: doc.isbn?.[0],
        publishedDate: doc.first_publish_year?.toString(),
        language: doc.language?.[0],
        publisher: doc.publisher?.[0],
        imageUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : undefined,
        format: 'epub', // Open Library зазвичай має epub
        genre: doc.subject?.[0]
      }));
    } catch (error) {
      console.error('Помилка при пошуку в Open Library:', error);
      throw new Error('Не вдалося отримати дані з Open Library');
    }
  }

  async searchGutenberg(query: string, limit: number = 50): Promise<ExternalBook[]> {
    try {
      const response = await axios.get<GutenbergResponse>(this.GUTENBERG_API, {
        params: {
          search: query,
          limit
        }
      });

      return response.data.results.map(book => ({
        id: book.id.toString(),
        title: book.title,
        author: book.authors?.[0]?.name,
        language: book.languages?.[0],
        genre: book.subjects?.[0] || book.bookshelves?.[0],
        downloadUrl: book.formats['application/epub+zip'] || 
                    book.formats['application/pdf'] || 
                    book.formats['text/html'],
        format: book.formats['application/epub+zip'] ? 'epub' : 
               book.formats['application/pdf'] ? 'pdf' : 'html'
      }));
    } catch (error) {
      console.error('Помилка при пошуку в Project Gutenberg:', error);
      throw new Error('Не вдалося отримати дані з Project Gutenberg');
    }
  }

  async syncBooksFromGoogleBooks(query: string, maxResults: number = 20): Promise<{ added: number; updated: number; errors: string[] }> {
    const startTime = Date.now();
    const errors: string[] = [];
    let added = 0;
    let updated = 0;

    try {
      const books = await this.searchGoogleBooks(query, maxResults);
      
      for (const book of books) {
        try {
          const existingBook = await prisma.book.findUnique({
            where: { externalId: book.id }
          });

          if (existingBook) {
            await prisma.book.update({
              where: { id: existingBook.id },
              data: {
                title: book.title,
                author: book.author,
                description: book.description,
                isbn: book.isbn,
                pageCount: book.pageCount,
                publishedDate: book.publishedDate,
                language: book.language,
                publisher: book.publisher,
                imageUrl: book.imageUrl,
                genre: book.genre,
                lastSyncedAt: new Date()
              }
            });
            updated++;
          } else {
            await prisma.book.create({
              data: {
                title: book.title,
                author: book.author,
                format: book.format || 'epub',
                publisher: book.publisher,
                language: book.language,
                genre: book.genre,
                isPublic: true,
                imageUrl: book.imageUrl,
                externalId: book.id,
                externalSource: 'google_books',
                externalUrl: `https://books.google.com/books?id=${book.id}`,
                isbn: book.isbn,
                description: book.description,
                pageCount: book.pageCount,
                publishedDate: book.publishedDate,
                lastSyncedAt: new Date()
              }
            });
            added++;
          }
        } catch (error) {
          errors.push(`Помилка при обробці книги "${book.title}": ${error}`);
        }
      }

      const duration = Date.now() - startTime;
      await prisma.syncLog.create({
        data: {
          source: 'google_books',
          status: errors.length > 0 ? 'partial' : 'success',
          booksAdded: added,
          booksUpdated: updated,
          errors: errors.length > 0 ? errors.join('\n') : null,
          completedAt: new Date(),
          duration
        }
      });

      return { added, updated, errors };
    } catch (error) {
      const duration = Date.now() - startTime;
      await prisma.syncLog.create({
        data: {
          source: 'google_books',
          status: 'error',
          booksAdded: added,
          booksUpdated: updated,
          errors: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
          duration
        }
      });
      throw error;
    }
  }

  async syncBooksFromOpenLibrary(query: string, limit: number = 20): Promise<{ added: number; updated: number; errors: string[] }> {
    const startTime = Date.now();
    const errors: string[] = [];
    let added = 0;
    let updated = 0;

    try {
      const books = await this.searchOpenLibrary(query, limit);
      
      for (const book of books) {
        try {
          const existingBook = await prisma.book.findUnique({
            where: { externalId: book.id }
          });

          if (existingBook) {
            await prisma.book.update({
              where: { id: existingBook.id },
              data: {
                title: book.title,
                author: book.author,
                isbn: book.isbn,
                publishedDate: book.publishedDate,
                language: book.language,
                publisher: book.publisher,
                imageUrl: book.imageUrl,
                genre: book.genre,
                lastSyncedAt: new Date()
              }
            });
            updated++;
          } else {
            await prisma.book.create({
              data: {
                title: book.title,
                author: book.author,
                format: book.format || 'epub',
                publisher: book.publisher,
                language: book.language,
                genre: book.genre,
                isPublic: true,
                imageUrl: book.imageUrl,
                externalId: book.id,
                externalSource: 'open_library',
                externalUrl: `https://openlibrary.org${book.id}`,
                isbn: book.isbn,
                publishedDate: book.publishedDate,
                lastSyncedAt: new Date()
              }
            });
            added++;
          }
        } catch (error) {
          errors.push(`Помилка при обробці книги "${book.title}": ${error}`);
        }
      }

      const duration = Date.now() - startTime;
      await prisma.syncLog.create({
        data: {
          source: 'open_library',
          status: errors.length > 0 ? 'partial' : 'success',
          booksAdded: added,
          booksUpdated: updated,
          errors: errors.length > 0 ? errors.join('\n') : null,
          completedAt: new Date(),
          duration
        }
      });

      return { added, updated, errors };
    } catch (error) {
      const duration = Date.now() - startTime;
      await prisma.syncLog.create({
        data: {
          source: 'open_library',
          status: 'error',
          booksAdded: added,
          booksUpdated: updated,
          errors: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
          duration
        }
      });
      throw error;
    }
  }

  async syncBooksFromGutenberg(query: string, limit: number = 20): Promise<{ added: number; updated: number; errors: string[] }> {
    const startTime = Date.now();
    const errors: string[] = [];
    let added = 0;
    let updated = 0;

    try {
      const books = await this.searchGutenberg(query, limit);
      
      for (const book of books) {
        try {
          const existingBook = await prisma.book.findUnique({
            where: { externalId: book.id }
          });

          if (existingBook) {
            await prisma.book.update({
              where: { id: existingBook.id },
              data: {
                title: book.title,
                author: book.author,
                language: book.language,
                genre: book.genre,
                lastSyncedAt: new Date()
              }
            });
            updated++;
          } else {
            await prisma.book.create({
              data: {
                title: book.title,
                author: book.author,
                format: book.format || 'epub',
                language: book.language,
                genre: book.genre,
                isPublic: true,
                externalId: book.id,
                externalSource: 'gutenberg',
                externalUrl: `https://www.gutenberg.org/ebooks/${book.id}`,
                lastSyncedAt: new Date()
              }
            });
            added++;
          }
        } catch (error) {
          errors.push(`Помилка при обробці книги "${book.title}": ${error}`);
        }
      }

      const duration = Date.now() - startTime;
      await prisma.syncLog.create({
        data: {
          source: 'gutenberg',
          status: errors.length > 0 ? 'partial' : 'success',
          booksAdded: added,
          booksUpdated: updated,
          errors: errors.length > 0 ? errors.join('\n') : null,
          completedAt: new Date(),
          duration
        }
      });

      return { added, updated, errors };
    } catch (error) {
      const duration = Date.now() - startTime;
      await prisma.syncLog.create({
        data: {
          source: 'gutenberg',
          status: 'error',
          booksAdded: added,
          booksUpdated: updated,
          errors: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
          duration
        }
      });
      throw error;
    }
  }

  async getSyncLogs(limit: number = 50): Promise<any[]> {
    return await prisma.syncLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit
    });
  }

  async searchAllSources(query: string, limit: number = 10): Promise<{
    googleBooks: ExternalBook[];
    openLibrary: ExternalBook[];
    gutenberg: ExternalBook[];
  }> {
    const [googleBooks, openLibrary, gutenberg] = await Promise.allSettled([
      this.searchGoogleBooks(query, limit),
      this.searchOpenLibrary(query, limit),
      this.searchGutenberg(query, limit)
    ]);

    return {
      googleBooks: googleBooks.status === 'fulfilled' ? googleBooks.value : [],
      openLibrary: openLibrary.status === 'fulfilled' ? openLibrary.value : [],
      gutenberg: gutenberg.status === 'fulfilled' ? gutenberg.value : []
    };
  }
}

export default new ExternalBookService();