import multer from 'multer';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import fs from 'fs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.diskStorage({
  destination: (request, file, callback) => {
    ensureDirectoryExists('uploads/');
    callback(null, 'uploads/');
  },
  filename: (request, file, callback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    callback(null, 'book-' + uniqueSuffix + extension);
  }
});

const ensureDirectoryExists = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const fileFilter = (request: any, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
  const allowedTypes = ['.pdf', '.epub', '.fb2'];
  const extension = path.extname(file.originalname).toLowerCase();
  allowedTypes.includes(extension) ? callback(null, true) : callback(new Error('Непідтримуваний формат файлу'));
};

const coverStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: 'ebook_covers',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 600, height: 800, crop: 'limit' }],
  }),
});

const coverFileFilter = (request: any, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
  const allowedTypes = ['.jpg', '.jpeg', '.png'];
  const extension = path.extname(file.originalname).toLowerCase();
  allowedTypes.includes(extension) ? callback(null, true) : callback(new Error('Непідтримуваний формат обкладинки'));
};

export const uploadMultipart = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === 'file') {
        ensureDirectoryExists('uploads/');
        cb(null, 'uploads/');
      } else if (file.fieldname === 'cover') {
        ensureDirectoryExists('temp/');
        cb(null, 'temp/');
      } else {
        cb(null, '/dev/null');
      }
    },
    filename: (req, file, cb) => {
      if (file.fieldname === 'file') {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, 'book-' + uniqueSuffix + extension);
      } else if (file.fieldname === 'cover') {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, 'cover-' + uniqueSuffix + extension);
      } else {
        cb(null, file.originalname);
      }
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'file') {
      fileFilter(req, file, cb);
    } else if (file.fieldname === 'cover') {
      coverFileFilter(req, file, cb);
    } else {
      cb(new Error('Невідоме поле файлу'));
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 }
});

export const uploadCover = multer({
  storage: coverStorage,
  fileFilter: coverFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

export default multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }
});