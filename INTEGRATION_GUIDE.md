# Інтеграція з зовнішніми сервісами книг

## Огляд

Система тепер підтримує автоматичне оновлення бази даних книг через інтеграцію з трьома популярними безкоштовними API:

1. **Google Books API** - для пошуку сучасних книг та електронних видань
2. **Open Library API** - для класичної літератури та академічних видань
3. **Project Gutenberg API** - для безкоштовних класичних книг

## Нові можливості

### Автоматичне оновлення
- **Щоденна синхронізація** з Google Books (о 2:00 ранку)
- **Щотижнева синхронізація** з Open Library (по неділях о 3:00 ранку)
- **Щомісячна синхронізація** з Project Gutenberg (1 числа о 4:00 ранку)
- **Щогодинна перевірка** популярних книг

### Ручне управління
- Синхронізація з конкретним джерелом
- Повна синхронізація з усіх джерел
- Пошук книг без збереження
- Управління планувальником завдань

## API Ендпоінти

### 1. Синхронізація з конкретним джерелом
```http
POST /api/sync/source
Authorization: Bearer <token>
Content-Type: application/json

{
  "source": "google_books", // або "open_library", "gutenberg"
  "query": "programming",
  "limit": 20
}
```

### 2. Повна синхронізація
```http
POST /api/sync/full
Authorization: Bearer <token>
```

### 3. Пошук у всіх джерелах
```http
GET /api/search?query=javascript&limit=10
Authorization: Bearer <token>
```

### 4. Логи синхронізації
```http
GET /api/logs?limit=50&source=google_books
Authorization: Bearer <token>
```

### 5. Статус планувальника
```http
GET /api/scheduler/status
Authorization: Bearer <token>
```

### 6. Управління завданнями
```http
POST /api/scheduler/control
Authorization: Bearer <token>
Content-Type: application/json

{
  "jobName": "daily-google-books",
  "action": "start" // або "stop"
}
```

### 7. Статистика синхронізації
```http
GET /api/stats?days=30
Authorization: Bearer <token>
```

### 8. Оновлення існуючих книг
```http
POST /api/update-existing
Authorization: Bearer <token>
Content-Type: application/json

{
  "source": "google_books",
  "limit": 50
}
```

## Нові поля в базі даних

### Book модель
- `externalId` - унікальний ідентифікатор у зовнішньому джерелі
- `externalSource` - джерело ('google_books', 'open_library', 'gutenberg')
- `externalUrl` - посилання на книгу у зовнішньому джерелі
- `isbn` - ISBN книги
- `description` - опис книги
- `pageCount` - кількість сторінок
- `publishedDate` - дата публікації
- `lastSyncedAt` - час останньої синхронізації

### SyncLog модель
- `source` - джерело синхронізації
- `status` - статус ('success', 'error', 'partial')
- `booksAdded` - кількість доданих книг
- `booksUpdated` - кількість оновлених книг
- `errors` - помилки (якщо є)
- `startedAt` - час початку
- `completedAt` - час завершення
- `duration` - тривалість в мілісекундах

## Налаштування

### 1. Встановлення залежностей
```bash
npm install node-cron
npm install --save-dev @types/node-cron
```

### 2. Налаштування планувальника
Планувальник автоматично запускається при старті сервера. Ви можете:
- Зупиняти/запускати окремі завдання
- Переглядати статус всіх завдань
- Отримувати статистику роботи

### 3. Кастомні завдання
Ви можете додати власні завдання через `schedulerService.addJob()`:

```typescript
schedulerService.addJob('custom-sync', '0 6 * * *', async () => {
  // Ваша логіка синхронізації
});
```

## Приклади використання

### Пошук книг з JavaScript
```javascript
const response = await fetch('/api/search?query=javascript&limit=5', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
console.log(data.results);
```

### Ручна синхронізація з Google Books
```javascript
const response = await fetch('/api/sync/source', {
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
const result = await response.json();
console.log(`Додано: ${result.result.added}, Оновлено: ${result.result.updated}`);
```

### Перегляд статистики
```javascript
const response = await fetch('/api/stats?days=7', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const stats = await response.json();
console.log(`За 7 днів додано ${stats.totalStats.totalBooksAdded} книг`);
```

## Обмеження та рекомендації

### Обмеження API
- **Google Books**: 1000 запитів на день
- **Open Library**: без обмежень, але рекомендується затримка між запитами
- **Project Gutenberg**: без обмежень

### Рекомендації
1. Використовуйте затримки між запитами (2-3 секунди)
2. Обмежуйте кількість книг за один запит (20-50)
3. Моніторьте логи синхронізації
4. Регулярно оновлюйте існуючі книги

### Обробка помилок
Система автоматично логує всі помилки та зберігає їх у базі даних. Ви можете переглядати їх через API ендпоінт `/api/logs`.

## Моніторинг

### Перевірка статусу завдань
```bash
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/scheduler/status
```

### Перегляд останніх логів
```bash
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/logs?limit=10
```

### Статистика за останній тиждень
```bash
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/stats?days=7
```

## Розширення функціональності

### Додавання нових джерел
1. Додайте новий метод у `ExternalBookService`
2. Оновіть інтерфейс `ExternalBook`
3. Додайте нове завдання у `SchedulerService`
4. Оновіть валідацію у `SyncController`

### Кастомні фільтри
Ви можете додати фільтри для пошуку книг за:
- Мовою
- Жанром
- Роком публікації
- Кількістю сторінок
- Наявністю безкоштовного доступу

Ця інтеграція значно розширює можливості вашої бібліотечної системи та забезпечує автоматичне оновлення бази даних без ручного втручання.