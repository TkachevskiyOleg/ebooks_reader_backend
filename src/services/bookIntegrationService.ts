import axios from 'axios';
import * as cheerio from 'cheerio';
import prisma from '../prisma';
import fs from 'fs/promises';
import path from 'path';
import { STORAGE_PATH } from '../config';

export interface ExternalBookSource {
  id: string;
  title: string;
  author?: string;
  description?: string;
  publisher?: string;
  publishedDate?: string;
  language?: string;
  genre?: string;
  isbn?: string;
  pageCount?: number;
  imageUrl?: string;
  downloadUrl?: string;
  format?: string;
  source: 'google_books' | 'open_library' | 'project_gutenberg' | 'internet_archive';
}

class BookIntegrationService {
  private static readonly GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';
  private static readonly OPEN_LIBRARY_API = 'https://openlibrary.org';
  private static readonly PROJECT_GUTENBERG_API = 'https://www.gutenberg.org';
  private static readonly INTERNET_ARCHIVE_API = 'https://archive.org';

  // Google Books API Integration
  static async searchGoogleBooks(query: string, maxResults: number = 20): Promise<ExternalBookSource[]> {
    try {
      const response = await axios.get(`${this.GOOGLE_BOOKS_API}`, {
        params: {
          q: query,
          maxResults,
          key: process.env.GOOGLE_BOOKS_API_KEY // Optional API key for higher limits
        }
      });

      const books: ExternalBookSource[] = [];
      
      if (response.data.items) {
        for (const item of response.data.items) {
          const volumeInfo = item.volumeInfo;
          const accessInfo = item.accessInfo;
          
          books.push({
            id: item.id,
            title: volumeInfo.title || 'Невідома назва',
            author: volumeInfo.authors?.join(', '),
            description: volumeInfo.description,
            publisher: volumeInfo.publisher,
            publishedDate: volumeInfo.publishedDate,
            language: volumeInfo.language,
            genre: volumeInfo.categories?.join(', '),
            isbn: volumeInfo.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier,
            pageCount: volumeInfo.pageCount,
            imageUrl: volumeInfo.imageLinks?.large || volumeInfo.imageLinks?.medium || volumeInfo.imageLinks?.thumbnail,
            downloadUrl: accessInfo.epub?.downloadLink || accessInfo.pdf?.downloadLink,
            format: accessInfo.epub?.isAvailable ? 'epub' : accessInfo.pdf?.isAvailable ? 'pdf' : undefined,
            source: 'google_books'
          });
        }
      }
      
      return books;
    } catch (error) {
      console.error('Помилка при пошуку в Google Books:', error);
      return [];
    }
  }

  // Open Library API Integration
  static async searchOpenLibrary(query: string, limit: number = 20): Promise<ExternalBookSource[]> {
    try {
      const response = await axios.get(`${this.OPEN_LIBRARY_API}/search.json`, {
        params: {
          q: query,
          limit,
          fields: 'key,title,author_name,publisher,publish_date,language,subject,isbn,number_of_pages,cover_i'
        }
      });

      const books: ExternalBookSource[] = [];
      
      if (response.data.docs) {
        for (const doc of response.data.docs) {
          books.push({
            id: doc.key,
            title: doc.title || 'Невідома назва',
            author: doc.author_name?.join(', '),
            publisher: doc.publisher?.[0],
            publishedDate: doc.publish_date?.[0],
            language: doc.language?.[0],
            genre: doc.subject?.slice(0, 3).join(', '), // First 3 subjects as genre
            isbn: doc.isbn?.[0],
            pageCount: doc.number_of_pages,
            imageUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : undefined,
            source: 'open_library'
          });
        }
      }
      
      return books;
    } catch (error) {
      console.error('Помилка при пошуку в Open Library:', error);
      return [];
    }
  }

  // Project Gutenberg Integration (Free public domain books)
  static async searchProjectGutenberg(query: string = '', limit: number = 20): Promise<ExternalBookSource[]> {
    try {
      // Project Gutenberg catalog search
      const response = await axios.get(`${this.PROJECT_GUTENBERG_API}/ebooks/search/?format=json`, {
        params: {
          search_type: 'title',
          query: query || 'popular',
          sort_order: 'downloads'
        }
      });

      const books: ExternalBookSource[] = [];
      
      if (response.data?.results) {
        const results = response.data.results.slice(0, limit);
        
        for (const book of results) {
          const formats = book.formats || {};
          const downloadUrl = formats['application/epub+zip'] || formats['application/pdf'] || formats['text/plain'];
          const format = formats['application/epub+zip'] ? 'epub' : formats['application/pdf'] ? 'pdf' : 'txt';
          
          books.push({
            id: `gutenberg_${book.id}`,
            title: book.title || 'Невідома назва',
            author: book.authors?.map((a: any) => a.name).join(', '),
            language: book.languages?.[0],
            genre: book.subjects?.slice(0, 2).join(', '),
            downloadUrl,
            format,
            imageUrl: book.formats?.['image/jpeg'], // Cover image if available
            source: 'project_gutenberg'
          });
        }
      }
      
      return books;
    } catch (error) {
      console.error('Помилка при пошуку в Project Gutenberg:', error);
      // Fallback to popular books list
      return this.getPopularGutenbergBooks(limit);
    }
  }

