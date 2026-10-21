import mongoose from 'mongoose';
import { PurchaseEngine } from '../src/services/purchase.engine';
import { AccountingEngine } from '../src/services/accounting.engine';
import { BillStatus, PaymentMode } from '@ricozbooks/shared';
import { Bill, VendorPayment } from '../src/models/Bill';
import { Vendor } from '../src/models/Vendor';
import { Product } from '../src/models/Product';
import { InventoryMovement } from '../src/models/InventoryMovement';
import { JournalEntry } from '../src/models/JournalEntry';
import { Account } from '../src/models/Account';
import { AuditService } from '../src/services/audit.service';
import { toDecimal } from '../src/utils/decimal';

describe('Purchase & AP Engine - Workflows & Inventory Replenishment', () => {
  const dummyEntity = new mongoose.Types.ObjectId();
  const dummyVendor = new mongoose.Types.ObjectId();
  const dummyUser = new mongoose.Types.ObjectId();
  const dummyProduct = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.spyOn(AuditService, 'log').mockResolvedValue();
    jest.spyOn(AccountingEngine, 'validatePeriodOpen').mockResolvedValue();
    jest.spyOn(Account, 'findOne').mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      code: '2000',
      name: 'Default AP Account',
    } as any);
    jest.spyOn(Account, 'create').mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createBill', () => {
    it('should calculate bill line items, taxes, and total amount accurately', async () => {
      jest.spyOn(Vendor, 'findOne').mockResolvedValueOnce({
        _id: dummyVendor,
        name: 'Prime Suppliers Corp',
      } as any);

      jest.spyOn(Bill, 'countDocuments').mockResolvedValueOnce(0);
      jest.spyOn(Bill, 'findOne').mockResolvedValueOnce(null);

      let createdBillData: any = null;
      jest.spyOn(Bill, 'create').mockImplementationOnce(async (doc: any) => {
        createdBillData = doc;
        return { ...doc, _id: new mongoose.Types.ObjectId() } as any;
      });

      await PurchaseEngine.createBill({
        entity_id: dummyEntity,
        vendor_id: dummyVendor,
        bill_date: new Date('2026-10-05'),
        due_date: new Date('2026-11-05'),
        lines: [
          {
            product_id: dummyProduct,
            description: 'Raw Materials Batch A',
            quantity: 5,
            unit_price: 200, // subtotal = 1000
            tax_rate: 18,    // 18% tax = 180 -> total = 1180
          },
        ],
      });

      expect(createdBillData).toBeDefined();
      expect(createdBillData.subtotal.toString()).toBe('1000.00');
      expect(createdBillData.tax_total.toString()).toBe('180.00');
      expect(createdBillData.total_amount.toString()).toBe('1180.00');
      expect(createdBillData.balance_due.toString()).toBe('1180.00');
    });
  });

  describe('postBillToGeneralLedger', () => {
    it('should increment product stock and record balanced General Ledger entry', async () => {
      const mockBill = {
        _id: new mongoose.Types.ObjectId(),
        entity_id: dummyEntity,
        vendor_id: dummyVendor,
        bill_number: 'BILL-2026-0001',
        bill_date: new Date('2026-10-05'),
        status: BillStatus.DRAFT,
        subtotal: toDecimal(1000.00),
        tax_total: toDecimal(180.00),
        total_amount: toDecimal(1180.00),
        amount_paid: toDecimal(0.00),
        lines: [
          {
            product_id: dummyProduct,
            description: 'Raw Materials Batch A',
            quantity: toDecimal(5),
            unit_price: toDecimal(200.00),
            tax_rate: toDecimal(18.00),
            line_total: toDecimal(1180.00),
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      const mockProduct = {
        _id: dummyProduct,
        name: 'Raw Materials Batch A',
        track_inventory: true,
        current_stock: toDecimal(15), // starting stock 15 -> should become 20
        purchase_price: toDecimal(190),
        save: jest.fn().mockResolvedValue(true),
      };

      const mockVendor = {
        _id: dummyVendor,
        current_balance: toDecimal(0.00),
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Bill, 'findById').mockResolvedValueOnce(mockBill as any);
      jest.spyOn(Product, 'findById').mockResolvedValue(mockProduct as any);
      jest.spyOn(Product, 'findOne').mockResolvedValue(mockProduct as any);
      jest.spyOn(Vendor, 'findById').mockResolvedValue(mockVendor as any);
      jest.spyOn(InventoryMovement, 'create').mockResolvedValueOnce({} as any);

      // Accounts resolution
      jest.spyOn(Account, 'findOne').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        code: '2000',
        name: 'AP',
      } as any);

      jest.spyOn(JournalEntry, 'countDocuments').mockResolvedValueOnce(0);
      jest.spyOn(JournalEntry, 'findOne').mockResolvedValueOnce(null);

      let createdJournalDoc: any = null;
      jest.spyOn(JournalEntry, 'create').mockImplementationOnce(async (doc: any) => {
        createdJournalDoc = doc;
        return { ...doc, _id: new mongoose.Types.ObjectId() } as any;
      });

      const result = await PurchaseEngine.postBillToGeneralLedger(mockBill._id, dummyUser);

      expect(result.bill.status).toBe(BillStatus.POSTED);
      expect(mockProduct.current_stock.toString()).toBe('20.00'); // 15 + 5 = 20
      expect(mockProduct.purchase_price.toString()).toBe('200.00'); // updated to new purchase price
      expect(mockProduct.save).toHaveBeenCalled();
      expect(mockVendor.current_balance.toString()).toBe('1180.00'); // AP balance incremented
      expect(mockVendor.save).toHaveBeenCalled();

      // Verify that total debit matches total credit in General Ledger entry
      expect(createdJournalDoc).toBeDefined();
      const totalDebit = parseFloat(createdJournalDoc.total_debit.toString());
      const totalCredit = parseFloat(createdJournalDoc.total_credit.toString());
      expect(totalDebit).toBe(1180.00);
      expect(totalCredit).toBe(1180.00);
    });
  });

  describe('recordVendorPayment', () => {
    it('should record payment, mark bill as PAID, and update vendor AP balance', async () => {
      const mockBill = {
        _id: new mongoose.Types.ObjectId(),
        entity_id: dummyEntity,
        vendor_id: dummyVendor,
        bill_number: 'BILL-2026-0001',
        amount_paid: toDecimal(0.00),
        balance_due: toDecimal(1180.00),
        status: BillStatus.POSTED,
        save: jest.fn().mockResolvedValue(true),
      };

      const mockVendor = {
        _id: dummyVendor,
        current_balance: toDecimal(1180.00),
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Bill, 'findOne').mockResolvedValueOnce(mockBill as any);
      jest.spyOn(Vendor, 'findById').mockResolvedValueOnce(mockVendor as any);
      jest.spyOn(VendorPayment, 'countDocuments').mockResolvedValueOnce(0);
      jest.spyOn(VendorPayment, 'findOne').mockResolvedValueOnce(null);
      jest.spyOn(JournalEntry, 'countDocuments').mockResolvedValueOnce(0);
      jest.spyOn(JournalEntry, 'findOne').mockResolvedValueOnce(null);
      jest.spyOn(JournalEntry, 'create').mockResolvedValueOnce({ _id: new mongoose.Types.ObjectId() } as any);
      jest.spyOn(VendorPayment, 'create').mockResolvedValueOnce({ payment_number: 'VPAY-2026-0001' } as any);
      jest.spyOn(Account, 'findOne').mockResolvedValueOnce({ _id: new mongoose.Types.ObjectId() } as any);

      const result = await PurchaseEngine.recordVendorPayment({
        entity_id: dummyEntity,
        bill_id: mockBill._id,
        amount: 1180.00,
        payment_mode: PaymentMode.BANK_TRANSFER,
        payment_date: new Date(),
        paid_from_account_id: new mongoose.Types.ObjectId(),
        user_id: dummyUser,
      });

      expect(mockBill.amount_paid.toString()).toBe('1180.00');
      expect(mockBill.balance_due.toString()).toBe('0.00');
      expect(mockBill.status).toBe(BillStatus.PAID);
      expect(mockVendor.current_balance.toString()).toBe('0.00');
    });
  });
});
