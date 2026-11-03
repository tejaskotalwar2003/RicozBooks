import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Exchange rates
router.get('/exchange-rates', SettingsController.getExchangeRates);
router.post('/exchange-rates', SettingsController.upsertExchangeRate);
router.put('/exchange-rates/:rateId', SettingsController.updateExchangeRate);
router.delete('/exchange-rates/:rateId', SettingsController.deleteExchangeRate);

// Fiscal periods
router.get('/fiscal-periods', SettingsController.getFiscalPeriods);
router.post('/fiscal-periods/generate-year', SettingsController.generateFiscalYear);

// Roles matrix
router.get('/roles-matrix', SettingsController.getRolesMatrix);
router.put('/roles-matrix', SettingsController.updateRolePermissions);

// Entity tax profile
router.get('/entity-profile/:entityId', SettingsController.getEntityTaxProfile);
router.put('/entity-profile/:entityId', SettingsController.updateEntityTaxProfile);

export default router;
