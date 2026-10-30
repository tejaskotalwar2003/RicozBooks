import { Request, Response } from 'express';
import crypto from 'crypto';
import { Organization, Entity } from '../models/Organization';
import { User } from '../models/User';
import { Invitation } from '../models/Invitation';
import { Role } from '../models/Role';
import { hashPassword, generateToken } from '../utils/security';
import { AuditService } from '../services/audit.service';
import { InvitationStatus } from '@ricozbooks/shared';
import { TenantService } from '../services/tenant.service';

export class TenantController {
  public static async registerCompany(req: Request, res: Response) {
    return TenantService.registerCompany(req, res);
  }

  public static async getTenantCompany(req: Request, res: Response) {
    return TenantService.getTenantCompany(req, res);
  }
  public static async getCurrentTenant(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      let companyId = user?.default_company_id;
      if (!companyId) {
        const defaultOrg = await Organization.findOne({ is_active: true });
        companyId = defaultOrg?._id;
      }

      const company = await Organization.findById(companyId);
      const entities = await Entity.find({ company_id: companyId, is_active: true });

      const roleObj = await Role.findOne({ name: user.role });
      const permissions = user.is_superuser
        ? ['*']
        : (roleObj?.permissions || []);

      return res.json({
        company: company ? {
          id: company._id,
          name: company.name,
          legal_name: company.legal_name,
          currency: company.currency,
          country: company.country,
          entities: entities.map((e) => ({
            id: e._id,
            name: e.name,
            code: e.tax_identifier,
            tax_identifier: e.tax_identifier,
            currency: e.currency,
            base_currency: e.currency,
            is_active: e.is_active,
          })),
        } : null,
        entities,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.full_name?.split(' ')[0] || user.full_name,
          last_name: user.full_name?.split(' ').slice(1).join(' ') || '',
          role: user.role,
          roles: [user.role],
          permissions,
          default_company_id: user.default_company_id,
          default_entity_id: user.default_entity_id,
          is_superuser: user.is_superuser,
        },
      });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ detail: err.message });
    }
  }

  public static async getMembers(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const companyId = user?.default_company_id;
      const query: any = { is_active: true };
      if (companyId) {
        query.$or = [{ default_company_id: companyId }, { companies: companyId }];
      }

      const members = await User.find(query).select('-password_hash');
      return res.json(
        members.map((m) => ({
          id: m._id,
          email: m.email,
          full_name: m.full_name,
          role: m.role,
          job_title: m.job_title,
          is_active: m.is_active,
          created_at: m.created_at,
        }))
      );
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ detail: err.message });
    }
  }

  public static async getInvitations(req: Request, res: Response) {
    try {
      const invitations = await Invitation.find().sort({ created_at: -1 });
      return res.json(invitations);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ detail: err.message });
    }
  }

  public static async createInvitation(req: Request, res: Response) {
    try {
      const { email, role = 'MEMBER', department_id } = req.body;
      if (!email) {
        return res.status(400).json({ detail: 'Email is required' });
      }

      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingUser) {
        return res.status(409).json({ detail: 'A user with this email already exists.' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const invitation = await Invitation.create({
        email: email.toLowerCase().trim(),
        role,
        department_id: department_id || null,
        token,
        status: InvitationStatus.PENDING,
        expires_at: expiresAt,
        invited_by: (req as any).user?.id,
      });

      await AuditService.logEvent({
        req,
        userId: (req as any).user?.id,
        userEmail: (req as any).user?.email,
        action: 'TENANT_INVITATION_CREATED',
        recordType: 'INVITATION',
        recordId: String(invitation._id),
        details: { email, role },
      });

      return res.status(201).json({
        ...invitation.toJSON(),
        invitation_url: `/accept-invitation?token=${token}`,
      });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ detail: err.message });
    }
  }

  public static async validateInvitationToken(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const invitation = await Invitation.findOne({ token });
      if (!invitation) {
        return res.status(404).json({ detail: 'Invitation not found or token invalid' });
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        return res.status(400).json({ detail: `Invitation has already been ${invitation.status.toLowerCase()}` });
      }

      if (invitation.expires_at < new Date()) {
        return res.status(400).json({ detail: 'Invitation link has expired' });
      }

      return res.json({
        valid: true,
        email: invitation.email,
        role: invitation.role,
        company_name: 'RicozBooks Workspace',
      });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ detail: err.message });
    }
  }

  public static async acceptInvitation(req: Request, res: Response) {
    try {
      const { token, full_name, password } = req.body;
      if (!token || !password || !full_name) {
        return res.status(400).json({ detail: 'Token, full name, and password are required' });
      }

      const invitation = await Invitation.findOne({ token });
      if (!invitation || invitation.status !== InvitationStatus.PENDING) {
        return res.status(400).json({ detail: 'Invalid or already consumed invitation token' });
      }

      const defaultOrg = await Organization.findOne({ is_active: true });
      const defaultEnt = await Entity.findOne({ is_active: true });

      const passwordHash = await hashPassword(password);
      const user = await User.create({
        email: invitation.email,
        password_hash: passwordHash,
        full_name: full_name.trim(),
        role: invitation.role || 'MEMBER',
        is_active: true,
        is_superuser: false,
        department_id: invitation.department_id || null,
        default_company_id: defaultOrg?._id || null,
        default_entity_id: defaultEnt?._id || null,
        companies: defaultOrg ? [defaultOrg._id] : [],
        entities: defaultEnt ? [defaultEnt._id] : [],
      });

      invitation.status = InvitationStatus.ACCEPTED;
      await invitation.save();

      const accessToken = generateToken({
        sub: String(user._id),
        email: user.email,
        role: user.role,
        is_superuser: false,
        department_id: user.department_id ? String(user.department_id) : null,
      });

      await AuditService.logEvent({
        req,
        userId: user._id,
        userEmail: user.email,
        action: 'INVITATION_ACCEPTED',
        recordType: 'USER',
        recordId: String(user._id),
        details: { email: user.email, role: user.role },
      });

      return res.json({
        message: 'Invitation accepted successfully',
        access_token: accessToken,
        token_type: 'bearer',
        user: {
          id: user._id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
      });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ detail: err.message });
    }
  }

  public static async resendInvitation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const invitation = await Invitation.findById(id);
      if (!invitation) {
        return res.status(404).json({ detail: 'Invitation not found' });
      }

      invitation.token = crypto.randomBytes(32).toString('hex');
      invitation.expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      invitation.status = InvitationStatus.PENDING;
      await invitation.save();

      return res.json({
        message: 'Invitation resent successfully',
        invitation_url: `/accept-invitation?token=${invitation.token}`,
      });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ detail: err.message });
    }
  }

  public static async revokeInvitation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const invitation = await Invitation.findByIdAndUpdate(
        id,
        { $set: { status: InvitationStatus.REVOKED } },
        { new: true }
      );
      if (!invitation) {
        return res.status(404).json({ detail: 'Invitation not found' });
      }

      return res.json({ message: 'Invitation revoked successfully', status: 'REVOKED' });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ detail: err.message });
    }
  }
}

