import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import bookRoutes from './routes/bookRoutes';
import collectionRoutes from './routes/collectionRoutes';
import mobileRoutes from './routes/mobileRoutes';
import authRoutes from './routes/authRoutes';
import swaggerUi from 'swagger-ui-express';
import tagRoutes from './routes/tagRoutes';
import externalBooksRoutes from './routes/externalBooks';
import adminRoutes from './routes/admin';
import yaml from 'yamljs';
import dotenv from 'dotenv';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import ScheduledSyncService from './services/scheduledSyncService';

dotenv.config();

const app = express();

app.use(express.json());
app.use(morgan('dev'));
app.use(cors());

app.use('/api/books', bookRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/external-books', externalBooksRoutes);
app.use('/api/admin', adminRoutes);

const swaggerDocument = yaml.load(path.join(__dirname, '../swagger.yaml'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/uploads', express.static('uploads', {
  setHeaders: (response, filePath) => {
    response.setHeader('Content-Disposition', 'attachment');
  }
}));

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    error: err && err.message ? err.message : err,
    stack: err && err.stack ? err.stack : undefined,
    stringified: (() => { try { return JSON.stringify(err); } catch { return undefined; } })()
  });
});

// Initialize external book integration on startup
const initializeBookIntegration = async () => {
  try {
    console.log('Initializing book integration services...');
    
    // Start the scheduled sync service
    ScheduledSyncService.start();
    
    console.log('Book integration services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize book integration services:', error);
  }
};

// Initialize on app startup
initializeBookIntegration();

export default app;