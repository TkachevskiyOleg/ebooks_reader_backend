import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import bookRoutes from './routes/bookRoutes';
import collectionRoutes from './routes/collectionRoutes';
import mobileRoutes from './routes/mobileRoutes';
import authRoutes from './routes/authRoutes';
import syncRoutes from './routes/syncRoutes';
import swaggerUi from 'swagger-ui-express';
import tagRoutes from './routes/tagRoutes';
import yaml from 'yamljs';
import dotenv from 'dotenv';
import path from 'path';
import { Request, Response, NextFunction } from 'express';

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
app.use('/api', syncRoutes);

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

export default app;