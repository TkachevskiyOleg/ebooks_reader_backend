import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import bookRoutes from './routes/bookRoutes';
import collectionRoutes from './routes/collectionRoutes';
import mobileRoutes from './routes/mobileRoutes';
import authRoutes from './routes/authRoutes';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(express.json());
app.use(morgan('dev'));
app.use(cors());

app.use('/api/books', bookRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/auth', authRoutes);

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Ebooks Reader Backend API',
      version: '1.0.0',
      description: 'Документація REST API для мобільного рідера книг',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/uploads', express.static('uploads', {
  setHeaders: (response, filePath) => {
    response.setHeader('Content-Disposition', 'attachment');
      }
    }
  )
);

export default app;