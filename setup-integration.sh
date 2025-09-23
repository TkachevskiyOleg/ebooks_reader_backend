#!/bin/bash

echo "🚀 Налаштування інтеграції з зовнішніми сервісами книг..."

# Встановлення залежностей
echo "📦 Встановлення залежностей..."
npm install node-cron
npm install --save-dev @types/node-cron

# Генерація Prisma клієнта
echo "🔧 Генерація Prisma клієнта..."
npx prisma generate

# Створення міграції (якщо потрібно)
echo "🗄️ Створення міграції бази даних..."
npx prisma migrate dev --name add_external_book_fields

echo "✅ Налаштування завершено!"
echo ""
echo "📚 Доступні нові можливості:"
echo "  • Автоматична синхронізація з Google Books, Open Library, Project Gutenberg"
echo "  • Ручне управління синхронізацією через API"
echo "  • Моніторинг здоров'я зовнішніх API"
echo "  • Статистика та логи синхронізації"
echo ""
echo "🔗 Основні API ендпоінти:"
echo "  • POST /api/sync/source - синхронізація з конкретним джерелом"
echo "  • POST /api/sync/full - повна синхронізація"
echo "  • GET /api/search - пошук у всіх джерелах"
echo "  • GET /api/logs - логи синхронізації"
echo "  • GET /api/health - перевірка здоров'я API"
echo "  • GET /api/stats - статистика синхронізації"
echo ""
echo "📖 Детальна документація: INTEGRATION_GUIDE.md"
echo ""
echo "🎯 Для запуску сервера: npm run dev"