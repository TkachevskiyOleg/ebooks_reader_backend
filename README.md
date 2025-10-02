# 📚 Ebooks Reader Backend

Це серверна частина мобільного застосунку для читання електронних книг (аналог ReadEra). Сервер забезпечує авторизацію, завантаження, зберігання, організацію книг, колекцій, закладок, нотаток, рейтингів, а також синхронізацію прогресу читання через REST API.

---

## 🔧 Технології

- **Node.js** + **Express.js** (REST API)
- **TypeScript**
- **Prisma ORM** (PostgreSQL)
- **Multer** (upload файлів)
- **Cloudinary** (зберігання обкладинок)
- **Calibre (ebook-meta)**, **pdf-parse**, **mammoth** (метадані книг)
- **JWT, bcryptjs** (авторизація, безпека)
- **Swagger (OpenAPI)** (документація)
- **dotenv, morgan, cors** (додатково)

---

## 🚀 Швидкий старт

> Перед запуском переконайся, що встановлено:
> - [Node.js](https://nodejs.org/)
> - [PostgreSQL](https://www.postgresql.org/)
> - [Calibre CLI (ebook-meta)](https://calibre-ebook.com/)

```bash
git clone <repo-url>
cd ebooks_reader_backend
npm install
```

- Створи файл `.env` (див. приклад нижче або у `.env.example`)
- Запусти міграції: `npx prisma migrate dev`
- Запусти сервер: `npm run dev`

---

## 📖 Основні можливості

- Реєстрація, логін, email verification, відновлення паролю
- Завантаження книг (PDF, EPUB, FB2, TXT, DOC) та обкладинок
- Зчитування метаданих (назва, автор, обкладинка)
- CRUD для книг, колекцій, тегів, закладок, нотаток, рейтингів
- Синхронізація прогресу читання, закладок, нотаток з мобільним додатком
- Публічна бібліотека книг (маркетплейс)
- Домашня стрічка з останніми та топовими публічними книгами
- Документований API (Swagger)

---

## 📦 Основні API (ендпоінти)

### 🔑 Авторизація
- `POST /api/auth/register` — реєстрація
- `POST /api/auth/login` — логін
- `POST /api/auth/refresh` — оновлення access token
- `GET /api/auth/me` — профіль
- `GET /api/auth/verify-email` — підтвердження email
- `POST /api/auth/forgot-password` — запит на відновлення паролю
- `POST /api/auth/reset-password` — скидання паролю (в один запит: код/токен + новий пароль)
- Дворівневий варіант (за бажанням):
  - `POST /api/auth/verify-reset-code` — перевірка коду, повертає `resetAuthToken` (діє 15 хв)
  - `POST /api/auth/set-new-password` — встановлення нового пароля за `resetAuthToken`

### 📚 Книги
- `POST /api/books/` — додати книгу (multipart/form-data)
- `GET /api/books/` — список книг користувача
- `GET /api/books/public` — публічні книги (маркетплейс)
- `GET /api/books/:id` — отримати книгу за id
- `DELETE /api/books/:id` — видалити книгу
- `GET /api/books/file/:id` — завантажити файл книги
- `POST /api/books/:bookId/rate` — оцінити книгу
- `GET /api/books/filter` — фільтрація книг
- `GET /api/books/home` — домашня стрічка (latest, topRated)

### 📂 Колекції
- `POST /api/collections/` — створити колекцію
- `GET /api/collections/` — список колекцій
- `GET /api/collections/:id` — отримати колекцію
- `POST /api/collections/:collectionId/books/:bookId` — додати книгу в колекцію
- `DELETE /api/collections/:collectionId/books/:bookId` — видалити книгу з колекції
- `DELETE /api/collections/:id` — видалити колекцію

### 🏷️ Теги
- `POST /api/tags/` — створити тег
- `GET /api/tags/` — список тегів
- `POST /api/tags/:bookId/:tagId` — додати тег до книги

### 📱 Мобільні маршрути (синхронізація)
- `POST /api/mobile/sync-progress` — синхронізувати прогрес читання
- `GET /api/mobile/progress` — отримати прогрес
- `GET /api/mobile/bookmarks` — отримати закладки
- `POST /api/mobile/bookmarks` — створити закладку
- `PUT /api/mobile/bookmarks/:id` — редагувати закладку
- `DELETE /api/mobile/bookmarks/:id` — видалити закладку
- `GET /api/mobile/notes` — отримати нотатки
- `POST /api/mobile/notes` — створити нотатку
- `PUT /api/mobile/notes/:id` — редагувати нотатку
- `DELETE /api/mobile/notes/:id` — видалити нотатку
- `POST /api/mobile/sync-notes` — синхронізувати нотатки

---

## 🔁 Синхронізація книг з зовнішніх сервісів

- Автоматично за CRON: вистав `SYNC_ENABLED=true`, графік у `SYNC_CRON` (за замовчуванням щогодини).
- Джерела:
  - Project Gutenberg (Gutendex) — підтягує публічні книги, теги, обкладинки (через Open Library, якщо бракує).
  - OPDS-фіди — налаштуй `OPDS_FEEDS` через кому.
- Ручний запуск (тільки ADMIN): `POST /api/books/sync?pages=1&max=8`
  - Параметри (опц.): `pages` — сторінки Gutendex; `max` — максимум книг за прогін.


### 🔒 Безпека
- Всі маршрути (крім /auth/register, /auth/login, /auth/refresh, /auth/verify-email, /auth/forgot-password, /auth/reset-password) потребують JWT токен у заголовку:
```
Authorization: Bearer <ваш_токен>
```
- Паролі хешуються через bcryptjs
- Email verification та відновлення паролю через email
- Rate limiting на логін

---

## 🗂️ Архітектура
- **MVC**: Controllers, Services, Middleware, Routes, Utils
- **Prisma ORM**: моделі User, Book, Collection, Tag, Bookmark, Note, Rating, ViewHistory, ReadingProgress
- **Swagger**: інтерактивна документація API (http://localhost:3000/api-docs)

---

## 📊 Діаграма БД
- Дивись файл `prisma-erd.svg` для ER-діаграми структури бази даних

---

## 📄 Документація
- Swagger UI: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- Детальніше — у swagger.yaml або у коді проекту

---

## 👤 Автор
- Ткачевський Олег
- Для питань: [email/telegram/...]

