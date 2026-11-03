import { Router } from 'express';
import { InternalDemoController } from '../controllers/internalDemo.controller';

const router = Router();

// Public booking endpoint
router.post('/demos', InternalDemoController.submitPublicDemo);

// Internal Auth
router.post('/internal/auth/login', InternalDemoController.login);
router.get('/internal/auth/me', InternalDemoController.getMe);
router.post('/internal/auth/logout', InternalDemoController.logout);

// Internal Dashboard & Demos
router.get('/internal/dashboard/stats', InternalDemoController.getStats);
router.get('/internal/dashboard/recent-demos', InternalDemoController.getRecentDemos);
router.get('/internal/dashboard/upcoming-demos', InternalDemoController.getUpcomingDemos);

router.get('/internal/demos', InternalDemoController.listDemos);
router.get('/internal/demos/:id', InternalDemoController.getDemoDetail);
router.patch('/internal/demos/:id/status', InternalDemoController.updateStatus);
router.patch('/internal/demos/:id/assign', InternalDemoController.assignDemo);
router.post('/internal/demos/:id/reschedule', InternalDemoController.rescheduleDemo);

router.get('/internal/users', InternalDemoController.getUsers);

export default router;
