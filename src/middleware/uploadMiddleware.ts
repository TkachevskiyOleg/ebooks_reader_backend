import multer from 'multer';
import path from 'path';
import { Request } from 'express';

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  fileFilter: (req: Request, file: Express.Multer.File, cb) => {
    const allowedFormats = ['.pdf', '.epub', '.fb2', '.txt', '.doc'];
    const ext = path.extname(file.originalname).toLowerCase();
    allowedFormats.includes(ext) 
      ? cb(null, true)
      : cb(new Error('Invalid file format'));
  },
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

export default upload;