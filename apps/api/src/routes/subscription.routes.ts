import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// /plans is public or authenticated
router.get('/plans', SubscriptionController.getPlans);

router.use(authenticate);
router.get('/current', SubscriptionController.getCurrentSubscription);
router.post('/upgrade', SubscriptionController.upgradePlan);

export default router;
