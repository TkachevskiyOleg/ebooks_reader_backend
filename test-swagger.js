const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let authToken = '';
let refreshToken = '';

async function testSwaggerEndpoints() {
    console.log('=== ТЕСТУВАННЯ SWAGGER ДОКУМЕНТАЦІЇ ===\n');

    try {
        // 1. Тест реєстрації
        console.log('1. Тест реєстрації користувача...');
        const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
            login: 'swaggertestuser',
            password: '123456'
        });
        console.log('✅ Реєстрація успішна:', registerResponse.data);
        authToken = registerResponse.data.token;
        refreshToken = registerResponse.data.refreshToken;

        // 2. Тест логіну
        console.log('\n2. Тест логіну...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            login: 'swaggertestuser',
            password: '123456'
        });
        console.log('✅ Логін успішний:', loginResponse.data);

        // 3. Тест отримання профілю
        console.log('\n3. Тест отримання профілю...');
        const profileResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ Профіль отримано:', profileResponse.data);

        // 4. Тест оновлення токена
        console.log('\n4. Тест оновлення токена...');
        const refreshResponse = await axios.post(`${BASE_URL}/api/auth/refresh`, {
            refreshToken: refreshToken
        });
        console.log('✅ Токен оновлено:', refreshResponse.data);

        // 5. Тест створення колекції
        console.log('\n5. Тест створення колекції...');
        const collectionResponse = await axios.post(`${BASE_URL}/api/collections`, {
            name: 'Тестова колекція'
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ Колекцію створено:', collectionResponse.data);

        // 6. Тест отримання колекції
        console.log('\n6. Тест отримання колекції...');
        const getCollectionResponse = await axios.get(`${BASE_URL}/api/collections/${collectionResponse.data.id}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ Колекцію отримано:', getCollectionResponse.data);

        // 7. Тест отримання списку книг
        console.log('\n7. Тест отримання списку книг...');
        const booksResponse = await axios.get(`${BASE_URL}/api/books`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ Список книг отримано:', booksResponse.data);

        // 8. Тест синхронізації прогресу
        console.log('\n8. Тест синхронізації прогресу...');
        const progressResponse = await axios.post(`${BASE_URL}/api/mobile/sync-progress`, {
            bookId: 1,
            progress: 0.5,
            position: 'page 100'
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ Прогрес синхронізовано:', progressResponse.data);

        // 9. Тест створення закладки
        console.log('\n9. Тест створення закладки...');
        const bookmarkResponse = await axios.post(`${BASE_URL}/api/mobile/bookmarks`, {
            bookId: 1,
            position: 'page 50',
            note: 'Тестова закладка'
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ Закладку створено:', bookmarkResponse.data);

        // 10. Тест отримання закладок
        console.log('\n10. Тест отримання закладок...');
        const getBookmarksResponse = await axios.get(`${BASE_URL}/api/mobile/bookmarks?bookId=1`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ Закладки отримано:', getBookmarksResponse.data);

        // 11. Тест синхронізації нотаток
        console.log('\n11. Тест синхронізації нотаток...');
        const notesResponse = await axios.post(`${BASE_URL}/api/mobile/sync-notes`, {
            bookId: 1,
            notes: [
                { content: 'Тестова нотатка 1', position: 'page 25' },
                { content: 'Тестова нотатка 2', position: 'page 75' }
            ]
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ Нотатки синхронізовано:', notesResponse.data);

        // 12. Тест отримання нотаток
        console.log('\n12. Тест отримання нотаток...');
        const getNotesResponse = await axios.get(`${BASE_URL}/api/mobile/notes?bookId=1`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ Нотатки отримано:', getNotesResponse.data);

        console.log('\n🎉 ВСІ ТЕСТИ ПРОЙШЛИ УСПІШНО!');
        console.log('\n📖 Swagger документація доступна за адресою: http://localhost:3000/api/docs');

    } catch (error) {
        console.error('❌ Помилка тестування:', error.response?.data || error.message);
    }
}

testSwaggerEndpoints(); 