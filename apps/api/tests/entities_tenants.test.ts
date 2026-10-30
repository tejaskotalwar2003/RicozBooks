import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { Entity, Organization } from '../src/models/Organization';
import { Account } from '../src/models/Account';
import { User } from '../src/models/User';
import { Role } from '../src/models/Role';
import { Invitation } from '../src/models/Invitation';
import { AuditService } from '../src/services/audit.service';
import { generateToken } from '../src/utils/security';
import { InvitationStatus } from '@ricozbooks/shared';
import { FiscalPeriod } from '../src/models/FiscalPeriod';

describe('Entities & Tenant API Endpoints', () => {
  const app = createApp();

  const mockAdminId = new mongoose.Types.ObjectId();
  const mockOrgId = new mongoose.Types.ObjectId();
  const mockEntityId = new mongoose.Types.ObjectId();

  const adminToken = generateToken({
    sub: String(mockAdminId),
    email: 'admin@ricozbooks.com',
    role: 'ADMIN',
    is_superuser: false,
  });

  beforeEach(() => {
    jest.spyOn(User, 'findById').mockResolvedValue({
      _id: mockAdminId,
      email: 'admin@ricozbooks.com',
      role: 'ADMIN',
      is_active: true,
      is_superuser: false,
      default_company_id: mockOrgId,
      default_entity_id: mockEntityId,
    } as any);

    jest.spyOn(Role, 'findOne').mockResolvedValue({
      name: 'ADMIN',
      permissions: ['entities:manage', 'tenants:manage'],
    } as any);

    jest.spyOn(AuditService, 'logEvent').mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/v1/entities', () => {
    it('should return entities for the current company', async () => {
      jest.spyOn(Entity, 'find').mockReturnValue({
        sort: () => Promise.resolve([
          { _id: mockEntityId, name: 'Main HQ', tax_identifier: '29ABCDE1234F1Z5', is_active: true },
        ]),
      } as any);

      const res = await request(app)
        .get('/api/v1/entities')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe('Main HQ');
    });
  });

  describe('POST /api/v1/entities', () => {
    it('should create an entity and ensure standard COGS account 5700 is provisioned', async () => {
      const createdEntity = {
        _id: new mongoose.Types.ObjectId(),
        company_id: mockOrgId,
        name: 'New Delhi Branch',
        tax_identifier: '07ABCDE1234F1Z1',
        currency: 'INR',
        is_active: true,
      };

      jest.spyOn(Entity, 'create').mockResolvedValue(createdEntity as any);
      jest.spyOn(Account, 'findOne').mockResolvedValue(null);
      const accountCreateSpy = jest.spyOn(Account, 'create').mockResolvedValue({} as any);

      const res = await request(app)
        .post('/api/v1/entities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Delhi Branch',
          tax_identifier: '07ABCDE1234F1Z1',
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('New Delhi Branch');
      expect(accountCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          code: '5700',
          name: 'Cost of Goods Sold (COGS)',
        })
      );
    });
  });

  describe('GET /api/v1/tenants/current', () => {
    it('should return current tenant organization and entities', async () => {
      jest.spyOn(Organization, 'findById').mockResolvedValue({
        _id: mockOrgId,
        name: 'Ricoz Technologies Pvt Ltd',
        currency: 'INR',
        country: 'India',
      } as any);

      jest.spyOn(Entity, 'find').mockResolvedValue([
        {
          _id: mockEntityId,
          name: 'Main HQ',
          tax_identifier: '29ABCDE1234F1Z5',
          currency: 'INR',
          is_active: true,
        },
      ] as any);

      const res = await request(app)
        .get('/api/v1/tenants/current')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.company.name).toBe('Ricoz Technologies Pvt Ltd');
      expect(res.body.entities.length).toBe(1);
      expect(res.body.user.email).toBe('admin@ricozbooks.com');
    });
  });

  describe('GET /api/v1/tenants/invitations/validate/:token', () => {
    it('should validate an active invitation token without requiring authentication', async () => {
      jest.spyOn(Invitation, 'findOne').mockResolvedValue({
        token: 'valid-test-token',
        email: 'invited@example.com',
        role: 'MEMBER',
        status: InvitationStatus.PENDING,
        expires_at: new Date(Date.now() + 86400000), // tomorrow
      } as any);

      const res = await request(app)
        .get('/api/v1/tenants/invitations/validate/valid-test-token');

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.email).toBe('invited@example.com');
    });

    it('should reject an expired invitation token', async () => {
      jest.spyOn(Invitation, 'findOne').mockResolvedValue({
        token: 'expired-token',
        email: 'invited@example.com',
        status: InvitationStatus.PENDING,
        expires_at: new Date(Date.now() - 86400000), // yesterday
      } as any);

      const res = await request(app)
        .get('/api/v1/tenants/invitations/validate/expired-token');

      expect(res.status).toBe(400);
      expect(res.body.detail).toMatch(/expired/i);
    });
  });
  describe('POST /api/v1/tenants/register-company (Organization Onboarding)', () => {
    it('should successfully register an organization, primary entity, 13 accounts, 12 fiscal periods, and admin user', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValue(null);
      jest.spyOn(Organization, 'findOne').mockResolvedValue(null);

      const fakeOrgId = new mongoose.Types.ObjectId();
      const fakeEntityId = new mongoose.Types.ObjectId();
      const fakeUserId = new mongoose.Types.ObjectId();

      jest.spyOn(Organization, 'create').mockResolvedValue([
        {
          _id: fakeOrgId,
          name: 'Acme Global Corp',
          code: 'ACME_GLOBAL_CORP',
          legal_name: 'Acme Global Private Limited',
          currency: 'INR',
          country: 'India',
        },
      ] as any);

      jest.spyOn(Entity, 'create').mockResolvedValue([
        {
          _id: fakeEntityId,
          company_id: fakeOrgId,
          name: 'Acme Global Corp - Head Office',
          code: 'ACME_GLOBAL_CORP_HQ',
          currency: 'INR',
        },
      ] as any);

      const insertAccountsSpy = jest.spyOn(Account, 'insertMany').mockResolvedValue([] as any);
      const insertFiscalSpy = jest.spyOn(FiscalPeriod, 'insertMany').mockResolvedValue([] as any);

      jest.spyOn(User, 'create').mockResolvedValue([
        {
          _id: fakeUserId,
          email: 'rohan@acmeglobal.com',
          full_name: 'Rohan Deshmukh',
          role: 'ORG_ADMIN',
          job_title: 'Organization Admin / Finance Head',
          default_company_id: fakeOrgId,
          default_entity_id: fakeEntityId,
        },
      ] as any);

      const payload = {
        company_name: 'Acme Global Corp',
        legal_name: 'Acme Global Private Limited',
        business_email: 'finance@acmeglobal.com',
        country: 'India',
        base_currency: 'INR',
        timezone: 'Asia/Kolkata',
        tax_identifier: '27AABCA1234F1Z5',
        admin_name: 'Rohan Deshmukh',
        admin_email: 'rohan@acmeglobal.com',
        password: 'SecurePassword123!',
      };

      const res = await request(app)
        .post('/api/v1/tenants/register-company')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.access_token).toBeDefined();
      expect(res.body.company_name).toBe('Acme Global Corp');
      expect(res.body.company_code).toBe('ACME_GLOBAL_CORP');
      expect(res.body.entity_name).toBe('Acme Global Corp - Head Office');
      expect(res.body.user.email).toBe('rohan@acmeglobal.com');
      expect(res.body.user.first_name).toBe('Rohan');
      expect(res.body.user.last_name).toBe('Deshmukh');
      expect(res.body.user.roles).toContain('ORG_ADMIN');

      // Verify Chart of Accounts & Fiscal schedule provisioning calls
      expect(insertAccountsSpy).toHaveBeenCalled();
      const accountsArg = insertAccountsSpy.mock.calls[0][0] as any[];
      expect(accountsArg.length).toBe(13);
      expect(accountsArg.map((a: any) => a.code)).toEqual(
        expect.arrayContaining(['1000', '1100', '1200', '1300', '2000', '2100', '4000', '5700'])
      );

      expect(insertFiscalSpy).toHaveBeenCalled();
      const fiscalArg = insertFiscalSpy.mock.calls[0][0] as any[];
      expect(fiscalArg.length).toBe(12);
    });

    it('should reject registration when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/tenants/register-company')
        .send({
          company_name: '',
          admin_name: 'Test Admin',
          admin_email: 'test@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.detail).toMatch(/company name is required/i);
    });

    it('should reject registration when administrator email is invalid or missing', async () => {
      const res = await request(app)
        .post('/api/v1/tenants/register-company')
        .send({
          company_name: 'Valid Corp',
          admin_name: 'Test Admin',
          admin_email: 'invalid-email',
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.detail).toMatch(/valid administrator email/i);
    });

    it('should reject registration when password is less than 6 characters', async () => {
      const res = await request(app)
        .post('/api/v1/tenants/register-company')
        .send({
          company_name: 'Valid Corp',
          admin_name: 'Test Admin',
          admin_email: 'test@validcorp.com',
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.detail).toMatch(/at least 6 characters/i);
    });

    it('should reject duplicate registration when administrator email already exists', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        email: 'existing@corp.com',
      } as any);

      const res = await request(app)
        .post('/api/v1/tenants/register-company')
        .send({
          company_name: 'New Corp',
          admin_name: 'Admin Name',
          admin_email: 'existing@corp.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.detail).toMatch(/already exists/i);
    });

    it('should reject duplicate registration when organization name already exists', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValue(null);
      jest.spyOn(Organization, 'findOne').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        name: 'Existing Corp',
      } as any);

      const res = await request(app)
        .post('/api/v1/tenants/register-company')
        .send({
          company_name: 'Existing Corp',
          admin_name: 'Admin Name',
          admin_email: 'fresh@corp.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.detail).toMatch(/already registered/i);
    });
  });

  describe('GET /api/v1/tenants/company', () => {
    it('should return the authenticated user\'s organization details', async () => {
      jest.spyOn(Organization, 'findById').mockResolvedValue({
        _id: mockOrgId,
        name: 'Acme Corp',
        code: 'ACME',
        legal_name: 'Acme Corporation Ltd',
        country: 'India',
        currency: 'INR',
        business_email: 'finance@acme.com',
      } as any);

      const res = await request(app)
        .get('/api/v1/tenants/company')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Acme Corp');
      expect(res.body.code).toBe('ACME');
      expect(res.body.base_currency).toBe('INR');
      expect(res.body.country).toBe('India');
    });
  });
});
