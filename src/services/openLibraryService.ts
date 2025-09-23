import axios from 'axios';

export interface OpenLibraryWork {
  key: string;
  title: string;
  authors?: Array<{
    author: {
      key: string;
    };
    type: {
      key: string;
    };
  }>;
  description?: string | {
    type: string;
    value: string;
  };
  subjects?: string[];
  subject_places?: string[];
  subject_times?: string[];
  subject_people?: string[];
  covers?: number[];
  first_publish_date?: string;
  publishers?: Array<{
    key: string;
  }>;
  languages?: Array<{
    key: string;
  }>;
  number_of_pages?: number;
  isbn_10?: string[];
  isbn_13?: string[];
  lccn?: string[];
  oclc?: string[];
  lcc?: string[];
  ddc?: string[];
  ia?: string[];
  ia_collection?: string[];
  lending_edition?: string;
  lending_identifier?: string;
  printdisabled_s?: string;
  public_scan_b?: boolean;
  has_fulltext?: boolean;
  ia_loaded_id?: string[];
  ia_box_id?: string[];
  lendinglibrary_s?: string;
  printdisabled_s?: string;
  cover_edition_key?: string;
  cover_i?: number;
  first_sentence?: {
    type: string;
    value: string;
  };
  publisher_facet?: string[];
  _version_?: number;
  lcc_sort?: string;
  author_facet?: string[];
  subject_facet?: string[];
  _version_?: number;
  lcc_sort?: string;
  author_facet?: string[];
  subject_facet?: string[];
  ddc_sort?: string;
}

export interface OpenLibrarySearchResponse {
  numFound: number;
  start: number;
  numFoundExact: boolean;
  docs: OpenLibraryWork[];
}

export interface OpenLibraryAuthor {
  key: string;
  name: string;
  birth_date?: string;
  death_date?: string;
  bio?: string | {
    type: string;
    value: string;
  };
  photos?: number[];
  links?: Array<{
    title: string;
    url: string;
    type: {
      key: string;
    };
  }>;
}

export class OpenLibraryService {
  private readonly baseUrl = 'https://openlibrary.org';
  private readonly searchUrl = 'https://openlibrary.org/search.json';
  private readonly worksUrl = 'https://openlibrary.org/works';

  /**
   * Пошук книг за запитом
   */
  async searchBooks(query: string, limit: number = 20, offset: number = 0): Promise<OpenLibrarySearchResponse> {
    try {
      const params = new URLSearchParams({
        q: query,
        limit: limit.toString(),
        offset: offset.toString(),
        fields: 'key,title,authors,description,subjects,first_publish_date,publishers,languages,number_of_pages,isbn_10,isbn_13,covers,ia,ia_collection,has_fulltext,public_scan_b,lending_edition,lending_identifier,cover_edition_key,cover_i,first_sentence',
      });

      const response = await axios.get(`${this.searchUrl}?${params}`);
      return response.data;
    } catch (error) {
      console.error('Помилка при пошуку в Open Library:', error);
      throw new Error('Не вдалося виконати пошук в Open Library');
    }
  }

  /**
   * Отримання деталей роботи за ключем
   */
  async getWorkByKey(workKey: string): Promise<OpenLibraryWork> {
    try {
      const response = await axios.get(`${this.worksUrl}${workKey}.json`);
      return response.data;
    } catch (error) {
      console.error('Помилка при отриманні роботи з Open Library:', error);
      throw new Error('Не вдалося отримати роботу з Open Library');
    }
  }

  /**
   * Отримання інформації про автора
   */
  async getAuthorByKey(authorKey: string): Promise<OpenLibraryAuthor> {
    try {
      const response = await axios.get(`${this.baseUrl}${authorKey}.json`);
      return response.data;
    } catch (error) {
      console.error('Помилка при отриманні автора з Open Library:', error);
      throw new Error('Не вдалося отримати автора з Open Library');
    }
  }

  /**
   * Пошук безкоштовних книг (з повним текстом)
   */
  async searchFreeBooks(query: string, limit: number = 20): Promise<OpenLibrarySearchResponse> {
    try {
      const params = new URLSearchParams({
        q: query,
        limit: limit.toString(),
        has_fulltext: 'true',
        public_scan_b: 'true',
        fields: 'key,title,authors,description,subjects,first_publish_date,publishers,languages,number_of_pages,isbn_10,isbn_13,covers,ia,ia_collection,has_fulltext,public_scan_b,lending_edition,lending_identifier,cover_edition_key,cover_i,first_sentence',
      });

      const response = await axios.get(`${this.searchUrl}?${params}`);
      return response.data;
    } catch (error) {
      console.error('Помилка при пошуку безкоштовних книг:', error);
      throw new Error('Не вдалося виконати пошук безкоштовних книг');
    }
  }

