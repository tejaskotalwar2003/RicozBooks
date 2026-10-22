import { Router } from 'express';
import { JournalController } from '../controllers/journal.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', JournalController.listJournals);
router.post('/', requirePermission('journals:create'), JournalController.createJournal);
router.get('/:id', JournalController.getJournal);
router.post('/:id/submit', requirePermission('journals:submit'), JournalController.submitJournal);
router.post('/:id/approve', requirePermission('journals:approve'), JournalController.approveJournal);
router.post('/:id/reject', requirePermission('journals:reject'), JournalController.rejectJournal);
router.post('/:id/reopen', requirePermission('journals:submit'), JournalController.reopenJournal);
router.post('/:id/post', requirePermission('journals:post'), JournalController.postJournal);
router.post('/:id/reverse', requirePermission('journals:reverse'), JournalController.reverseJournal);

export default router;

