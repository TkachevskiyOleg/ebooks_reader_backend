# Приклади використання API зовнішніх книг

## 1. Пошук книг

### Пошук по всіх джерелах
```bash
curl -X GET "http://localhost:3000/api/external-books/search?query=javascript" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Пошук тільки в Google Books
```bash
curl -X GET "http://localhost:3000/api/external-books/search?query=programming&source=google_books&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Пошук безкоштовних книг
```bash
curl -X GET "http://localhost:3000/api/external-books/free?query=classic literature&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 2. Отримання популярних книг

```bash
curl -X GET "http://localhost:3000/api/external-books/popular?limit=15" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 3. Імпорт книги

### Імпорт з Google Books
```bash
curl -X POST "http://localhost:3000/api/external-books/import" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "book_id_from_google_books",
    "source": "google_books"
  }'
```

### Імпорт з Open Library
```bash
curl -X POST "http://localhost:3000/api/external-books/import" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "OL1234567W",
    "source": "open_library"
  }'
```

### Імпорт з Project Gutenberg
```bash
curl -X POST "http://localhost:3000/api/external-books/import" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "12345",
    "source": "gutenberg"
  }'
```

## 4. Перегляд імпортованих книг

```bash
curl -X GET "http://localhost:3000/api/external-books/imported?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 5. Оновлення метаданих

### Оновлення всіх джерел
```bash
curl -X POST "http://localhost:3000/api/external-books/update-metadata?limit=100" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Оновлення тільки Google Books
```bash
curl -X POST "http://localhost:3000/api/external-books/update-metadata?source=google_books&limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 6. Управління планувальником (тільки для адміністраторів)

### Перегляд статусу завдань
```bash
curl -X GET "http://localhost:3000/api/scheduler/status" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Ручний запуск оновлення метаданих
```bash
curl -X POST "http://localhost:3000/api/scheduler/run/update-metadata" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Ручний запуск отримання популярних книг
```bash
curl -X POST "http://localhost:3000/api/scheduler/run/fetch-popular-books" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Ручний запуск очищення старих записів
```bash
curl -X POST "http://localhost:3000/api/scheduler/run/cleanup-old-records" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Ручний запуск синхронізації з Gutenberg
```bash
curl -X POST "http://localhost:3000/api/scheduler/run/sync-gutenberg" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Статистика планувальника
```bash
curl -X GET "http://localhost:3000/api/scheduler/stats" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

## 7. Управління логами (тільки для адміністраторів)

### Перегляд логів помилок
```bash
curl -X GET "http://localhost:3000/api/logs?level=ERROR&limit=50" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Перегляд всіх логів
```bash
curl -X GET "http://localhost:3000/api/logs?limit=100" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Статистика логів
```bash
curl -X GET "http://localhost:3000/api/logs/stats" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Очищення старих логів
```bash
curl -X POST "http://localhost:3000/api/logs/cleanup" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "daysToKeep": 30
  }'
```

## JavaScript/TypeScript приклади

### Пошук та імпорт книги
```javascript
const searchAndImportBook = async (query, source = null) => {
  try {
    // Пошук книг
    const searchResponse = await fetch(`/api/external-books/search?query=${encodeURIComponent(query)}${source ? `&source=${source}` : ''}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    const searchResults = await searchResponse.json();
    
    if (searchResults.total > 0) {
      // Вибір першої книги для імпорту
      const firstBook = searchResults.google_books[0] || 
                       searchResults.open_library[0] || 
                       searchResults.gutenberg[0];
      
      if (firstBook) {
        // Імпорт книги
        const importResponse = await fetch('/api/external-books/import', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            externalId: firstBook.externalId,
            source: firstBook.source
          })
        });
        
        const importedBook = await importResponse.json();
        console.log('Книга імпортована:', importedBook);
        return importedBook;
      }
    }
  } catch (error) {
    console.error('Помилка пошуку або імпорту:', error);
  }
};

