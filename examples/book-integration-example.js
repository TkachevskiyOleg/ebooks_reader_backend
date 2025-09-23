/**
 * Приклад використання API інтеграції зовнішніх книг
 * 
 * Цей скрипт демонструє:
 * 1. Пошук книг у зовнішніх джерелах
 * 2. Імпорт знайденої книги
 * 3. Покращення метаданих існуючої книги
 * 4. Отримання популярних книг
 */

const BASE_URL = 'http://localhost:4000/api';
let authToken = ''; // Отримайте токен після авторизації

// Функція для виконання HTTP запитів
async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error || 'Unknown error'}`);
    }
    
    return data;
  } catch (error) {
    console.error(`API Error for ${endpoint}:`, error.message);
    throw error;
  }
}

// 1. Авторизація користувача
async function login(email, password) {
  console.log('🔐 Авторизація користувача...');
  
  const response = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  
  authToken = response.token;
  console.log('✅ Авторизація успішна');
  return response;
}

// 2. Пошук книг у всіх зовнішніх джерелах
async function searchAllSources(query, maxPerSource = 5) {
  console.log(`🔍 Пошук книг за запитом: "${query}"`);
  
  const response = await apiRequest(`/external-books/search?query=${encodeURIComponent(query)}&maxPerSource=${maxPerSource}`);
  
  console.log(`📚 Знайдено ${response.totalResults} книг з усіх джерел:`);
  response.books.forEach((book, index) => {
    console.log(`${index + 1}. "${book.title}" - ${book.author || 'Невідомий автор'} (${book.source})`);
    if (book.canImport) {
      console.log(`   ✅ Можна імпортувати: ${book.format}`);
    }
  });
  
  return response;
}

// 3. Пошук у конкретному джерелі
async function searchSpecificSource(source, query, limit = 10) {
  console.log(`🔍 Пошук у ${source} за запитом: "${query}"`);
  
  const response = await apiRequest(`/external-books/search/${source}?query=${encodeURIComponent(query)}&limit=${limit}`);
  
  console.log(`📚 Знайдено ${response.totalResults} книг в ${source}:`);
  response.books.slice(0, 5).forEach((book, index) => {
    console.log(`${index + 1}. "${book.title}" - ${book.author || 'Невідомий автор'}`);
  });
  
  return response;
}

// 4. Імпорт зовнішньої книги
async function importExternalBook(externalBook, isPublic = false) {
  console.log(`📥 Імпорт книги: "${externalBook.title}"`);
  
  if (!externalBook.downloadUrl) {
    console.log('❌ Книга не має URL для завантаження');
    return null;
  }
  
  try {
    const response = await apiRequest('/external-books/import', {
      method: 'POST',
      body: JSON.stringify({
        externalBook,
        isPublic
      })
    });
    
    console.log(`✅ Книга успішно імпортована: ID ${response.book.id}`);
    return response.book;
  } catch (error) {
    if (error.message.includes('409')) {
      console.log('⚠️ Книга вже існує в бібліотеці');
    } else {
      console.log(`❌ Помилка імпорту: ${error.message}`);
    }
    return null;
  }
}

// 5. Покращення метаданих книги
async function enhanceBookMetadata(bookId) {
  console.log(`🔧 Покращення метаданих книги ID: ${bookId}`);
  
  try {
    const response = await apiRequest(`/external-books/enhance/${bookId}`, {
      method: 'POST'
    });
    
    console.log('✅ Метадані успішно покращено');
    return response.book;
  } catch (error) {
    console.log(`❌ Помилка покращення метаданих: ${error.message}`);
    return null;
  }
}

// 6. Отримання популярних книг
async function getTrendingBooks(limit = 20) {
  console.log('🔥 Отримання популярних книг...');
  
  const response = await apiRequest(`/external-books/trending?limit=${limit}`);
  
  console.log(`📈 Топ ${Math.min(10, response.books.length)} популярних книг:`);
  response.books.slice(0, 10).forEach((book, index) => {
    console.log(`${index + 1}. "${book.title}" - ${book.author || 'Невідомий автор'} (${book.source})`);
  });
  
  return response;
}

// 7. Масове покращення метаданих
async function bulkEnhanceMetadata(bookIds = null, enhanceAll = false) {
  console.log('🔧 Масове покращення метаданих...');
  
  const response = await apiRequest('/external-books/bulk-enhance', {
    method: 'POST',
    body: JSON.stringify({
      bookIds,
      enhanceAll
    })
  });
  
  console.log(`✅ Результати покращення:`);
  console.log(`   📊 Всього книг: ${response.results.total}`);
  console.log(`   ✅ Покращено: ${response.results.enhanced}`);
  console.log(`   ❌ Помилок: ${response.results.failed}`);
  
  if (response.results.errors.length > 0) {
    console.log('   🚨 Помилки:');
    response.results.errors.slice(0, 5).forEach(error => {
      console.log(`     - ${error}`);
    });
  }
  
  return response;
}

// 8. Отримання статистики синхронізації (тільки для адміністраторів)
async function getSyncLogs(page = 1, limit = 10) {
  console.log('📊 Отримання логів синхронізації...');
  
  try {
    const response = await apiRequest(`/external-books/sync-logs?page=${page}&limit=${limit}`);
    
    console.log(`📋 Останні ${response.logs.length} операцій синхронізації:`);
    response.logs.forEach(log => {
      const status = log.status === 'success' ? '✅' : log.status === 'partial' ? '⚠️' : '❌';
      console.log(`${status} ${log.operation} (${log.source}) - ${log.successCount}/${log.resultCount} успішно`);
    });
    
    return response;
  } catch (error) {
    console.log(`❌ Помилка отримання логів: ${error.message}`);
    return null;
  }
}

// Головна демонстраційна функція
async function demonstrateBookIntegration() {
  try {
    console.log('🚀 Демонстрація інтеграції зовнішніх книг\n');
    
    // Авторизація (замініть на реальні дані)
    await login('demo@example.com', 'password123');
    console.log();
    
    // 1. Пошук книг у всіх джерелах
    const searchResults = await searchAllSources('JavaScript programming', 3);
    console.log();
    
    // 2. Пошук у конкретному джерелі
    await searchSpecificSource('project_gutenberg', 'science fiction', 5);
    console.log();
    
    // 3. Імпорт першої доступної книги
    const importableBook = searchResults.books.find(book => book.canImport);
    if (importableBook) {
      const importedBook = await importExternalBook(importableBook, true);
      console.log();
      
      // 4. Покращення метаданих імпортованої книги
      if (importedBook) {
        await enhanceBookMetadata(importedBook.id);
        console.log();
      }
    }
    
    // 5. Отримання популярних книг
    await getTrendingBooks(15);
    console.log();
    
    // 6. Масове покращення метаданих (обмежена кількість)
    await bulkEnhanceMetadata(null, false);
    console.log();
    
    // 7. Перегляд логів синхронізації
    await getSyncLogs(1, 5);
    
    console.log('\n✅ Демонстрація завершена успішно!');
    
  } catch (error) {
    console.error('\n❌ Помилка під час демонстрації:', error.message);
  }
}

// Експорт функцій для використання в інших скриптах
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    apiRequest,
    login,
    searchAllSources,
    searchSpecificSource,
    importExternalBook,
    enhanceBookMetadata,
    getTrendingBooks,
    bulkEnhanceMetadata,
    getSyncLogs,
    demonstrateBookIntegration
  };
}

// Запуск демонстрації, якщо скрипт викликається напряму
if (typeof require !== 'undefined' && require.main === module) {
  // Встановіть реальні дані для авторизації
  console.log('⚠️  Будь ласка, оновіть дані авторизації в скрипті перед запуском');
  console.log('📝 Змініть email та password в функції demonstrateBookIntegration()');
  
  // Розкоментуйте для запуску:
  // demonstrateBookIntegration();
}

/*
Приклад використання:

1. Встановіть залежності:
   npm install node-fetch

2. Змініть дані авторизації в функції demonstrateBookIntegration()

3. Запустіть скрипт:
   node examples/book-integration-example.js

4. Або використовуйте окремі функції:
   const { searchAllSources } = require('./examples/book-integration-example.js');
   
   // Після авторизації
   searchAllSources('Python programming').then(results => {
     console.log('Знайдено книг:', results.totalResults);
   });
*/