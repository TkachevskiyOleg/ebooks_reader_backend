export interface SyncConfig {
  googleBooks: {
    enabled: boolean;
    dailyQueries: string[];
    maxResults: number;
    delayBetweenRequests: number; // в мілісекундах
  };
  openLibrary: {
    enabled: boolean;
    weeklyQueries: string[];
    maxResults: number;
    delayBetweenRequests: number;
  };
  gutenberg: {
    enabled: boolean;
    monthlyQueries: string[];
    maxResults: number;
    delayBetweenRequests: number;
  };
  scheduler: {
    timezone: string;
    enableHourlyCheck: boolean;
    popularQueries: string[];
  };
}

export const defaultSyncConfig: SyncConfig = {
  googleBooks: {
    enabled: true,
    dailyQueries: [
      'fiction',
      'science',
      'history',
      'programming',
      'ukrainian literature',
      'bestseller',
      'new release'
    ],
    maxResults: 10,
    delayBetweenRequests: 2000
  },
  openLibrary: {
    enabled: true,
    weeklyQueries: [
      'classic literature',
      'science fiction',
      'mystery',
      'romance',
      'biography',
      'philosophy',
      'poetry'
    ],
    maxResults: 15,
    delayBetweenRequests: 3000
  },
  gutenberg: {
    enabled: true,
    monthlyQueries: [
      'classic',
      'philosophy',
      'religion',
      'history',
      'adventure',
      'drama',
      'poetry'
    ],
    maxResults: 20,
    delayBetweenRequests: 2000
  },
  scheduler: {
    timezone: 'Europe/Kiev',
    enableHourlyCheck: true,
    popularQueries: [
      'bestseller',
      'new release',
      'trending',
      'popular'
    ]
  }
};

// Конфігурація для різних середовищ
export const getSyncConfig = (): SyncConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return {
        ...defaultSyncConfig,
        googleBooks: {
          ...defaultSyncConfig.googleBooks,
          maxResults: 20, // Більше книг у продакшені
          delayBetweenRequests: 3000 // Більша затримка
        },
        openLibrary: {
          ...defaultSyncConfig.openLibrary,
          maxResults: 25,
          delayBetweenRequests: 4000
        },
        gutenberg: {
          ...defaultSyncConfig.gutenberg,
          maxResults: 30,
          delayBetweenRequests: 3000
        },
        scheduler: {
          ...defaultSyncConfig.scheduler,
          enableHourlyCheck: false // Відключаємо щогодинну перевірку у продакшені
        }
      };
      
    case 'test':
      return {
        ...defaultSyncConfig,
        googleBooks: {
          ...defaultSyncConfig.googleBooks,
          enabled: false, // Відключаємо у тестах
          maxResults: 2
        },
        openLibrary: {
          ...defaultSyncConfig.openLibrary,
          enabled: false,
          maxResults: 2
        },
        gutenberg: {
          ...defaultSyncConfig.gutenberg,
          enabled: false,
          maxResults: 2
        },
        scheduler: {
          ...defaultSyncConfig.scheduler,
          enableHourlyCheck: false
        }
      };
      
    default: // development
      return defaultSyncConfig;
  }
};