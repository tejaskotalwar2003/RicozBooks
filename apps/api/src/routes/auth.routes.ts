import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/login', AuthController.login);
router.post('/register-company', AuthController.registerCompany);
router.post('/developer/login', AuthController.developerLogin);
router.post('/demo-request', AuthController.requestDemo);

// Protected routes
router.get('/me', requireAuth, AuthController.getMe);
router.put('/me', requireAuth, AuthController.updateMe);
router.post('/change-password', requireAuth, AuthController.changePassword);
router.get('/sessions', requireAuth, AuthController.getSessions);
router.delete('/sessions/:id', requireAuth, AuthController.revokeSession);
router.post('/sessions/sign-out-others', requireAuth, AuthController.revokeOtherSessions);

export default router;