  /**
   * Пошук книг за предметом/категорією
   */
  async searchBooksBySubject(subject: string, limit: number = 20): Promise<OpenLibrarySearchResponse> {
    try {
      const params = new URLSearchParams({
        subject: subject,
        limit: limit.toString(),
        has_fulltext: 'true',
        fields: 'key,title,authors,description,subjects,first_publish_date,publishers,languages,number_of_pages,isbn_10,isbn_13,covers,ia,ia_collection,has_fulltext,public_scan_b,lending_edition,lending_identifier,cover_edition_key,cover_i,first_sentence',
      });

      const response = await axios.get(`${this.searchUrl}?${params}`);
      return response.data;
    } catch (error) {
      console.error('Помилка при пошуку книг за предметом:', error);
      throw new Error('Не вдалося виконати пошук книг за предметом');
    }
  }

  /**
   * Отримання URL для завантаження книги
   */
  getDownloadUrl(work: OpenLibraryWork): string | null {
    if (work.ia && work.ia.length > 0) {
      const identifier = work.ia[0];
      return `https://archive.org/download/${identifier}/${identifier}.pdf`;
    }
    return null;
  }

  /**
   * Отримання URL обкладинки
   */
  getCoverUrl(work: OpenLibraryWork, size: 'S' | 'M' | 'L' = 'M'): string | null {
    if (work.covers && work.covers.length > 0) {
      const coverId = work.covers[0];
      return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
    }
    return null;
  }

  /**
   * Конвертація Open Library Work в формат ExternalBook
   */
  convertToExternalBook(work: OpenLibraryWork) {
    // Визначення ISBN
    const isbn = work.isbn_13?.[0] || work.isbn_10?.[0] || null;

    // Визначення автора
    let author = null;
    if (work.authors && work.authors.length > 0) {
      // Для отримання імені автора потрібно зробити додатковий запит
      // Тут ми зберігаємо ключ автора, а ім'я отримаємо пізніше
      author = work.authors[0].author.key;
    }

    // Визначення опису
    let description = null;
    if (work.description) {
      if (typeof work.description === 'string') {
        description = work.description;
      } else if (work.description.value) {
        description = work.description.value;
      }
    }

    // Визначення мови
    let language = null;
    if (work.languages && work.languages.length > 0) {
      language = work.languages[0].key.replace('/languages/', '');
    }

    // Визначення видавництва
    let publisher = null;
    if (work.publishers && work.publishers.length > 0) {
      publisher = work.publishers[0].key.replace('/publishers/', '');
    }

    const downloadUrl = this.getDownloadUrl(work);
    const imageUrl = this.getCoverUrl(work);

    return {
      externalId: work.key.replace('/works/', ''),
      source: 'open_library',
      title: work.title,
      author: author,
      description: description,
      isbn: isbn,
      publishedDate: work.first_publish_date || null,
      publisher: publisher,
      language: language,
      pageCount: work.number_of_pages || null,
      categories: work.subjects || [],
      imageUrl: imageUrl,
      downloadUrl: downloadUrl,
      previewUrl: null,
      isDownloadable: !!downloadUrl,
      isPublicDomain: work.public_scan_b || false,
    };
  }

  /**
   * Отримання популярних книг
   */
  async getPopularBooks(limit: number = 20): Promise<OpenLibrarySearchResponse> {
    try {
      const params = new URLSearchParams({
        q: 'bestseller OR popular OR classic',
        limit: limit.toString(),
        has_fulltext: 'true',
        sort: 'new',
        fields: 'key,title,authors,description,subjects,first_publish_date,publishers,languages,number_of_pages,isbn_10,isbn_13,covers,ia,ia_collection,has_fulltext,public_scan_b,lending_edition,lending_identifier,cover_edition_key,cover_i,first_sentence',
      });

      const response = await axios.get(`${this.searchUrl}?${params}`);
      return response.data;
    } catch (error) {
      console.error('Помилка при отриманні популярних книг:', error);
      throw new Error('Не вдалося отримати популярні книги');
    }
  }
}

export default new OpenLibraryService();