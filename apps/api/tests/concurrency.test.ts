import mongoose from 'mongoose';
import { withTransaction } from '../src/utils/transaction';
import { SalesEngine } from '../src/services/sales.engine';
import { PurchaseEngine } from '../src/services/purchase.engine';
import { AccountingEngine } from '../src/services/accounting.engine';
import { InvoiceStatus, BillStatus, PaymentMode } from '@ricozbooks/shared';
import { Invoice } from '../src/models/Invoice';
import { Bill } from '../src/models/Bill';
import { JournalEntry } from '../src/models/JournalEntry';
import { Product } from '../src/models/Product';
import { Customer } from '../src/models/Customer';
import { toDecimal } from '../src/utils/decimal';

describe('MongoDB Concurrency, Transactions & Idempotency', () => {
  const dummyEntity = new mongoose.Types.ObjectId();
  const dummyUser = new mongoose.Types.ObjectId();
  const dummyCustomer = new mongoose.Types.ObjectId();
  const dummyProduct = new mongoose.Types.ObjectId();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('withTransaction helper', () => {
    it('should execute operation and return result when DB is not connected (mock mode)', async () => {
      const result = await withTransaction(async () => {
        return 'executed_successfully';
      });
      expect(result).toBe('executed_successfully');
    });

    it('should properly bubble up business exceptions thrown inside transaction', async () => {
      await expect(
        withTransaction(async () => {
          throw new Error('Business validation failed: roll back required');
        })
      ).rejects.toThrow('Business validation failed: roll back required');
    });
  });

  describe('Idempotency & Duplicate Posting Prevention', () => {
    it('should strictly prevent duplicate posting of an already posted invoice', async () => {
      const mockInvoice = {
        _id: new mongoose.Types.ObjectId(),
        entity_id: dummyEntity,
        invoice_number: 'INV-2026-0001',
        status: InvoiceStatus.POSTED,
        journal_entry_id: new mongoose.Types.ObjectId(),
      };
      jest.spyOn(Invoice, 'findById').mockResolvedValueOnce(mockInvoice as any);

      await expect(
        SalesEngine.postInvoiceToGeneralLedger(mockInvoice._id, dummyUser)
      ).rejects.toThrow(/already posted to the General Ledger/i);
    });

    it('should strictly prevent duplicate posting of an already posted purchase bill', async () => {
      const mockBill = {
        _id: new mongoose.Types.ObjectId(),
        entity_id: dummyEntity,
        bill_number: 'BILL-2026-0001',
        status: BillStatus.POSTED,
        journal_entry_id: new mongoose.Types.ObjectId(),
      };
      jest.spyOn(Bill, 'findById').mockResolvedValueOnce(mockBill as any);

      await expect(
        PurchaseEngine.postBillToGeneralLedger(mockBill._id, dummyUser)
      ).rejects.toThrow(/already posted to General Ledger/i);
    });

    it('should reject payment requests if invoice is already fully paid', async () => {
      const mockInvoice = {
        _id: new mongoose.Types.ObjectId(),
        entity_id: dummyEntity,
        customer_id: dummyCustomer,
        amount_paid: toDecimal(1000.00),
        balance_due: toDecimal(0.00), // fully paid
        status: InvoiceStatus.PAID,
      };
      jest.spyOn(Invoice, 'findOne').mockResolvedValueOnce(mockInvoice as any);

      await expect(
        SalesEngine.recordCustomerPayment({
          entity_id: dummyEntity,
          invoice_id: mockInvoice._id,
          amount: 50.00,
          payment_mode: PaymentMode.UPI,
          payment_date: new Date(),
          deposit_to_account_id: new mongoose.Types.ObjectId(),
          user_id: dummyUser,
        })
      ).rejects.toThrow(/exceeds balance due/i);
    });
  });

  describe('Concurrent Number Generation & Collision Avoidance', () => {
    it('should generate non-colliding sequential numbers when existing sequence exists', async () => {
      const year = new Date().getFullYear();
      jest.spyOn(JournalEntry, 'countDocuments').mockResolvedValueOnce(3);
      jest.spyOn(JournalEntry, 'findOne')
        .mockResolvedValueOnce({ entry_number: `JE-${year}-0004` } as any) // 0004 already taken
        .mockResolvedValueOnce(null); // 0005 is free!

      const num = await AccountingEngine.generateEntryNumber(dummyEntity, 'JE');
      expect(num).toBe(`JE-${year}-0005`);
    });
  });
});
