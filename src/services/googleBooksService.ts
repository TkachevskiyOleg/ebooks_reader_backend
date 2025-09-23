import axios from 'axios';
import loggerService from './loggerService';

export interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
    publishedDate?: string;
    publisher?: string;
    language?: string;
    pageCount?: number;
    categories?: string[];
    imageLinks?: {
      thumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
    };
    previewLink?: string;
    infoLink?: string;
  };
  accessInfo?: {
    epub?: {
      downloadLink?: string;
      isAvailable?: boolean;
    };
    pdf?: {
      downloadLink?: string;
      isAvailable?: boolean;
    };
    webReaderLink?: string;
  };
}

export interface GoogleBooksSearchResponse {
  kind: string;
  totalItems: number;
  items?: GoogleBooksVolume[];
}

export class GoogleBooksService {
  private readonly baseUrl = 'https://www.googleapis.com/books/v1/volumes';
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_BOOKS_API_KEY || '';
  }

  /**
   * Пошук книг за запитом
   */
  async searchBooks(query: string, maxResults: number = 20, startIndex: number = 0): Promise<GoogleBooksSearchResponse> {
    const startTime = Date.now();
    try {
      const params = new URLSearchParams({
        q: query,
        maxResults: maxResults.toString(),
        startIndex: startIndex.toString(),
        printType: 'books',
        filter: 'ebooks', // Тільки електронні книги
      });

      if (this.apiKey) {
        params.append('key', this.apiKey);
      }

      const response = await axios.get(`${this.baseUrl}?${params}`);
      const responseTime = Date.now() - startTime;
      
      await loggerService.logExternalApiRequest(
        'google_books',
        'search',
        response.status,
        responseTime,
        undefined
      );
      
      return response.data;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      await loggerService.logExternalApiRequest(
        'google_books',
        'search',
        error.response?.status || 500,
        responseTime,
        error
      );
      throw new Error('Не вдалося виконати пошук в Google Books');
    }
  }

  /**
   * Отримання деталей книги за ID
   */
  async getBookById(bookId: string): Promise<GoogleBooksVolume> {
    try {
      const params = new URLSearchParams();
      if (this.apiKey) {
        params.append('key', this.apiKey);
      }

      const response = await axios.get(`${this.baseUrl}/${bookId}?${params}`);
      return response.data;
    } catch (error) {
      console.error('Помилка при отриманні книги з Google Books:', error);
      throw new Error('Не вдалося отримати книгу з Google Books');
    }
  }

  /**
   * Пошук безкоштовних книг
   */
  async searchFreeBooks(query: string, maxResults: number = 20): Promise<GoogleBooksSearchResponse> {
    try {
      const params = new URLSearchParams({
        q: `${query} +free`,
        maxResults: maxResults.toString(),
        printType: 'books',
        filter: 'ebooks',
        download: 'epub', // Тільки книги з можливістю завантаження
      });

      if (this.apiKey) {
        params.append('key', this.apiKey);
      }

      const response = await axios.get(`${this.baseUrl}?${params}`);
      return response.data;
    } catch (error) {
      console.error('Помилка при пошуку безкоштовних книг:', error);
      throw new Error('Не вдалося виконати пошук безкоштовних книг');
    }
  }

  /**
   * Пошук книг за категорією
   */
  async searchBooksByCategory(category: string, maxResults: number = 20): Promise<GoogleBooksSearchResponse> {
    try {
      const params = new URLSearchParams({
        q: `subject:${category}`,
        maxResults: maxResults.toString(),
        printType: 'books',
        filter: 'ebooks',
      });

      if (this.apiKey) {
        params.append('key', this.apiKey);
      }

      const response = await axios.get(`${this.baseUrl}?${params}`);
      return response.data;
    } catch (error) {
      console.error('Помилка при пошуку книг за категорією:', error);
      throw new Error('Не вдалося виконати пошук книг за категорією');
    }
  }

  /**
   * Конвертація Google Books Volume в формат ExternalBook
   */
  convertToExternalBook(volume: GoogleBooksVolume) {
    const volumeInfo = volume.volumeInfo;
    const accessInfo = volume.accessInfo;

    // Визначення ISBN
    const isbn = volumeInfo.industryIdentifiers?.find(
      id => id.type === 'ISBN_13' || id.type === 'ISBN_10'
    )?.identifier;

    // Визначення URL для завантаження
    let downloadUrl = null;
    let isDownloadable = false;

    if (accessInfo?.epub?.isAvailable && accessInfo.epub.downloadLink) {
      downloadUrl = accessInfo.epub.downloadLink;
      isDownloadable = true;
    } else if (accessInfo?.pdf?.isAvailable && accessInfo.pdf.downloadLink) {
      downloadUrl = accessInfo.pdf.downloadLink;
      isDownloadable = true;
    }

    // Визначення URL обкладинки
    let imageUrl = null;
    if (volumeInfo.imageLinks) {
      imageUrl = volumeInfo.imageLinks.large || 
                volumeInfo.imageLinks.medium || 
                volumeInfo.imageLinks.small || 
                volumeInfo.imageLinks.thumbnail;
    }

    return {
      externalId: volume.id,
      source: 'google_books',
      title: volumeInfo.title,
      author: volumeInfo.authors?.join(', ') || null,
      description: volumeInfo.description || null,
      isbn: isbn || null,
      publishedDate: volumeInfo.publishedDate || null,
      publisher: volumeInfo.publisher || null,
      language: volumeInfo.language || null,
      pageCount: volumeInfo.pageCount || null,
      categories: volumeInfo.categories || [],
      imageUrl: imageUrl || null,
      downloadUrl: downloadUrl,
      previewUrl: volumeInfo.previewLink || null,
      isDownloadable: isDownloadable,
      isPublicDomain: false, // Google Books не надає інформацію про публічний домен
    };
  }

  /**
   * Отримання популярних книг
   */
  async getPopularBooks(maxResults: number = 20): Promise<GoogleBooksSearchResponse> {
    try {
      const params = new URLSearchParams({
        q: 'bestseller OR popular OR trending',
        maxResults: maxResults.toString(),
        printType: 'books',
        filter: 'ebooks',
        orderBy: 'relevance',
      });

      if (this.apiKey) {
        params.append('key', this.apiKey);
      }

      const response = await axios.get(`${this.baseUrl}?${params}`);
      return response.data;
    } catch (error) {
      console.error('Помилка при отриманні популярних книг:', error);
      throw new Error('Не вдалося отримати популярні книги');
    }
  }
}

export default new GoogleBooksService();