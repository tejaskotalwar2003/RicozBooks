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
});
