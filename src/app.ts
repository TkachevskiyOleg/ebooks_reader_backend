import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import bookRoutes from './routes/bookRoutes';
import collectionRoutes from './routes/collectionRoutes';
import mobileRoutes from './routes/mobileRoutes';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(express.json());
app.use(morgan('dev'));
app.use(cors());

app.use('/api/books', bookRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/mobile', mobileRoutes);

app.use('/uploads', express.static('uploads', {
  setHeaders: (response, filePath) => {
    response.setHeader('Content-Disposition', 'attachment');
  }
}));

export default app;