  // Get popular Project Gutenberg books as fallback
  private static async getPopularGutenbergBooks(limit: number): Promise<ExternalBookSource[]> {
    const popularBooks = [
      { id: '1342', title: 'Pride and Prejudice', author: 'Jane Austen' },
      { id: '11', title: 'Alice\'s Adventures in Wonderland', author: 'Lewis Carroll' },
      { id: '84', title: 'Frankenstein', author: 'Mary Wollstonecraft Shelley' },
      { id: '1661', title: 'The Adventures of Sherlock Holmes', author: 'Arthur Conan Doyle' },
      { id: '74', title: 'The Adventures of Tom Sawyer', author: 'Mark Twain' },
      { id: '1080', title: 'A Modest Proposal', author: 'Jonathan Swift' },
      { id: '345', title: 'Dracula', author: 'Bram Stoker' },
      { id: '2701', title: 'Moby Dick', author: 'Herman Melville' }
    ];

    return popularBooks.slice(0, limit).map(book => ({
      id: `gutenberg_${book.id}`,
      title: book.title,
      author: book.author,
      language: 'en',
      downloadUrl: `${this.PROJECT_GUTENBERG_API}/files/${book.id}/${book.id}-0.txt`,
      format: 'txt',
      source: 'project_gutenberg' as const
    }));
  }

  // Internet Archive Integration
  static async searchInternetArchive(query: string, limit: number = 20): Promise<ExternalBookSource[]> {
    try {
      const response = await axios.get(`${this.INTERNET_ARCHIVE_API}/advancedsearch.php`, {
        params: {
          q: `title:(${query}) AND mediatype:texts AND format:pdf`,
          fl: 'identifier,title,creator,date,publisher,language,subject,description',
          rows: limit,
          page: 1,
          output: 'json'
        }
      });

      const books: ExternalBookSource[] = [];
      
      if (response.data?.response?.docs) {
        for (const doc of response.data.response.docs) {
          books.push({
            id: `archive_${doc.identifier}`,
            title: doc.title || 'Невідома назва',
            author: Array.isArray(doc.creator) ? doc.creator.join(', ') : doc.creator,
            description: doc.description,
            publisher: doc.publisher,
            publishedDate: doc.date,
            language: doc.language,
            genre: Array.isArray(doc.subject) ? doc.subject.slice(0, 3).join(', ') : doc.subject,
            downloadUrl: `${this.INTERNET_ARCHIVE_API}/download/${doc.identifier}/${doc.identifier}.pdf`,
            format: 'pdf',
            source: 'internet_archive'
          });
        }
      }
      
      return books;
    } catch (error) {
      console.error('Помилка при пошуку в Internet Archive:', error);
      return [];
    }
  }

  // Combined search across all services
  static async searchAllSources(query: string, maxPerSource: number = 10): Promise<ExternalBookSource[]> {
    console.log(`Пошук книг за запитом: "${query}"`);
    
    const [googleBooks, openLibraryBooks, gutenbergBooks, archiveBooks] = await Promise.all([
      this.searchGoogleBooks(query, maxPerSource),
      this.searchOpenLibrary(query, maxPerSource),
      this.searchProjectGutenberg(query, maxPerSource),
      this.searchInternetArchive(query, maxPerSource)
    ]);

    const allBooks = [...googleBooks, ...openLibraryBooks, ...gutenbergBooks, ...archiveBooks];
    
    // Remove duplicates based on title and author similarity
    const uniqueBooks = this.removeDuplicateBooks(allBooks);
    
    console.log(`Знайдено ${uniqueBooks.length} унікальних книг з ${allBooks.length} загальних результатів`);
    
    return uniqueBooks;
  }

