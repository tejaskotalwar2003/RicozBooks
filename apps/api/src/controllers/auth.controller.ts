import { Request, Response } from 'express';
import crypto from 'crypto';
import { User, UserSession } from '../models/User';
import { Organization, Entity } from '../models/Organization';
import { Role } from '../models/Role';
import { DemoRequest } from '../models/DemoAdminUser';
import { hashPassword, verifyPassword, generateToken, generateRefreshToken } from '../utils/security';
import { AuditService } from '../services/audit.service';
import { TenantController } from './tenant.controller';

export class AuthController {
  static async login(req: Request, res: Response) {
    const { email, password, remember_me } = req.body;
    if (!email || !password) {
      return res.status(400).json({ detail: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ detail: 'Invalid email or password' });
    }

    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ detail: 'Invalid email or password' });
    }

    if (!user.is_active) {
      return res.status(403).json({ detail: 'Account is suspended or deactivated. Contact platform administrator.' });
    }

    // Create session tracking record
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const refreshToken = generateRefreshToken();
    const userAgent = (req.headers['user-agent'] as string) || 'Web Browser';
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';

    const remember = Boolean(remember_me);
    const refreshDays = remember ? 30 : 1;
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    await UserSession.create({
      user_id: user._id,
      session_token: sessionToken,
      refresh_token: refreshToken,
      browser: userAgent.includes('Chrome') ? 'Google Chrome' : userAgent.includes('Firefox') ? 'Mozilla Firefox' : 'Web Browser',
      device: userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop PC',
      os: userAgent.includes('Windows') ? 'Windows' : userAgent.includes('Mac') ? 'macOS' : 'Linux',
      ip_address: ip,
      is_active: true,
      remember_me: remember,
      expires_at: expiresAt,
      last_active_at: new Date(),
    });

    // Access token is short-lived (1 hour); refresh token grants persistent session
    const accessToken = generateToken({
      sub: String(user._id),
      email: user.email,
      role: user.role,
      is_superuser: user.is_superuser,
      company_id: user.default_company_id ? String(user.default_company_id) : null,
      entity_id: user.default_entity_id ? String(user.default_entity_id) : null,
      department_id: user.department_id ? String(user.department_id) : null,
    }, '1h');

    await AuditService.logEvent({
      req,
      userId: user._id,
      userEmail: user.email,
      action: 'USER_LOGIN',
      recordType: 'USER',
      recordId: String(user._id),
      details: { role: user.role, remember_me: remember },
    });

    const nameParts = (user.full_name || '').split(' ');
    const firstName = nameParts[0] || user.email.split('@')[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    return res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_in: 3600,
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        first_name: firstName,
        last_name: lastName,
        role: user.role,
        roles: [user.role],
        job_title: user.job_title || 'Finance Team',
        profile_photo_url: user.profile_photo_url || null,
        is_superuser: user.is_superuser,
        default_company_id: user.default_company_id,
        default_entity_id: user.default_entity_id,
      },
    });
  }

  static async developerLogin(req: Request, res: Response) {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ detail: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ detail: 'Invalid developer credentials' });
    }

    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ detail: 'Invalid developer credentials' });
    }

    if (!user.is_superuser) {
      return res.status(403).json({ detail: 'Platform Super Administrator privileges required to access developer console' });
    }

    if (!user.is_active) {
      return res.status(403).json({ detail: 'Super Administrator account is deactivated' });
    }

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const refreshToken = generateRefreshToken();
    const userAgent = (req.headers['user-agent'] as string) || 'Web Browser';
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';

    await UserSession.create({
      user_id: user._id,
      session_token: sessionToken,
      refresh_token: refreshToken,
      browser: userAgent.includes('Chrome') ? 'Google Chrome' : userAgent.includes('Firefox') ? 'Mozilla Firefox' : 'Web Browser',
      device: userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop PC',
      os: userAgent.includes('Windows') ? 'Windows' : userAgent.includes('Mac') ? 'macOS' : 'Linux',
      ip_address: ip,
      is_active: true,
      remember_me: false,
      expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours for admin console
      last_active_at: new Date(),
    });

    const token = generateToken({
      sub: String(user._id),
      email: user.email,
      role: 'SUPER_ADMIN',
      is_superuser: true,
      department_id: user.department_id ? String(user.department_id) : null,
    }, '1h');

    await AuditService.logEvent({
      req,
      userId: user._id,
      userEmail: user.email,
      action: 'DEVELOPER_LOGIN',
      recordType: 'USER',
      recordId: String(user._id),
      details: { console: 'DEVELOPER_CONSOLE' },
    });

    const nameParts = (user.full_name || '').split(' ');
    const firstName = nameParts[0] || user.email.split('@')[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    return res.json({
      access_token: token,
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_in: 3600,
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        first_name: firstName,
        last_name: lastName,
        role: 'SUPER_ADMIN',
        roles: ['SUPER_ADMIN'],
        job_title: user.job_title || 'Platform Super Admin',
        profile_photo_url: user.profile_photo_url || null,
        is_superuser: true,
      },
    });
  }

  static async registerCompany(req: Request, res: Response) {
    return TenantController.registerCompany(req, res);
  }

  static async getMe(req: Request, res: Response) {
    if (!req.user) return res.status(401).json({ detail: 'Authentication required' });

    let permissions: string[] = [];
    if (req.user.is_superuser) {
      const allPerms = await Role.findOne({ name: 'SUPER_ADMIN' });
      permissions = allPerms ? allPerms.permissions : [];
    } else {
      const roleDoc = await Role.findOne({ name: req.user.role });
      permissions = roleDoc ? roleDoc.permissions : [];
    }

    const nameParts = (req.user.full_name || '').split(' ');
    const firstName = nameParts[0] || req.user.email.split('@')[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    return res.json({
      id: req.user._id,
      email: req.user.email,
      full_name: req.user.full_name,
      first_name: firstName,
      last_name: lastName,
      role: req.user.role,
      roles: [req.user.role],
      is_superuser: req.user.is_superuser,
      is_active: req.user.is_active,
      default_company_id: req.user.default_company_id,
      default_entity_id: req.user.default_entity_id,
      job_title: req.user.job_title || 'Finance Team',
      phone_number: req.user.phone_number,
      permissions,
      profile_photo_url: req.user.profile_photo_url || null,
    });
  }

  static async updateMe(req: Request, res: Response) {
    if (!req.user) return res.status(401).json({ detail: 'Authentication required' });
    const { full_name, job_title, phone_number, default_company_id, default_entity_id } = req.body;

    if (full_name) req.user.full_name = full_name;
    if (job_title !== undefined) req.user.job_title = job_title;
    if (phone_number !== undefined) req.user.phone_number = phone_number;
    if (default_company_id) req.user.default_company_id = default_company_id;
    if (default_entity_id) req.user.default_entity_id = default_entity_id;

    await req.user.save();
    return res.json(req.user);
  }

  static async changePassword(req: Request, res: Response) {
    if (!req.user) return res.status(401).json({ detail: 'Authentication required' });
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ detail: 'Current and new passwords are required' });
    }

    const isMatch = await verifyPassword(current_password, req.user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ detail: 'Incorrect current password' });
    }

    req.user.password_hash = await hashPassword(new_password);
    await req.user.save();

    await AuditService.logEvent({
      req,
      action: 'PASSWORD_CHANGED',
      recordType: 'USER',
      recordId: String(req.user._id),
      details: { email: req.user.email },
    });

    return res.json({ message: 'Password updated successfully' });
  }

  static async getSessions(req: Request, res: Response) {
    if (!req.user) return res.status(401).json({ detail: 'Authentication required' });
    const sessions = await UserSession.find({ user_id: req.user._id, is_active: true }).sort({ last_active_at: -1 });
    return res.json(sessions);
  }

  static async revokeSession(req: Request, res: Response) {
    if (!req.user) return res.status(401).json({ detail: 'Authentication required' });
    const session = await UserSession.findOne({ _id: req.params.id, user_id: req.user._id });
    if (!session) return res.status(404).json({ detail: 'Session not found' });

    session.is_active = false;
    await session.save();
    return res.json({ message: 'Session revoked successfully' });
  }

  static async revokeOtherSessions(req: Request, res: Response) {
    if (!req.user) return res.status(401).json({ detail: 'Authentication required' });
    await UserSession.updateMany(
      { user_id: req.user._id },
      { $set: { is_active: false } }
    );
    return res.json({ message: 'All other sessions have been revoked' });
  }

  static async requestDemo(req: Request, res: Response) {
    const { full_name, work_email, phone, company, role, entities_count, interest_area, preferred_date, preferred_time } = req.body;
    if (!full_name || !work_email || !phone || !company) {
      return res.status(400).json({ detail: 'Name, email, phone, and company are required' });
    }

    const refCode = `DEMO-${Math.floor(100000 + Math.random() * 900000)}`;
    const demoReq = await DemoRequest.create({
      reference_code: refCode,
      full_name,
      work_email,
      phone,
      company,
      role: role || 'Business Leader',
      entities_count: entities_count || '1',
      interest_area: interest_area || 'Complete Platform Demo',
      preferred_date: preferred_date ? new Date(preferred_date) : undefined,
      preferred_time: preferred_time || '11:00 AM IST',
      status: 'NEW',
    });

    return res.status(201).json({
      reference_code: demoReq.reference_code,
      message: 'Demo request received. Our coordinator will contact you shortly.',
    });
  }

  static async refreshToken(req: Request, res: Response) {
    const refreshToken = req.body?.refresh_token || (req.headers['x-refresh-token'] as string);
    if (!refreshToken) {
      return res.status(400).json({ detail: 'Refresh token is required' });
    }

    const session = await UserSession.findOne({
      refresh_token: refreshToken,
      is_active: true,
    });

    if (!session) {
      return res.status(401).json({ detail: 'Session expired or invalid. Please sign in again.' });
    }

    if (session.expires_at && session.expires_at < new Date()) {
      session.is_active = false;
      await session.save();
      return res.status(401).json({ detail: 'Session expired. Please sign in again.' });
    }

    const user = await User.findById(session.user_id);
    if (!user || !user.is_active) {
      session.is_active = false;
      await session.save();
      return res.status(401).json({ detail: 'Account is deactivated or no longer exists' });
    }

    // Refresh-token rotation: issue new access token and rotated refresh token
    const newAccessToken = generateToken({
      sub: String(user._id),
      email: user.email,
      role: user.role,
      is_superuser: user.is_superuser,
      company_id: user.default_company_id ? String(user.default_company_id) : null,
      entity_id: user.default_entity_id ? String(user.default_entity_id) : null,
      department_id: user.department_id ? String(user.department_id) : null,
    }, '1h');

    const newRefreshToken = generateRefreshToken();
    const refreshDays = session.remember_me ? 30 : 1;
    session.refresh_token = newRefreshToken;
    session.last_active_at = new Date();
    session.expires_at = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);
    await session.save();

    const nameParts = (user.full_name || '').split(' ');
    const firstName = nameParts[0] || user.email.split('@')[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    return res.json({
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_type: 'bearer',
      expires_in: 3600,
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        first_name: firstName,
        last_name: lastName,
        role: user.role,
        roles: [user.role],
        job_title: user.job_title || 'Finance Team',
        profile_photo_url: user.profile_photo_url || null,
        is_superuser: user.is_superuser,
        default_company_id: user.default_company_id,
        default_entity_id: user.default_entity_id,
      },
    });
  }

  static async logout(req: Request, res: Response) {
    const refreshToken = req.body?.refresh_token || (req.headers['x-refresh-token'] as string);
    if (refreshToken) {
      await UserSession.updateOne(
        { refresh_token: refreshToken },
        { $set: { is_active: false } }
      );
    }

    const userIdToRevoke = req.user?._id || req.tokenPayload?.sub;
    if (userIdToRevoke) {
      await UserSession.updateMany(
        { user_id: userIdToRevoke, is_active: true },
        { $set: { is_active: false } }
      );
    }

    if (req.user) {
      await AuditService.logEvent({
        req,
        userId: req.user._id,
        userEmail: req.user.email,
        action: 'USER_LOGOUT',
        recordType: 'USER',
        recordId: String(req.user._id),
        details: { manual: true },
      });
    }

    return res.json({ message: 'Logged out successfully' });
  }
}

