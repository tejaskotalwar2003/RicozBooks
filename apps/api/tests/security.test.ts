import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { generateToken } from '../src/utils/security';
import { User } from '../src/models/User';
import { Invoice } from '../src/models/Invoice';
import { sanitizeAuditDetails } from '../src/utils/sanitize';

describe('Security, RBAC & Isolation Verification', () => {
  const app = createApp();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Authentication & Session Enforcement', () => {
    it('should reject requests without authorization header with 401', async () => {
      const res = await request(app).get('/api/v1/developer/status');
      expect(res.status).toBe(401);
      expect(res.body.detail).toContain('token missing');
    });

    it('should reject malformed or invalid JWT tokens with 401', async () => {
      const res = await request(app)
        .get('/api/v1/developer/status')
        .set('Authorization', 'Bearer invalid_garbage_token_12345');
      expect(res.status).toBe(401);
      expect(res.body.detail).toContain('Invalid');
    });

    it('should immediately revoke access for suspended or deactivated users (live DB check)', async () => {
      const dummyUserId = new mongoose.Types.ObjectId();
      const token = generateToken({
        sub: dummyUserId.toString(),
        email: 'suspended.user@ricozbooks.com',
        role: 'MEMBER',
      });

      // Mock user lookup finding suspended user
      jest.spyOn(User, 'findById').mockResolvedValueOnce({
        _id: dummyUserId,
        email: 'suspended.user@ricozbooks.com',
        is_active: false, // suspended!
        is_superuser: false,
      } as any);

      const res = await request(app)
        .get('/api/v1/developer/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.detail).toContain('suspended or deactivated');
    });
  });

  describe('RBAC & Developer Console Safety Lock', () => {
    it('should deny non-developer users from accessing Developer Console endpoints', async () => {
      const dummyUserId = new mongoose.Types.ObjectId();
      const token = generateToken({
        sub: dummyUserId.toString(),
        email: 'regular.accountant@ricozbooks.com',
        role: 'ACCOUNTANT',
      });

      jest.spyOn(User, 'findById').mockResolvedValueOnce({
        _id: dummyUserId,
        email: 'regular.accountant@ricozbooks.com',
        role: 'ACCOUNTANT',
        is_active: true,
        is_superuser: false, // not super admin
      } as any);

      const res = await request(app)
        .get('/api/v1/developer/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.detail).toContain('Super Administrator privileges required');
    });
  });

  describe('NoSQL Injection & Input Sanitization', () => {
    it('should strip MongoDB operator keys ($gt, $ne, $where) from audit payloads', () => {
      const maliciousPayload = {
        name: 'Normal User',
        query: { $gt: '' },
        filter: { $ne: null },
        normalField: 'safeValue',
      };

      const sanitized = sanitizeAuditDetails(maliciousPayload);

      expect(sanitized.name).toBe('Normal User');
      expect(sanitized.normalField).toBe('safeValue');
      expect((sanitized as any).query).toEqual({});
      expect((sanitized as any).filter).toEqual({});
    });
  });

  describe('Public Invoice Access via Token', () => {
    it('should return 404 for invalid or non-existent public invoice tokens', async () => {
      jest.spyOn(Invoice, 'findOne').mockImplementationOnce(() => ({
        populate: jest.fn().mockResolvedValue(null),
      } as any));

      const res = await request(app).get('/api/v1/sales/invoices/public/non_existent_token_999');
      expect(res.status).toBe(404);
      expect(res.body.detail).toContain('Invoice not found');
    });

    it('should return invoice public summary without requiring authorization for valid token', async () => {
      const mockInvoice = {
        _id: new mongoose.Types.ObjectId(),
        invoice_number: 'INV-2026-0001',
        payment_token: 'valid_uuid_token_abc123',
        customer_id: { name: 'Acme Corp', email: 'acme@example.com' },
        issue_date: new Date('2026-10-01'),
        due_date: new Date('2026-10-31'),
        status: 'SENT',
        subtotal: 1000.00,
        tax_total: 180.00,
        total_amount: 1180.00,
        amount_paid: 0.00,
        balance_due: 1180.00,
        lines: [
          { description: 'Consulting', quantity: 1, unit_price: 1000, line_total: 1180 },
        ],
      };

      jest.spyOn(Invoice, 'findOne').mockImplementationOnce(() => ({
        populate: jest.fn().mockResolvedValue(mockInvoice),
      } as any));

      const res = await request(app).get('/api/v1/sales/invoices/public/valid_uuid_token_abc123');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoice_number).toBe('INV-2026-0001');
    });
  });
});
