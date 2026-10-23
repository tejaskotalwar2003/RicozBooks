import { Router } from 'express';
import { TenantController } from '../controllers/tenant.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';

const router = Router();

// Public routes for invitation verification and acceptance
router.get('/invitations/validate/:token', TenantController.validateInvitationToken);
router.post('/invitations/accept', TenantController.acceptInvitation);

// Protected routes
router.get('/current', requireAuth, TenantController.getCurrentTenant);
router.get('/members', requireAuth, TenantController.getMembers);
router.get('/invitations', requireAuth, requirePermission('tenants:manage'), TenantController.getInvitations);
router.post('/invitations', requireAuth, requirePermission('tenants:manage'), TenantController.createInvitation);
router.post('/invitations/:id/resend', requireAuth, requirePermission('tenants:manage'), TenantController.resendInvitation);
router.delete('/invitations/:id', requireAuth, requirePermission('tenants:manage'), TenantController.revokeInvitation);

export default router;
