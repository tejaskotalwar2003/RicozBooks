import { Router } from 'express';
import { DeveloperController } from '../controllers/developer.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireSuperAdmin, requirePermission } from '../middleware/rbac.middleware';

const router = Router();

// Apply auth to all developer console routes
router.use(requireAuth);

// Platform Status & Metrics
router.get('/status', requireSuperAdmin, DeveloperController.getStatus);
router.get('/dashboard/metrics', requireSuperAdmin, DeveloperController.getDashboardMetrics);

// Department Management
router.get('/departments', requirePermission('departments:read'), DeveloperController.getDepartments);
router.get('/departments/:id', requirePermission('departments:read'), DeveloperController.getDepartmentById);
router.put('/departments/:id', requirePermission('departments:manage'), DeveloperController.updateDepartment);
router.post('/departments/:id/head', requireSuperAdmin, DeveloperController.assignDepartmentHead);
router.get('/departments/:id/members', requirePermission('departments:read'), DeveloperController.getDepartmentMembers);

// User Management & Lifecycle
router.get('/users', requirePermission('users:read'), DeveloperController.getUsers);
router.post('/users/:id/suspend', requirePermission('users:suspend'), DeveloperController.suspendUser);
router.post('/users/:id/reactivate', requirePermission('users:manage'), DeveloperController.reactivateUser);

// Roles & Granular Permissions Matrix
router.get('/roles', requirePermission('roles:read'), DeveloperController.getRoles);
router.get('/permissions', requirePermission('roles:read'), DeveloperController.getPermissions);
router.put('/roles/:id/permissions', requirePermission('roles:manage'), DeveloperController.updateRolePermissions);

// Departmental Invitations
router.get('/invitations', requirePermission('invitations:manage'), DeveloperController.getInvitations);
router.post('/invitations', requirePermission('invitations:manage'), DeveloperController.createInvitation);

// Immutable Central Audit Trail (GET only - DELETE, PUT, PATCH rejected by omission)
router.get('/audit-logs', requirePermission('audit:read'), DeveloperController.getAuditLogs);
router.get('/audit-logs/:id', requirePermission('audit:read'), DeveloperController.getAuditLogDetail);

export default router;

