import axios from 'axios';

export interface GutenbergBook {
  id: number;
  title: string;
  authors: Array<{
    name: string;
    birth_year?: number;
    death_year?: number;
  }>;
  subjects: string[];
  bookshelves: string[];
  languages: string[];
  copyright: boolean;
  media_type: string;
  formats: {
    [key: string]: string;
  };
  download_count: number;
}

export interface GutenbergSearchResponse {
  count: number;
  next?: string;
  previous?: string;
  results: GutenbergBook[];
}

export class GutenbergService {
  private readonly baseUrl = 'https://gutendx.com/api';

  /**
   * Пошук книг за запитом
   */
  async searchBooks(query: string, limit: number = 20, offset: number = 0): Promise<GutenbergSearchResponse> {
    try {
      const params = new URLSearchParams({
        search: query,
        limit: limit.toString(),
        offset: offset.toString(),
      });

      const response = await axios.get(`${this.baseUrl}/books?${params}`);
      return response.data;
    } catch (error) {
      console.error('Помилка при пошуку в Project Gutenberg:', error);
      throw new Error('Не вдалося виконати пошук в Project Gutenberg');
    }
  }

  /**
   * Отримання деталей книги за ID
   */
  async getBookById(bookId: number): Promise<GutenbergBook> {
    try {
      const response = await axios.get(`${this.baseUrl}/books/${bookId}`);
      return response.data;
    } catch (error) {
      console.error('Помилка при отриманні книги з Project Gutenberg:', error);
      throw new Error('Не вдалося отримати книгу з Project Gutenberg');
    }
  }

  /**
   * Пошук книг за автором
   */
  async searchBooksByAuthor(author: string, limit: number = 20): Promise<GutenbergSearchResponse> {
    try {
      const params = new URLSearchParams({
        author: author,
        limit: limit.toString(),
      });

      const response = await axios.get(`${this.baseUrl}/books?${params}`);
      return response.data;
    } catch (error) {
      console.error('Помилка при пошуку книг за автором:', error);
      throw new Error('Не вдалося виконати пошук книг за автором');
    }
  }

  /**
   * Пошук книг за темою
   */
  async searchBooksBySubject(subject: string, limit: number = 20): Promise<GutenbergSearchResponse> {
    try {
      const params = new URLSearchParams({
        topic: subject,
        limit: limit.toString(),
      });

      const response = await axios.get(`${this.baseUrl}/books?${params}`);
      return response.data;
    } catch (error) {
      console.error('Помилка при пошуку книг за темою:', error);
      throw new Error('Не вдалося виконати пошук книг за темою');
    }
  }

  /**
   * Отримання популярних книг (за кількістю завантажень)
   */
  async getPopularBooks(limit: number = 20): Promise<GutenbergSearchResponse> {
    try {
      const params = new URLSearchParams({
        sort: 'popular',
        limit: limit.toString(),
      });

      const response = await axios.get(`${this.baseUrl}/books?${params}`);
      return response.data;
    } catch (error) {
      console.error('Помилка при отриманні популярних книг:', error);
      throw new Error('Не вдалося отримати популярні книги');
    }
  }

  /**
   * Отримання нових книг
   */
  async getRecentBooks(limit: number = 20): Promise<GutenbergSearchResponse> {
    try {
      const params = new URLSearchParams({
        sort: 'new',
        limit: limit.toString(),
      });

      const response = await axios.get(`${this.baseUrl}/books?${params}`);
      return response.data;
    } catch (error) {
      console.error('Помилка при отриманні нових книг:', error);
      throw new Error('Не вдалося отримати нові книги');
    }
  }

  /**
   * Отримання URL для завантаження книги
   */
  getDownloadUrl(book: GutenbergBook, format: 'epub' | 'pdf' | 'txt' | 'html' = 'epub'): string | null {
    if (book.formats && book.formats[`text/${format}`]) {
      return book.formats[`text/${format}`];
    }
    
    // Fallback to other formats
    if (format === 'epub' && book.formats['application/epub+zip']) {
      return book.formats['application/epub+zip'];
    }
    
    if (format === 'pdf' && book.formats['application/pdf']) {
      return book.formats['application/pdf'];
    }
    
    if (format === 'txt' && book.formats['text/plain']) {
      return book.formats['text/plain'];
    }
    
    if (format === 'html' && book.formats['text/html']) {
      return book.formats['text/html'];
    }

    return null;
  }

  /**
   * Отримання URL обкладинки
   */
  getCoverUrl(book: GutenbergBook): string | null {
    if (book.formats && book.formats['image/jpeg']) {
      return book.formats['image/jpeg'];
    }
    return null;
  }

  /**
   * Конвертація Gutenberg Book в формат ExternalBook
   */
  convertToExternalBook(book: GutenbergBook) {
    const author = book.authors && book.authors.length > 0 
      ? book.authors.map(a => a.name).join(', ') 
      : null;

    const downloadUrl = this.getDownloadUrl(book);
    const imageUrl = this.getCoverUrl(book);

    return {
      externalId: book.id.toString(),
      source: 'gutenberg',
      title: book.title,
      author: author,
      description: null, // Project Gutenberg не надає описів
      isbn: null, // Project Gutenberg не надає ISBN
      publishedDate: null, // Project Gutenberg не надає дати публікації
      publisher: 'Project Gutenberg',
      language: book.languages && book.languages.length > 0 ? book.languages[0] : null,
      pageCount: null, // Project Gutenberg не надає кількість сторінок
      categories: [...(book.subjects || []), ...(book.bookshelves || [])],
      imageUrl: imageUrl,
      downloadUrl: downloadUrl,
      previewUrl: null,
      isDownloadable: !!downloadUrl,
      isPublicDomain: true, // Всі книги Project Gutenberg є публічним доменом
    };
  }

  /**
   * Отримання статистики
   */
  async getStatistics(): Promise<{ total_books: number; total_downloads: number }> {
    try {
      const response = await axios.get(`${this.baseUrl}/stats`);
      return response.data;
    } catch (error) {
      console.error('Помилка при отриманні статистики:', error);
      throw new Error('Не вдалося отримати статистику');
    }
  }
}

export default new GutenbergService();