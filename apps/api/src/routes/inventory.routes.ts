import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/valuation', InventoryController.getValuation);
router.get('/movements', InventoryController.listMovements);
router.get('/adjustments', InventoryController.listAdjustments);
router.post('/adjustments', InventoryController.createAdjustment);

export default router;
