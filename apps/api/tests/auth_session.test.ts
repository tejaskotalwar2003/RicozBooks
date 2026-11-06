import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { User, UserSession } from '../src/models/User';
import { AuditService } from '../src/services/audit.service';
import * as security from '../src/utils/security';

describe('Authentication, Logout & Persistent Session Management Tests', () => {
  const app = createApp();

  beforeEach(() => {
    jest.spyOn(AuditService, 'logEvent').mockResolvedValue();
    jest.spyOn(AuditService, 'log').mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/v1/auth/login', () => {
    const dummyUserId = new mongoose.Types.ObjectId();

    it('should authenticate valid user and return 1-hour access_token and secure refresh_token', async () => {
      const mockUser = {
        _id: dummyUserId,
        email: 'finance.lead@ricoz.in',
        password_hash: 'hashed_pw_secret',
        full_name: 'Aditi Verma',
        role: 'ADMIN',
        department: 'FINANCE',
        is_active: true,
        is_superuser: false,
      };

      jest.spyOn(User, 'findOne').mockResolvedValueOnce(mockUser as any);
      jest.spyOn(security, 'verifyPassword').mockResolvedValueOnce(true);
      const sessionCreateSpy = jest.spyOn(UserSession, 'create').mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId(),
        user_id: dummyUserId,
        refresh_token: 'test_refresh_token_hex',
        remember_me: true,
        is_active: true,
      } as any);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'finance.lead@ricoz.in',
          password: 'CorrectPassword123!',
          remember_me: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.access_token).toBeDefined();
      expect(res.body.refresh_token).toBeDefined();
      expect(res.body.token_type).toBe('bearer');
      expect(res.body.expires_in).toBe(3600); // 1-hour access token
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('finance.lead@ricoz.in');

      // Verify UserSession creation recorded remember_me and expiry (30 days)
      expect(sessionCreateSpy).toHaveBeenCalledTimes(1);
      const sessionArg = sessionCreateSpy.mock.calls[0][0] as any;
      expect(sessionArg.user_id).toEqual(dummyUserId);
      expect(sessionArg.remember_me).toBe(true);
      expect(sessionArg.refresh_token).toBeDefined();
      
      const expiryDays = (sessionArg.expires_at.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      expect(Math.round(expiryDays)).toBe(30);
    });

    it('should set 24-hour expiry for refresh token when remember_me is false', async () => {
      const mockUser = {
        _id: dummyUserId,
        email: 'temp.user@ricoz.in',
        password_hash: 'hashed_pw_secret',
        is_active: true,
      };

      jest.spyOn(User, 'findOne').mockResolvedValueOnce(mockUser as any);
      jest.spyOn(security, 'verifyPassword').mockResolvedValueOnce(true);
      const sessionCreateSpy = jest.spyOn(UserSession, 'create').mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'temp.user@ricoz.in',
          password: 'Password123!',
          remember_me: false,
        });

      expect(res.status).toBe(200);
      expect(sessionCreateSpy).toHaveBeenCalledTimes(1);
      const sessionArg = sessionCreateSpy.mock.calls[0][0] as any;
      expect(sessionArg.remember_me).toBe(false);

      const expiryHours = (sessionArg.expires_at.getTime() - Date.now()) / (1000 * 60 * 60);
      expect(Math.round(expiryHours)).toBe(24);
    });

    it('should reject invalid credentials with 401 and descriptive error, NOT session expired', async () => {
      const mockUser = {
        _id: dummyUserId,
        email: 'user@ricoz.in',
        password_hash: 'hashed_pw_secret',
        is_active: true,
      };

      jest.spyOn(User, 'findOne').mockResolvedValueOnce(mockUser as any);
      jest.spyOn(security, 'verifyPassword').mockResolvedValueOnce(false);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'user@ricoz.in',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.detail).toBe('Invalid email or password');
      expect(res.body.detail).not.toContain('session has expired');
    });

    it('should reject non-existent user with 401', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@ricoz.in',
          password: 'Password123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.detail).toBe('Invalid email or password');
    });

    it('should reject inactive/suspended account with 403', async () => {
      const mockUser = {
        _id: dummyUserId,
        email: 'suspended@ricoz.in',
        password_hash: 'hashed_pw_secret',
        is_active: false,
      };

      jest.spyOn(User, 'findOne').mockResolvedValueOnce(mockUser as any);
      jest.spyOn(security, 'verifyPassword').mockResolvedValueOnce(true);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'suspended@ricoz.in',
          password: 'Password123!',
        });

      expect(res.status).toBe(403);
      expect(res.body.detail).toContain('suspended or deactivated');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    const dummyUserId = new mongoose.Types.ObjectId();
    const dummySessionId = new mongoose.Types.ObjectId();

    it('should reject request without refresh_token with 400', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.detail).toContain('Refresh token is required');
    });

    it('should reject non-existent or revoked refresh token with 401', async () => {
      jest.spyOn(UserSession, 'findOne').mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: 'invalid_or_revoked_token_123' });

      expect(res.status).toBe(401);
      expect(res.body.detail).toContain('Session expired or invalid');
    });

    it('should reject expired refresh token and deactivate session with 401', async () => {
      const mockSession = {
        _id: dummySessionId,
        user_id: dummyUserId,
        refresh_token: 'expired_token_123',
        is_active: true,
        expires_at: new Date(Date.now() - 3600000), // 1 hour in the past
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(UserSession, 'findOne').mockResolvedValueOnce(mockSession as any);

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: 'expired_token_123' });

      expect(res.status).toBe(401);
      expect(res.body.detail).toContain('Session expired');
      expect(mockSession.is_active).toBe(false);
      expect(mockSession.save).toHaveBeenCalled();
    });

    it('should rotate refresh token and issue new 1-hour access_token for valid active session', async () => {
      const oldRefreshToken = 'valid_active_token_999';
      const mockSession = {
        _id: dummySessionId,
        user_id: dummyUserId,
        refresh_token: oldRefreshToken,
        is_active: true,
        remember_me: true,
        expires_at: new Date(Date.now() + 86400000 * 20), // 20 days remaining
        save: jest.fn().mockResolvedValue(true),
      };

      const mockUser = {
        _id: dummyUserId,
        email: 'finance.lead@ricoz.in',
        full_name: 'Aditi Verma',
        role: 'ADMIN',
        department: 'FINANCE',
        is_active: true,
        is_superuser: false,
      };

      jest.spyOn(UserSession, 'findOne').mockResolvedValueOnce(mockSession as any);
      jest.spyOn(User, 'findById').mockResolvedValueOnce(mockUser as any);

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: oldRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.access_token).toBeDefined();
      expect(res.body.refresh_token).toBeDefined();
      expect(res.body.refresh_token).not.toBe(oldRefreshToken); // Verifies refresh token ROTATION!
      expect(res.body.token_type).toBe('bearer');
      expect(res.body.expires_in).toBe(3600);

      // Verify session was updated in database with rotated refresh token
      expect(mockSession.save).toHaveBeenCalled();
      expect(mockSession.refresh_token).toBe(res.body.refresh_token);
    });

    it('should reject refresh if user has been deactivated since session creation', async () => {
      const mockSession = {
        _id: dummySessionId,
        user_id: dummyUserId,
        refresh_token: 'token_abc',
        is_active: true,
        expires_at: new Date(Date.now() + 86400000),
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(UserSession, 'findOne').mockResolvedValueOnce(mockSession as any);
      jest.spyOn(User, 'findById').mockResolvedValueOnce({
        _id: dummyUserId,
        email: 'deactivated@ricoz.in',
        is_active: false, // deactivated!
      } as any);

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: 'token_abc' });

      expect(res.status).toBe(401);
      expect(res.body.detail).toContain('deactivated');
      expect(mockSession.is_active).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    const dummyUserId = new mongoose.Types.ObjectId();

    it('should revoke active session by refresh token', async () => {
      const updateOneSpy = jest.spyOn(UserSession, 'updateOne').mockResolvedValueOnce({ modifiedCount: 1 } as any);

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refresh_token: 'active_session_refresh_token_to_revoke' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Logged out successfully');

      expect(updateOneSpy).toHaveBeenCalledWith(
        { refresh_token: 'active_session_refresh_token_to_revoke' },
        { $set: { is_active: false } }
      );
    });

    it('should revoke active session when Bearer token is provided', async () => {
      const token = security.generateToken({
        sub: dummyUserId.toString(),
        email: 'authenticated.user@ricoz.in',
        role: 'ADMIN',
      });

      jest.spyOn(User, 'findById').mockResolvedValueOnce({
        _id: dummyUserId,
        email: 'authenticated.user@ricoz.in',
        is_active: true,
        is_superuser: false,
      } as any);

      const updateManySpy = jest.spyOn(UserSession, 'updateMany').mockResolvedValue({ modifiedCount: 1 } as any);

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Logged out successfully');
      expect(updateManySpy).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/auth/developer/login', () => {
    const dummyDevId = new mongoose.Types.ObjectId();

    it('should reject non-superuser account with 403', async () => {
      const mockRegularUser = {
        _id: dummyDevId,
        email: 'regular.accountant@ricoz.in',
        password_hash: 'hashed_pw_secret',
        role: 'ACCOUNTANT',
        is_active: true,
        is_superuser: false,
      };

      jest.spyOn(User, 'findOne').mockResolvedValueOnce(mockRegularUser as any);
      jest.spyOn(security, 'verifyPassword').mockResolvedValueOnce(true);

      const res = await request(app)
        .post('/api/v1/auth/developer/login')
        .send({
          email: 'regular.accountant@ricoz.in',
          password: 'Password123!',
        });

      expect(res.status).toBe(403);
      expect(res.body.detail).toContain('Super Administrator privileges required');
    });

    it('should authenticate superuser and return tokens and developer user object', async () => {
      const mockSuperUser = {
        _id: dummyDevId,
        email: 'admin@ricoz.in',
        password_hash: 'hashed_pw_secret',
        full_name: 'Platform Administrator',
        role: 'SUPER_ADMIN',
        department: 'EXECUTIVE',
        is_active: true,
        is_superuser: true,
      };

      jest.spyOn(User, 'findOne').mockResolvedValueOnce(mockSuperUser as any);
      jest.spyOn(security, 'verifyPassword').mockResolvedValueOnce(true);
      jest.spyOn(UserSession, 'create').mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post('/api/v1/auth/developer/login')
        .send({
          email: 'admin@ricoz.in',
          password: 'SuperSecretPassword!',
        });

      expect(res.status).toBe(200);
      expect(res.body.access_token).toBeDefined();
      expect(res.body.refresh_token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.is_superuser).toBe(true);
    });
  });
});
