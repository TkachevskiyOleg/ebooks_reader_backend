# Інтеграція зовнішніх джерел книг

## Огляд

Система тепер підтримує інтеграцію з трьома основними джерелами безкоштовних книг:

1. **Google Books API** - пошук та метадані книг
2. **Open Library API** - безкоштовні книги з повним текстом
3. **Project Gutenberg** - класичні твори в публічному домені

## Нові можливості

### 🔍 Пошук книг у зовнішніх джерелах
- Пошук по всіх джерелах одночасно
- Пошук тільки безкоштовних книг
- Отримання популярних книг
- Фільтрація за джерелом

### 📥 Імпорт книг
- Автоматичне завантаження файлів книг
- Збереження метаданих
- Зв'язок з оригінальним джерелом

### ⏰ Автоматичне оновлення
- Щоденне оновлення метаданих
- Щотижневе отримання популярних книг
- Щомісячне очищення старих записів
- Щоденна синхронізація з Project Gutenberg

### 📊 Логування та моніторинг
- Детальне логування всіх операцій
- Статистика використання API
- Моніторинг помилок
- Ротація логів

## API Endpoints

### Пошук книг
```http
GET /api/external-books/search?query=javascript&source=google_books&limit=20
```

### Пошук безкоштовних книг
```http
GET /api/external-books/free?query=programming&limit=20
```

### Популярні книги
```http
GET /api/external-books/popular?limit=20
```

### Імпорт книги
```http
POST /api/external-books/import
Content-Type: application/json

{
  "externalId": "book_id_from_source",
  "source": "google_books"
}
```

### Імпортовані книги
```http
GET /api/external-books/imported?page=1&limit=20
```

### Оновлення метаданих
```http
POST /api/external-books/update-metadata?source=google_books&limit=100
```

## Планувальник завдань

### Статус завдань
```http
GET /api/scheduler/status
```

### Ручний запуск завдання
```http
POST /api/scheduler/run/update-metadata
```

### Статистика планувальника
```http
GET /api/scheduler/stats
```

## Логування

### Перегляд логів
```http
GET /api/logs?level=ERROR&limit=100
```

### Статистика логів
```http
GET /api/logs/stats
```

### Очищення логів
```http
POST /api/logs/cleanup
Content-Type: application/json

{
  "daysToKeep": 30
}
```

## Налаштування

### Змінні середовища

Додайте до файлу `.env`:

```env
# Google Books API (опціонально)
GOOGLE_BOOKS_API_KEY="your-api-key"

# Налаштування планувальника
SCHEDULER_ENABLED=true
SCHEDULER_TIMEZONE="Europe/Kiev"

# Налаштування логування
LOG_LEVEL=INFO
LOG_MAX_SIZE=10MB
LOG_MAX_FILES=5
```

### Розклад завдань

- **Оновлення метаданих**: щодня о 2:00
- **Популярні книги**: щотижня в понеділок о 3:00
- **Очищення записів**: щомісяця 1 числа о 4:00
- **Синхронізація Gutenberg**: щодня о 5:00

## Структура даних

### ExternalBook модель

```typescript
{
  id: number;
  externalId: string;
  source: 'google_books' | 'open_library' | 'gutenberg';
  title: string;
  author?: string;
  description?: string;
  isbn?: string;
  publishedDate?: string;
  publisher?: string;
  language?: string;
  pageCount?: number;
  categories: string[];
  imageUrl?: string;
  downloadUrl?: string;
  previewUrl?: string;
  isDownloadable: boolean;
  isPublicDomain: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastCheckedAt: Date;
}
```

## Обмеження та рекомендації

### API Limits
- **Google Books**: 1000 запитів на день (без API ключа)
- **Open Library**: без обмежень
- **Project Gutenberg**: без обмежень

### Рекомендації
1. Отримайте API ключ для Google Books для збільшення лімітів
2. Налаштуйте ротацію логів для економії місця
3. Регулярно перевіряйте статистику використання
4. Моніторьте помилки через систему логування

## Безпека

- Всі API endpoints потребують авторизації
- Адміністративні функції доступні тільки користувачам з роллю ADMIN
- Логи не містять чутливих даних
- Автоматичне очищення старих записів

## Моніторинг

### Ключові метрики
- Кількість імпортованих книг
- Статистика використання API
- Частота помилок
- Час відгуку зовнішніх сервісів

### Алерти
- Перевищення лімітів API
- Високий рівень помилок
- Недоступність зовнішніх сервісів
- Проблеми з базою даних

## Підтримка

При виникненні проблем:

1. Перевірте логи через `/api/logs`
2. Перевірте статус планувальника через `/api/scheduler/status`
3. Перевірте статистику через `/api/scheduler/stats`
4. Зверніться до документації API джерел

## Майбутні покращення

- Інтеграція з додатковими джерелами (HathiTrust, Internet Archive)
- Машинне навчання для рекомендацій
- Автоматична категоризація книг
- Інтеграція з соціальними мережами
- Мобільний додаток