  // Remove duplicate books based on title and author similarity
  private static removeDuplicateBooks(books: ExternalBookSource[]): ExternalBookSource[] {
    const unique: ExternalBookSource[] = [];
    
    for (const book of books) {
      const isDuplicate = unique.some(existing => {
        const titleSimilar = this.calculateSimilarity(
          book.title.toLowerCase(),
          existing.title.toLowerCase()
        ) > 0.8;
        
        const authorSimilar = book.author && existing.author ? 
          this.calculateSimilarity(
            book.author.toLowerCase(),
            existing.author.toLowerCase()
          ) > 0.8 : false;
        
        return titleSimilar && (authorSimilar || (!book.author && !existing.author));
      });
      
      if (!isDuplicate) {
        unique.push(book);
      }
    }
    
    return unique;
  }

  // Simple string similarity calculation
  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  // Levenshtein distance calculation
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // Download and import a book from external source
  static async importExternalBook(
    externalBook: ExternalBookSource, 
    userId?: number,
    isPublic: boolean = false
  ): Promise<any> {
    try {
      if (!externalBook.downloadUrl) {
        throw new Error('URL для завантаження не знайдено');
      }

      console.log(`Імпорт книги: ${externalBook.title} з ${externalBook.source}`);
      
      // Download the book file
      const response = await axios.get(externalBook.downloadUrl, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 second timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BookReader/1.0)'
        }
      });

      // Generate filename
      const sanitizedTitle = externalBook.title.replace(/[^a-zA-Z0-9\u0400-\u04FF\s]/g, '').substring(0, 50);
      const extension = externalBook.format || 'txt';
      const filename = `${sanitizedTitle}_${Date.now()}.${extension}`;
      const filePath = path.join(STORAGE_PATH, filename);

      // Save file
      await fs.writeFile(filePath, response.data);

      // Create book record in database
      const book = await prisma.book.create({
        data: {
          title: externalBook.title,
          author: externalBook.author || 'Невідомий автор',
          format: externalBook.format || 'txt',
          publisher: externalBook.publisher,
          language: externalBook.language || 'en',
          genre: externalBook.genre,
          filePath: `/uploads/${filename}`,
          storagePath: filePath,
          originalFilePath: externalBook.downloadUrl,
          userId: userId,
          isPublic: isPublic,
          imageUrl: externalBook.imageUrl
        }
      });

      console.log(`Книга успішно імпортована: ${book.id}`);
      return book;
    } catch (error) {
      console.error(`Помилка при імпорті книги "${externalBook.title}":`, error);
      throw error;
    }
  }

  // Enhance existing book metadata using external APIs
  static async enhanceBookMetadata(bookId: number): Promise<any> {
    try {
      const book = await prisma.book.findUnique({ where: { id: bookId } });
      if (!book) {
        throw new Error('Книгу не знайдено');
      }

      console.log(`Покращення метаданих для книги: ${book.title}`);

      // Search for additional metadata
      const searchQuery = `${book.title} ${book.author || ''}`.trim();
      const externalBooks = await this.searchAllSources(searchQuery, 5);

      // Find the best match
      const bestMatch = externalBooks.find(extBook => 
        this.calculateSimilarity(extBook.title.toLowerCase(), book.title.toLowerCase()) > 0.7
      );

      if (bestMatch) {
        // Update book with enhanced metadata
        const updatedBook = await prisma.book.update({
          where: { id: bookId },
          data: {
            author: book.author || bestMatch.author,
            publisher: book.publisher || bestMatch.publisher,
            language: book.language || bestMatch.language,
            genre: book.genre || bestMatch.genre,
            imageUrl: book.imageUrl || bestMatch.imageUrl
          }
        });

        console.log(`Метадані оновлено для книги: ${updatedBook.title}`);
        return updatedBook;
      }

      return book;
    } catch (error) {
      console.error(`Помилка при покращенні метаданих для книги ${bookId}:`, error);
      throw error;
    }
  }

  // Get trending/popular books from all sources
  static async getTrendingBooks(limit: number = 50): Promise<ExternalBookSource[]> {
    console.log('Отримання популярних книг з усіх джерел...');
    
    const trendingQueries = [
      'bestseller 2024',
      'popular fiction',
      'classic literature',
      'science fiction',
      'fantasy novels',
      'mystery thriller',
      'romance novels',
      'non-fiction popular'
    ];

    const allTrendingBooks: ExternalBookSource[] = [];

    for (const query of trendingQueries.slice(0, 4)) { // Limit queries to avoid rate limits
      const books = await this.searchAllSources(query, Math.ceil(limit / 4));
      allTrendingBooks.push(...books);
    }

    // Remove duplicates and return limited results
    const uniqueBooks = this.removeDuplicateBooks(allTrendingBooks);
    return uniqueBooks.slice(0, limit);
  }
}

export default BookIntegrationService;