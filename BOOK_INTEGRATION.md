# Інтеграція зовнішніх джерел книг

Цей документ описує нові можливості інтеграції зовнішніх сервісів для автоматичного поповнення бази книг.

## 🚀 Огляд функціональності

Система інтегрована з наступними зовнішніми джерелами:

### 📚 Підтримувані джерела

1. **Google Books API** - Найбільша база книг з метаданими
2. **Open Library** - Відкрита бібліотека з мільйонами книг
3. **Project Gutenberg** - Безкоштовні книги в публічному доступі
4. **Internet Archive** - Архів книг та документів

### ✨ Основні можливості

- **Пошук книг** у всіх джерелах одночасно
- **Автоматичний імпорт** книг з зовнішніх джерел
- **Покращення метаданих** існуючих книг
- **Планові синхронізації** для автоматичного оновлення бази
- **Адміністративна панель** для управління інтеграціями

## 🔧 Налаштування

### 1. Змінні середовища

Додайте до `.env` файлу:

```env
# Необов'язково - для вищих лімітів Google Books API
GOOGLE_BOOKS_API_KEY=your_google_books_api_key

# Директорія для зберігання книг
STORAGE_DIR=./book-storage
```

### 2. База даних

Виконайте міграцію для додавання нових полів:

```bash
npx prisma migrate dev --name add_external_book_integration
```

### 3. Ініціалізація джерел

Після запуску сервера, ініціалізуйте зовнішні джерела (потрібні права адміністратора):

```bash
POST /api/admin/external-sources/initialize
```

## 📖 API Endpoints

### Пошук зовнішніх книг

#### Пошук у всіх джерелах
```http
GET /api/external-books/search?query=Гарри Поттер&maxPerSource=10
```

#### Пошук у конкретному джерелі
```http
GET /api/external-books/search/google_books?query=javascript&limit=20
```

#### Отримання популярних книг
```http
GET /api/external-books/trending?limit=50
```

### Імпорт книг

#### Імпорт зовнішньої книги
```http
POST /api/external-books/import
Content-Type: application/json

{
  "externalBook": {
    "id": "book_id",
    "title": "Назва книги",
    "author": "Автор",
    "downloadUrl": "https://example.com/book.pdf",
    "format": "pdf",
    "source": "google_books"
  },
  "isPublic": false
}
```

### Покращення метаданих

#### Покращення конкретної книги
```http
POST /api/external-books/enhance/123
```

#### Масове покращення метаданих
```http
POST /api/external-books/bulk-enhance
Content-Type: application/json

{
  "enhanceAll": true
}
```

### Адміністративні функції

#### Статус сервісу синхронізації
```http
GET /api/admin/sync-service/status
```

#### Запуск/зупинка сервісу
```http
POST /api/admin/sync-service/start
POST /api/admin/sync-service/stop
```

#### Ручний запуск синхронізації
```http
POST /api/admin/sync-service/trigger/trending
POST /api/admin/sync-service/trigger/metadata
POST /api/admin/sync-service/trigger/popular
```

#### Системна статистика
```http
GET /api/admin/statistics
```

## ⏰ Автоматичні задачі

Система автоматично виконує наступні задачі:

### Щоденні задачі
- **02:00** - Синхронізація популярних книг
- **01:00** - Очищення старих логів (>30 днів)

### Щотижневі задачі
- **Неділя 03:00** - Покращення метаданих для книг з неповною інформацією

### Щомісячні задачі
- **1 число 04:00** - Імпорт популярних книг з різних жанрів

## 📊 Моніторинг та логування

### Логи синхронізації
Всі операції синхронізації записуються в таблицю `SyncLog`:

```http
GET /api/external-books/sync-logs?page=1&limit=50&source=google_books&status=success
```

### Статистика джерел
Перегляд статистики по кожному джерелу:

```http
GET /api/admin/external-sources
```

## 🔒 Безпека та обмеження

### Обмеження API
- Затримки між запитами для уникнення блокування
- Обмеження кількості результатів за запит
- Таймаути для довгих операцій

### Права доступу
- **Користувачі** - можуть шукати та імпортувати книги
- **Адміністратори** - повний доступ до управління інтеграціями

## 🛠️ Розширення функціональності

### Додавання нового джерела

1. Розширте `BookIntegrationService`:
```typescript
static async searchNewSource(query: string): Promise<ExternalBookSource[]> {
  // Реалізація пошуку
}
```

2. Додайте до `searchAllSources()` метода
3. Оновіть типи в `ExternalBookSource['source']`
4. Додайте конфігурацію в `ExternalSource` таблицю

### Налаштування розкладу

Змініть розклад в `ScheduledSyncService.start()`:

```typescript
// Кожні 6 годин замість щодня
const trendingSync = cron.schedule('0 */6 * * *', async () => {
  await this.syncTrendingBooks();
});
```

## 🎯 Приклади використання

### Пошук та імпорт книги

```javascript
// 1. Пошук книг
const searchResponse = await fetch('/api/external-books/search?query=JavaScript');
const { books } = await searchResponse.json();

// 2. Вибір книги для імпорту
const bookToImport = books.find(book => book.canImport);

// 3. Імпорт книги
const importResponse = await fetch('/api/external-books/import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    externalBook: bookToImport,
    isPublic: true
  })
});
```

### Покращення метаданих

```javascript
// Покращення всіх книг користувача
const enhanceResponse = await fetch('/api/external-books/bulk-enhance', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ enhanceAll: true })
});

const results = await enhanceResponse.json();
console.log(`Покращено: ${results.results.enhanced} книг`);
```

## 📈 Метрики та аналітика

### Основні метрики
- Кількість імпортованих книг
- Успішність операцій синхронізації
- Популярні джерела книг
- Швидкість обробки запитів

### Аналіз використання
```http
GET /api/admin/statistics
```

Повертає:
- Загальна статистика книг
- Статистика по джерелах
- Активність синхронізації
- Топ жанрів та авторів

## 🚨 Усунення проблем

### Часті проблеми

1. **Помилки завантаження книг**
   - Перевірте доступність URL
   - Переконайтеся в наявності вільного місця
   - Перевірте права на запис у STORAGE_DIR

2. **Повільний пошук**
   - Зменшіть maxPerSource
   - Перевірте мережеве з'єднання
   - Використовуйте конкретні джерела замість загального пошуку

3. **Дублікати книг**
   - Запустіть очищення: `POST /api/admin/cleanup` з `{"operation": "duplicate_books"}`
   - Покращіть алгоритм виявлення дублікатів

### Логи помилок
```bash
# Перегляд логів синхронізації
GET /api/external-books/sync-logs?status=failed

# Системні логи
tail -f logs/app.log
```

## 🔄 Міграція та оновлення

При оновленні системи:

1. Зупиніть сервіс синхронізації
2. Виконайте міграції бази даних
3. Перезапустіть сервер
4. Запустіть сервіс синхронізації

```bash
# Зупинка
POST /api/admin/sync-service/stop

# Після оновлення
POST /api/admin/sync-service/start
```

## 📚 Додаткова документація

- [Swagger API Documentation](/api/docs)
- [Database Schema](./prisma/schema.prisma)
- [Environment Configuration](./.env.example)

---

**Автор:** AI Assistant  
**Версія:** 1.0.0  
**Дата:** 2025-01-23