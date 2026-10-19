import { Request, Response } from 'express';
import crypto from 'crypto';
import { Department } from '../models/Department';
import { User, UserSession } from '../models/User';
import { Role, Permission, IPermission } from '../models/Role';
import { Invitation } from '../models/Invitation';
import { AuditLog } from '../models/AuditLog';
import { AuditService } from '../services/audit.service';
import { GRANULAR_PERMISSIONS_CATALOG, MANDATORY_SUPER_ADMIN_PERMISSIONS } from '@ricozbooks/shared';

export class DeveloperController {
  static async getStatus(_req: Request, res: Response) {
    const totalUsers = await User.countDocuments();
    const activeDepts = await Department.countDocuments({ is_active: true });
    const auditCount = await AuditLog.countDocuments();

    return res.json({
      status: 'online',
      platform_version: '1.3.0',
      database: 'connected (MongoDB)',
      metrics: {
        total_users: totalUsers,
        active_departments: activeDepts,
        audit_events: auditCount,
      },
    });
  }

  static async getDashboardMetrics(_req: Request, res: Response) {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ is_active: true });
    const suspendedUsers = await User.countDocuments({ is_active: false });
    const totalRoles = await Role.countDocuments();
    const totalDepartments = await Department.countDocuments();
    const pendingInvitations = await Invitation.countDocuments({ status: 'PENDING' });
    const totalAuditEvents = await AuditLog.countDocuments();

    return res.json({
      total_users: totalUsers,
      active_users: activeUsers,
      suspended_users: suspendedUsers,
      total_departments: totalDepartments,
      total_roles: totalRoles,
      pending_invitations: pendingInvitations,
      total_audit_events: totalAuditEvents,
      system_health: 'OPTIMAL',
    });
  }

  // --- Department Governance ---
  static async getDepartments(_req: Request, res: Response) {
    const departments = await Department.find().sort({ code: 1 }).populate('head_user_id', 'full_name email job_title');
    
    const enriched = await Promise.all(
      departments.map(async (d) => {
        const memberCount = await User.countDocuments({ department_id: d._id });
        return {
          id: d._id,
          code: d.code,
          name: d.name,
          description: d.description,
          is_active: d.is_active,
          head: d.head_user_id ? {
            id: (d.head_user_id as any)._id,
            name: (d.head_user_id as any).full_name,
            email: (d.head_user_id as any).email,
            job_title: (d.head_user_id as any).job_title,
          } : null,
          member_count: memberCount,
          created_at: d.created_at,
        };
      })
    );

    return res.json(enriched);
  }

  static async getDepartmentById(req: Request, res: Response) {
    const dept = await Department.findById(req.params.id).populate('head_user_id', 'full_name email job_title');
    if (!dept) {
      return res.status(404).json({ detail: 'Department not found' });
    }
    const memberCount = await User.countDocuments({ department_id: dept._id });
    return res.json({
      id: dept._id,
      code: dept.code,
      name: dept.name,
      description: dept.description,
      is_active: dept.is_active,
      head: dept.head_user_id ? {
        id: (dept.head_user_id as any)._id,
        name: (dept.head_user_id as any).full_name,
        email: (dept.head_user_id as any).email,
        job_title: (dept.head_user_id as any).job_title,
      } : null,
      member_count: memberCount,
      created_at: dept.created_at,
    });
  }

  static async updateDepartment(req: Request, res: Response) {
    const { name, description, is_active } = req.body;
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ detail: 'Department not found' });

    if (name) dept.name = name;
    if (description !== undefined) dept.description = description;
    if (is_active !== undefined) dept.is_active = is_active;
    await dept.save();

    await AuditService.logEvent({
      req,
      action: 'DEPARTMENT_UPDATED',
      recordType: 'DEPARTMENT',
      recordId: String(dept._id),
      details: { code: dept.code, name: dept.name, is_active: dept.is_active },
    });

    return res.json(dept);
  }

  static async assignDepartmentHead(req: Request, res: Response) {
    const { user_id } = req.body;
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ detail: 'Department not found' });

    let user = null;
    if (user_id) {
      user = await User.findById(user_id);
      if (!user) return res.status(404).json({ detail: 'Target user not found' });
      user.department_id = dept._id as any;
      await user.save();
    }

    dept.head_user_id = user ? (user._id as any) : null;
    await dept.save();

    await AuditService.logEvent({
      req,
      action: 'DEPARTMENT_HEAD_ASSIGNED',
      recordType: 'DEPARTMENT',
      recordId: String(dept._id),
      details: { department: dept.code, head_user: user?.email || null },
    });

    return res.json({ message: 'Department head assignment updated successfully', head: user ? { id: user._id, name: user.full_name, email: user.email } : null });
  }

  static async getDepartmentMembers(req: Request, res: Response) {
    const members = await User.find({ department_id: req.params.id }).select('full_name email role job_title is_active created_at');
    return res.json(members.map((m) => ({
      id: m._id,
      name: m.full_name,
      email: m.email,
      role: m.role,
      job_title: m.job_title,
      is_active: m.is_active,
      created_at: m.created_at,
    })));
  }

  // --- User Lifecycle & Suspension ---
  static async getUsers(req: Request, res: Response) {
    const { department_id, search, role, status } = req.query;
    const filter: any = {};

    if (department_id) filter.department_id = department_id;
    if (role) filter.role = role;
    if (status === 'ACTIVE') filter.is_active = true;
    if (status === 'SUSPENDED') filter.is_active = false;
    if (search) {
      const regex = new RegExp(String(search), 'i');
      filter.$or = [{ full_name: regex }, { email: regex }];
    }

    const users = await User.find(filter).sort({ created_at: -1 }).populate('department_id', 'code name');
    return res.json({
      items: users.map((u) => ({
        id: u._id,
        email: u.email,
        full_name: u.full_name,
        role: u.role,
        is_active: u.is_active,
        is_superuser: u.is_superuser,
        department: u.department_id ? {
          id: (u.department_id as any)._id,
          code: (u.department_id as any).code,
          name: (u.department_id as any).name,
        } : null,
        job_title: u.job_title,
        created_at: u.created_at,
      })),
      total: users.length,
    });
  }

  static async suspendUser(req: Request, res: Response) {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ detail: 'User not found' });

    if (user.is_superuser) {
      return res.status(400).json({ detail: 'Super Administrator accounts cannot be suspended' });
    }

    user.is_active = false;
    await user.save();

    // Terminate all active sessions immediately
    await UserSession.updateMany({ user_id: user._id }, { $set: { is_active: false } });

    await AuditService.logEvent({
      req,
      action: 'USER_SUSPENDED',
      recordType: 'USER',
      recordId: String(user._id),
      details: { email: user.email, reason: req.body.reason || 'Administrative suspension' },
    });

    return res.json({ message: `User '${user.email}' suspended and all active sessions revoked immediately` });
  }

  static async reactivateUser(req: Request, res: Response) {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ detail: 'User not found' });

    user.is_active = true;
    await user.save();

    await AuditService.logEvent({
      req,
      action: 'USER_REACTIVATED',
      recordType: 'USER',
      recordId: String(user._id),
      details: { email: user.email },
    });

    return res.json({ message: `User '${user.email}' reactivated successfully` });
  }

  // --- Role & Permissions Matrix ---
  static async getRoles(_req: Request, res: Response) {
    const roles = await Role.find().sort({ is_system: -1, name: 1 });
    return res.json(roles.map((r) => ({
      id: r._id,
      name: r.name,
      description: r.description,
      permissions: r.permissions,
      is_system: r.is_system,
    })));
  }

  static async getPermissions(_req: Request, res: Response) {
    const permissions = await Permission.find().sort({ module: 1, code: 1 });
    return res.json(permissions.map((p: IPermission) => ({
      code: p.code,
      name: p.name,
      module: p.module,
      description: p.description,
    })));
  }

  static async updateRolePermissions(req: Request, res: Response) {
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ detail: 'Permissions must be an array of permission codes' });
    }

    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ detail: 'Role not found' });

    // Mandatory Super Admin protection lock
    if (role.name === 'SUPER_ADMIN') {
      for (const requiredPerm of MANDATORY_SUPER_ADMIN_PERMISSIONS) {
        if (!permissions.includes(requiredPerm)) {
          return res.status(400).json({
            detail: `Mandatory security violation: Cannot strip core permission '${requiredPerm}' from SUPER_ADMIN`,
          });
        }
      }
    }

    role.permissions = permissions;
    await role.save();

    await AuditService.logEvent({
      req,
      action: 'ROLE_PERMISSIONS_UPDATED',
      recordType: 'ROLE',
      recordId: String(role._id),
      details: { role: role.name, permissions_count: permissions.length },
    });

    return res.json({ message: `Permissions for role '${role.name}' updated successfully`, role });
  }

  // --- Invitations ---
  static async getInvitations(req: Request, res: Response) {
    const { department_id, status } = req.query;
    const filter: any = {};
    if (department_id) filter.department_id = department_id;
    if (status) filter.status = status;

    const invitations = await Invitation.find(filter).sort({ created_at: -1 }).populate('department_id', 'code name');
    return res.json({
      items: invitations.map((inv) => ({
        id: inv._id,
        email: inv.email,
        role: inv.role,
        department: inv.department_id ? {
          id: (inv.department_id as any)._id,
          code: (inv.department_id as any).code,
          name: (inv.department_id as any).name,
        } : null,
        status: inv.status,
        email_status: inv.email_status,
        expires_at: inv.expires_at,
        created_at: inv.created_at,
        invitation_url: `${req.protocol}://${req.get('host')}/invite/${inv.token}`,
      })),
      total: invitations.length,
    });
  }

  static async createInvitation(req: Request, res: Response) {
    const { email, department_id, role } = req.body;
    if (!email || !role) {
      return res.status(400).json({ detail: 'Email and role are required' });
    }

    // Cross-department check for department heads
    if (!req.user?.is_superuser && req.user?.department_id) {
      if (department_id && String(req.user.department_id) !== String(department_id)) {
        return res.status(403).json({ detail: 'Cross-department invitation violation: You may only invite members to your own department' });
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await Invitation.create({
      email: email.toLowerCase().trim(),
      department_id: department_id || null,
      role,
      token,
      invited_by_user_id: req.user?._id,
      status: 'PENDING',
      email_status: 'NOT_CONFIGURED',
      expires_at: expiresAt,
    });

    const invitationUrl = `${req.protocol}://${req.get('host')}/invite/${token}`;

    await AuditService.logEvent({
      req,
      action: 'DEPARTMENT_INVITATION_ISSUED',
      recordType: 'INVITATION',
      recordId: String(invitation._id),
      details: { email: invitation.email, role, department_id },
    });

    return res.status(201).json({
      id: invitation._id,
      email: invitation.email,
      role: invitation.role,
      invitation_url: invitationUrl,
      status: invitation.status,
      expires_at: invitation.expires_at,
    });
  }

  // --- Immutable Central Audit Trail ---
  static async getAuditLogs(req: Request, res: Response) {
    const { search, action, record_type, start_date, end_date, page = '1', limit = '50' } = req.query;
    const filter: any = {};

    if (action) filter.action = action;
    if (record_type) filter.record_type = record_type;
    if (start_date || end_date) {
      filter.timestamp = {};
      if (start_date) filter.timestamp.$gte = new Date(String(start_date));
      if (end_date) filter.timestamp.$lte = new Date(String(end_date));
    }
    if (search) {
      const regex = new RegExp(String(search), 'i');
      filter.$or = [{ action: regex }, { record_type: regex }, { user_email: regex }, { details: regex }];
    }

    const pageNum = parseInt(String(page), 10) || 1;
    const limitNum = parseInt(String(limit), 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limitNum);

    return res.json({
      items: logs.map((l) => ({
        id: l._id,
        user_id: l.user_id,
        user_email: l.user_email,
        action: l.action,
        record_type: l.record_type,
        record_id: l.record_id,
        details: l.details,
        ip_address: l.ip_address,
        user_agent: l.user_agent,
        timestamp: l.timestamp,
      })),
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
    });
  }

  static async getAuditLogDetail(req: Request, res: Response) {
    const log = await AuditLog.findById(req.params.id);
    if (!log) return res.status(404).json({ detail: 'Audit log record not found' });
    return res.json(log);
  }
}
