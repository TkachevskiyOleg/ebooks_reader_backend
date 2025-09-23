# 📚 Інтеграція з зовнішніми сервісами книг

## 🎯 Огляд

Ваша бібліотечна система тепер підтримує автоматичне оновлення бази даних через інтеграцію з трьома популярними безкоштовними API:

- **Google Books API** - сучасні книги та електронні видання
- **Open Library API** - класична література та академічні видання  
- **Project Gutenberg API** - безкоштовні класичні книги

## 🚀 Швидкий старт

### 1. Встановлення
```bash
# Запустіть скрипт налаштування
./setup-integration.sh

# Або вручну:
npm install node-cron
npm install --save-dev @types/node-cron
npx prisma generate
npx prisma migrate dev --name add_external_book_fields
```

### 2. Налаштування
Оновіть файл `.env` з вашими налаштуваннями:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/ebooks_reader"
JWT_SECRET="your-secret-key"
# ... інші налаштування
```

### 3. Запуск
```bash
npm run dev
```

## 🔄 Автоматичне оновлення

Система автоматично синхронізується:

- **Щодня о 2:00** - Google Books (популярні книги)
- **Щонеділі о 3:00** - Open Library (класика)
- **1 числа о 4:00** - Project Gutenberg (класичні книги)
- **Щогодини** - перевірка популярних книг

## 📡 API Ендпоінти

### Синхронізація
```http
POST /api/sync/source
{
  "source": "google_books",
  "query": "programming",
  "limit": 20
}

POST /api/sync/full
```

### Пошук
```http
GET /api/search?query=javascript&limit=10
```

### Моніторинг
```http
GET /api/logs?limit=50&source=google_books
GET /api/stats?days=30
GET /api/health
```

### Управління
```http
GET /api/scheduler/status
POST /api/scheduler/control
{
  "jobName": "daily-google-books",
  "action": "start"
}
```

## 📊 Нові можливості

### База даних
- Додано поля для зовнішніх джерел
- Логування синхронізації
- Метадані книг (ISBN, опис, кількість сторінок)

### Автоматизація
- Планувальник завдань
- Автоматичне оновлення
- Моніторинг здоров'я API

### API
- Ручна синхронізація
- Пошук у всіх джерелах
- Статистика та логи

## 🛠️ Приклади використання

### JavaScript/Node.js
```javascript
// Пошук книг
const response = await fetch('/api/search?query=javascript&limit=5', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();

// Синхронізація
const syncResult = await fetch('/api/sync/source', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    source: 'google_books',
    query: 'machine learning',
    limit: 15
  })
});
```

### cURL
```bash
# Пошук книг
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/search?query=programming&limit=5"

# Синхронізація
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source":"google_books","query":"science","limit":10}' \
  "http://localhost:3000/api/sync/source"

# Статистика
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/stats?days=7"
```

## 📈 Моніторинг

### Перевірка здоров'я
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/health"
```

### Статистика
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/stats?days=30"
```

### Логи
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/logs?limit=20"
```

## ⚙️ Налаштування

### Конфігурація синхронізації
Файл: `src/config/syncConfig.ts`

```typescript
export const defaultSyncConfig = {
  googleBooks: {
    enabled: true,
    dailyQueries: ['fiction', 'science', 'programming'],
    maxResults: 10,
    delayBetweenRequests: 2000
  },
  // ... інші налаштування
};
```

### Кастомні завдання
```typescript
import schedulerService from './services/schedulerService';

// Додати нове завдання
schedulerService.addJob('custom-sync', '0 6 * * *', async () => {
  // Ваша логіка
});
```

## 🔧 Розширення

### Додавання нового джерела
1. Додайте метод у `ExternalBookService`
2. Оновіть інтерфейс `ExternalBook`
3. Додайте завдання у `SchedulerService`
4. Оновіть валідацію у `SyncController`

### Кастомні фільтри
```typescript
// Фільтр за мовою
const books = await prisma.book.findMany({
  where: {
    language: 'uk',
    isPublic: true
  }
});
```

## 📋 Обмеження

- **Google Books**: 1000 запитів/день
- **Open Library**: без обмежень (рекомендується затримка)
- **Project Gutenberg**: без обмежень

## 🆘 Вирішення проблем

### Помилки синхронізації
1. Перевірте логи: `GET /api/logs`
2. Перевірте здоров'я API: `GET /api/health`
3. Перегляньте статистику: `GET /api/stats`

### Проблеми з планувальником
1. Перевірте статус: `GET /api/scheduler/status`
2. Перезапустіть завдання: `POST /api/scheduler/control`

### Проблеми з базою даних
```bash
# Перегенеруйте клієнт
npx prisma generate

# Застосуйте міграції
npx prisma migrate dev
```

## 📚 Документація

- **Повний гід**: `INTEGRATION_GUIDE.md`
- **Приклади API**: `examples/api-usage.js`
- **Конфігурація**: `src/config/syncConfig.ts`

## 🎉 Результат

Після налаштування ваша бібліотечна система буде:

✅ Автоматично оновлювати базу книг  
✅ Синхронізуватися з 3 популярними джерелами  
✅ Надавати детальну статистику  
✅ Моніторити здоров'я зовнішніх API  
✅ Логувати всі операції  
✅ Підтримувати ручне управління  

**База даних буде постійно оновлюватися без вашого втручання!** 🚀