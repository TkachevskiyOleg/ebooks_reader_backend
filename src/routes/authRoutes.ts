import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import AuthController from '../controllers/AuthController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', AuthController.register);
router.post('/login', loginLimiter, AuthController.login);
router.post('/refresh', AuthController.refresh);
router.get('/verify-email', AuthController.verifyEmail);
router.post('/resend-verification', AuthController.resendVerification);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.get('/me', authMiddleware, AuthController.me);
router.post('/admin/update-role', authMiddleware, AuthController.updateUserRole);

export default router; 