// Використання
searchAndImportBook('JavaScript programming');
```

### Отримання популярних книг
```javascript
const getPopularBooks = async () => {
  try {
    const response = await fetch('/api/external-books/popular?limit=20', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    const popularBooks = await response.json();
    
    // Відображення популярних книг
    popularBooks.google_books.forEach(book => {
      console.log(`Google Books: ${book.title} by ${book.author}`);
    });
    
    popularBooks.open_library.forEach(book => {
      console.log(`Open Library: ${book.title} by ${book.author}`);
    });
    
    popularBooks.gutenberg.forEach(book => {
      console.log(`Gutenberg: ${book.title} by ${book.author}`);
    });
    
    return popularBooks;
  } catch (error) {
    console.error('Помилка отримання популярних книг:', error);
  }
};
```

### Моніторинг логів
```javascript
const monitorLogs = async () => {
  try {
    const response = await fetch('/api/logs/stats', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      }
    });
    
    const stats = await response.json();
    
    console.log('Статистика логів:');
    console.log(`Помилки за 24 години: ${stats.last24Hours.errors}`);
    console.log(`API запити за 24 години: ${stats.last24Hours.apiRequests}`);
    
    if (stats.recentErrors.length > 0) {
      console.log('Останні помилки:');
      stats.recentErrors.forEach(error => {
        console.log(`[${error.timestamp}] ${error.message}`);
      });
    }
    
    return stats;
  } catch (error) {
    console.error('Помилка отримання статистики логів:', error);
  }
};
```

## React компонент приклад

```jsx
import React, { useState, useEffect } from 'react';

const ExternalBooksSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const searchBooks = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/external-books/search?query=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Помилка пошуку:', error);
    } finally {
      setLoading(false);
    }
  };

  const importBook = async (externalId, source) => {
    try {
      const response = await fetch('/api/external-books/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ externalId, source })
      });
      
      const importedBook = await response.json();
      alert(`Книга "${importedBook.title}" успішно імпортована!`);
    } catch (error) {
      console.error('Помилка імпорту:', error);
      alert('Помилка імпорту книги');
    }
  };

  return (
    <div>
      <div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Пошук книг..."
        />
        <button onClick={searchBooks} disabled={loading}>
          {loading ? 'Пошук...' : 'Пошук'}
        </button>
      </div>

      {results && (
        <div>
          <h3>Результати пошуку ({results.total} знайдено)</h3>
          
          {results.google_books.length > 0 && (
            <div>
              <h4>Google Books ({results.google_books.length})</h4>
              {results.google_books.map(book => (
                <div key={book.externalId} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
                  <h5>{book.title}</h5>
                  <p>Автор: {book.author}</p>
                  <p>Джерело: {book.source}</p>
                  {book.isDownloadable && (
                    <button onClick={() => importBook(book.externalId, book.source)}>
                      Імпортувати
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {results.open_library.length > 0 && (
            <div>
              <h4>Open Library ({results.open_library.length})</h4>
              {results.open_library.map(book => (
                <div key={book.externalId} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
                  <h5>{book.title}</h5>
                  <p>Автор: {book.author}</p>
                  <p>Джерело: {book.source}</p>
                  {book.isDownloadable && (
                    <button onClick={() => importBook(book.externalId, book.source)}>
                      Імпортувати
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {results.gutenberg.length > 0 && (
            <div>
              <h4>Project Gutenberg ({results.gutenberg.length})</h4>
              {results.gutenberg.map(book => (
                <div key={book.externalId} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
                  <h5>{book.title}</h5>
                  <p>Автор: {book.author}</p>
                  <p>Джерело: {book.source}</p>
                  {book.isDownloadable && (
                    <button onClick={() => importBook(book.externalId, book.source)}>
                      Імпортувати
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExternalBooksSearch;
```

## Python приклад

```python
import requests
import json

class ExternalBooksClient:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def search_books(self, query, source=None, limit=20):
        params = {'query': query, 'limit': limit}
        if source:
            params['source'] = source
        
        response = requests.get(
            f'{self.base_url}/api/external-books/search',
            headers=self.headers,
            params=params
        )
        return response.json()
    
    def search_free_books(self, query, limit=20):
        params = {'query': query, 'limit': limit}
        response = requests.get(
            f'{self.base_url}/api/external-books/free',
            headers=self.headers,
            params=params
        )
        return response.json()
    
    def get_popular_books(self, limit=20):
        params = {'limit': limit}
        response = requests.get(
            f'{self.base_url}/api/external-books/popular',
            headers=self.headers,
            params=params
        )
        return response.json()
    
    def import_book(self, external_id, source):
        data = {
            'externalId': external_id,
            'source': source
        }
        response = requests.post(
            f'{self.base_url}/api/external-books/import',
            headers=self.headers,
            json=data
        )
        return response.json()
    
    def get_imported_books(self, page=1, limit=20):
        params = {'page': page, 'limit': limit}
        response = requests.get(
            f'{self.base_url}/api/external-books/imported',
            headers=self.headers,
            params=params
        )
        return response.json()

# Використання
client = ExternalBooksClient('http://localhost:3000', 'your-jwt-token')

# Пошук книг
results = client.search_books('python programming')
print(f"Знайдено {results['total']} книг")

# Імпорт першої знайденої книги
if results['google_books']:
    book = results['google_books'][0]
    imported = client.import_book(book['externalId'], book['source'])
    print(f"Імпортовано: {imported['title']}")
```