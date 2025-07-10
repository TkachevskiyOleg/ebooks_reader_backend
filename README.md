# 📚 Ebooks Reader Backend

Це серверна частина застосунку для керування електронними книгами з підтримкою завантаження, зчитування метаданих, колекцій, закладок та іншого.

---

## 🔧 Технології

- **Node.js** + **Express**
- **TypeScript**
- **Prisma ORM**
- **PostgreSQL**
- **Multer** (завантаження файлів)
- **Calibre (ebook-meta)** — для метаданих
- **CORS, dotenv, morgan** – додатково

---

## 🚀 Швидкий старт

> Перед запуском переконайся, що в системі встановлено:
- [Node.js](https://nodejs.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [Calibre CLI (ebook-meta)](https://calibre-ebook.com/)

---

## 📦 Встановлення

```bash
git clone https://github.com/your-username/ebooks_reader_backend.git
cd ebooks_reader_backend

npm install

```

---

## 📖 Основні API

### 🔑 Авторизація

- **POST /api/auth/register** — реєстрація
  - `{ "login": "user1", "password": "pass1234" }`
- **POST /api/auth/login** — логін
  - `{ "login": "user1", "password": "pass1234" }`
- **POST /api/auth/refresh** — оновлення access token
  - `{ "refreshToken": "..." }`
- **GET /api/auth/me** — профіль (потрібен токен)

### 📚 Книги

- **POST /api/books/** — додати книгу (multipart/form-data, поле file)
- **GET /api/books/** — список книг користувача
- **GET /api/books/:id** — отримати книгу за id
- **DELETE /api/books/:id** — видалити книгу
- **GET /api/books/file/:id** — завантажити файл книги

### 📂 Колекції

- **POST /api/collections/** — створити колекцію
- **GET /api/collections/:id** — отримати колекцію
- **POST /api/collections/:collectionId/books/:bookId** — додати книгу до колекції

### 📱 Мобільні маршрути

- **POST /api/mobile/sync-progress** — синхронізувати прогрес читання
- **GET /api/mobile/bookmarks** — отримати закладки
- **POST /api/mobile/bookmarks** — створити закладку
- **DELETE /api/mobile/bookmarks/:id** — видалити закладку
- **GET /api/mobile/notes** — отримати нотатки
- **POST /api/mobile/sync-notes** — синхронізувати нотатки

---

### 🔒 Всі маршрути (крім /auth/register, /auth/login, /auth/refresh) потребують JWT токен у заголовку:
```
Authorization: Bearer <ваш_токен>
```

---

Докладніше — дивись у коді або звертайся до мене.
