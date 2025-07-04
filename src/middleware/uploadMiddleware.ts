import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (request, file, callback) => {
    callback(null, 'uploads/');
  },
  filename: (request, file, callback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    callback(null, 'book-' + uniqueSuffix + extension);
  }
});

const fileFilter = (request: any, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
  const allowedTypes = ['.pdf', '.epub', '.fb2'];
  const extension = path.extname(file.originalname).toLowerCase();
  allowedTypes.includes(extension) ? callback(null, true) : callback(new Error('Непідтримуваний формат файлу'));
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }
});

export default upload;