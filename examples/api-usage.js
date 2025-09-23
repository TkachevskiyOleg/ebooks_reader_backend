// Приклади використання API для інтеграції з зовнішніми сервісами

const API_BASE = 'http://localhost:3000/api';
const TOKEN = 'your-jwt-token-here'; // Замініть на ваш токен

// Функція для виконання запитів
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };
  
  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error(`Помилка при запиті до ${endpoint}:`, error);
    throw error;
  }
}

// 1. Пошук книг у всіх джерелах
async function searchBooks(query, limit = 10) {
  console.log(`🔍 Пошук книг: "${query}"`);
  
  const result = await apiRequest(`/search?query=${encodeURIComponent(query)}&limit=${limit}`);
  
  console.log('📚 Результати пошуку:');
  console.log(`Google Books: ${result.results.googleBooks.length} книг`);
  console.log(`Open Library: ${result.results.openLibrary.length} книг`);
  console.log(`Project Gutenberg: ${result.results.gutenberg.length} книг`);
  
  return result;
}

// 2. Синхронізація з Google Books
async function syncFromGoogleBooks(query, limit = 20) {
  console.log(`📥 Синхронізація з Google Books: "${query}"`);
  
  const result = await apiRequest('/sync/source', {
    method: 'POST',
    body: JSON.stringify({
      source: 'google_books',
      query: query,
      limit: limit
    })
  });
  
  console.log('✅ Синхронізація завершена:');
  console.log(`  Додано: ${result.result.added} книг`);
  console.log(`  Оновлено: ${result.result.updated} книг`);
  
  if (result.result.errors.length > 0) {
    console.log(`  Помилки: ${result.result.errors.length}`);
    result.result.errors.forEach(error => console.log(`    - ${error}`));
  }
  
  return result;
}

// 3. Повна синхронізація з усіх джерел
async function fullSync() {
  console.log('🔄 Запуск повної синхронізації...');
  
  const result = await apiRequest('/sync/full', {
    method: 'POST'
  });
  
  console.log('✅ Повна синхронізація завершена:');
  console.log('Google Books:', result.results.googleBooks);
  console.log('Open Library:', result.results.openLibrary);
  console.log('Project Gutenberg:', result.results.gutenberg);
  
  return result;
}

// 4. Перегляд логів синхронізації
async function getSyncLogs(limit = 10, source = null) {
  console.log('📋 Отримання логів синхронізації...');
  
  let endpoint = `/logs?limit=${limit}`;
  if (source) {
    endpoint += `&source=${source}`;
  }
  
  const result = await apiRequest(endpoint);
  
  console.log(`📊 Останні ${result.logs.length} записів:`);
  result.logs.forEach(log => {
    const duration = log.duration ? `${log.duration}ms` : 'N/A';
    console.log(`  ${log.source} - ${log.status} (${log.booksAdded}+/${log.booksUpdated}~) - ${duration}`);
  });
  
  return result;
}

// 5. Статистика синхронізації
async function getSyncStats(days = 30) {
  console.log(`📈 Статистика за останні ${days} днів...`);
  
  const result = await apiRequest(`/stats?days=${days}`);
  
  console.log('📊 Загальна статистика:');
  console.log(`  Всього синхронізацій: ${result.totalStats.totalSyncs}`);
  console.log(`  Додано книг: ${result.totalStats.totalBooksAdded}`);
  console.log(`  Оновлено книг: ${result.totalStats.totalBooksUpdated}`);
  
  console.log('\n📚 По джерелах:');
  result.sourceStats.forEach(stat => {
    console.log(`  ${stat.source}: ${stat._sum.booksAdded}+/${stat._sum.booksUpdated}~ (${stat._count.id} синхронізацій)`);
  });
  
  console.log('\n🎯 По статусах:');
  result.statusStats.forEach(stat => {
    console.log(`  ${stat.status}: ${stat._count.id} разів`);
  });
  
  return result;
}

// 6. Перевірка здоров'я API
async function checkHealth() {
  console.log('🏥 Перевірка здоров\'я зовнішніх API...');
  
  const result = await apiRequest('/health');
  
  console.log(`🔍 Загальний статус: ${result.health.overall}`);
  console.log(`📊 Здорові сервіси: ${result.health.healthyCount}/${result.health.totalCount}`);
  
  result.health.services.forEach(service => {
    const status = service.status === 'healthy' ? '✅' : '❌';
    const time = service.responseTime ? `${service.responseTime}ms` : 'N/A';
    console.log(`  ${status} ${service.service}: ${service.status} (${time})`);
    
    if (service.error) {
      console.log(`    Помилка: ${service.error}`);
    }
  });
  
  return result;
}

// 7. Управління планувальником
async function getSchedulerStatus() {
  console.log('⏰ Статус планувальника завдань...');
  
  const result = await apiRequest('/scheduler/status');
  
  console.log('📋 Завдання:');
  result.jobs.forEach(job => {
    const status = job.running ? '🟢' : '🔴';
    console.log(`  ${status} ${job.name}: ${job.running ? 'запущено' : 'зупинено'}`);
  });
  
  return result;
}

// 8. Запуск/зупинка завдання
async function controlJob(jobName, action) {
  console.log(`🎮 ${action === 'start' ? 'Запуск' : 'Зупинка'} завдання: ${jobName}`);
  
  const result = await apiRequest('/scheduler/control', {
    method: 'POST',
    body: JSON.stringify({
      jobName: jobName,
      action: action
    })
  });
  
  console.log(`✅ ${result.message}`);
  return result;
}

// 9. Оновлення існуючих книг
async function updateExistingBooks(source, limit = 50) {
  console.log(`🔄 Оновлення існуючих книг з ${source}...`);
  
  const result = await apiRequest('/update-existing', {
    method: 'POST',
    body: JSON.stringify({
      source: source,
      limit: limit
    })
  });
  
  console.log(`✅ ${result.message}`);
  if (result.errors) {
    console.log('⚠️ Помилки:');
    result.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  return result;
}

// Приклади використання
async function examples() {
  try {
    console.log('🚀 Приклади використання API інтеграції\n');
    
    // 1. Пошук книг
    await searchBooks('javascript programming', 5);
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 2. Перевірка здоров'я
    await checkHealth();
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 3. Статистика
    await getSyncStats(7);
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 4. Логи
    await getSyncLogs(5);
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 5. Статус планувальника
    await getSchedulerStatus();
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 6. Синхронізація (закоментовано, щоб не спамити API)
    // await syncFromGoogleBooks('machine learning', 5);
    
    console.log('✅ Всі приклади виконано успішно!');
    
  } catch (error) {
    console.error('❌ Помилка при виконанні прикладів:', error);
  }
}

// Експорт функцій для використання в інших файлах
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    searchBooks,
    syncFromGoogleBooks,
    fullSync,
    getSyncLogs,
    getSyncStats,
    checkHealth,
    getSchedulerStatus,
    controlJob,
    updateExistingBooks,
    examples
  };
}

// Запуск прикладів, якщо файл виконується напряму
if (typeof window === 'undefined' && require.main === module) {
  examples();
}