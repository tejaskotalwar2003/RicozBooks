import mongoose from 'mongoose';
import { SalesEngine } from '../src/services/sales.engine';
import { AccountingEngine } from '../src/services/accounting.engine';
import { InvoiceStatus, PaymentMode, InventoryMovementType } from '@ricozbooks/shared';
import { Invoice, CustomerPayment } from '../src/models/Invoice';
import { Customer } from '../src/models/Customer';
import { Product } from '../src/models/Product';
import { InventoryMovement } from '../src/models/InventoryMovement';
import { JournalEntry } from '../src/models/JournalEntry';
import { Account } from '../src/models/Account';
import { AuditService } from '../src/services/audit.service';
import { toDecimal } from '../src/utils/decimal';

describe('Sales & COGS Engine - Financial & Inventory Workflows', () => {
  const dummyEntity = new mongoose.Types.ObjectId();
  const dummyCustomer = new mongoose.Types.ObjectId();
  const dummyUser = new mongoose.Types.ObjectId();
  const dummyProduct = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.spyOn(AuditService, 'log').mockResolvedValue();
    jest.spyOn(AccountingEngine, 'validatePeriodOpen').mockResolvedValue();
    jest.spyOn(Account, 'findOne').mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      code: '1200',
      name: 'Default AR Account',
    } as any);
    jest.spyOn(Account, 'create').mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createInvoice - GST & Tax Calculations', () => {
    it('should correctly calculate intra-state GST (50% CGST + 50% SGST)', async () => {
      jest.spyOn(Customer, 'findOne').mockResolvedValueOnce({
        _id: dummyCustomer,
        name: 'Local Client Pvt Ltd',
      } as any);

      jest.spyOn(Invoice, 'countDocuments').mockResolvedValueOnce(0);
      jest.spyOn(Invoice, 'findOne').mockResolvedValueOnce(null);

      let createdInvoiceData: any = null;
      jest.spyOn(Invoice, 'create').mockImplementationOnce(async (doc: any) => {
        createdInvoiceData = doc;
        return { ...doc, _id: new mongoose.Types.ObjectId() } as any;
      });

      await SalesEngine.createInvoice({
        entity_id: dummyEntity,
        customer_id: dummyCustomer,
        issue_date: new Date('2026-10-01'),
        due_date: new Date('2026-10-31'),
        is_interstate: false,
        lines: [
          {
            product_id: dummyProduct,
            description: 'Consulting Services',
            quantity: 2,
            unit_price: 1000,
            discount_percentage: 10, // subtotal = 2 * 1000 - 200 = 1800
            tax_rate: 18,            // 18% GST -> 9% CGST (162), 9% SGST (162)
          },
        ],
        created_by_user_id: dummyUser,
      });

      expect(createdInvoiceData).toBeDefined();
      expect(createdInvoiceData.subtotal.toString()).toBe('1800.00');
      expect(createdInvoiceData.cgst_total.toString()).toBe('162.00');
      expect(createdInvoiceData.sgst_total.toString()).toBe('162.00');
      expect(createdInvoiceData.igst_total.toString()).toBe('0.00');
      expect(createdInvoiceData.total_amount.toString()).toBe('2124.00');
      expect(createdInvoiceData.balance_due.toString()).toBe('2124.00');
    });

    it('should correctly calculate inter-state GST (100% IGST)', async () => {
      jest.spyOn(Customer, 'findOne').mockResolvedValueOnce({
        _id: dummyCustomer,
        name: 'Interstate Client Ltd',
      } as any);

      jest.spyOn(Invoice, 'countDocuments').mockResolvedValueOnce(0);
      jest.spyOn(Invoice, 'findOne').mockResolvedValueOnce(null);

      let createdInvoiceData: any = null;
      jest.spyOn(Invoice, 'create').mockImplementationOnce(async (doc: any) => {
        createdInvoiceData = doc;
        return { ...doc, _id: new mongoose.Types.ObjectId() } as any;
      });

      await SalesEngine.createInvoice({
        entity_id: dummyEntity,
        customer_id: dummyCustomer,
        issue_date: new Date('2026-10-01'),
        due_date: new Date('2026-10-31'),
        is_interstate: true,
        lines: [
          {
            description: 'Software License',
            quantity: 1,
            unit_price: 5000,
            tax_rate: 18,
          },
        ],
        created_by_user_id: dummyUser,
      });

      expect(createdInvoiceData).toBeDefined();
      expect(createdInvoiceData.subtotal.toString()).toBe('5000.00');
      expect(createdInvoiceData.cgst_total.toString()).toBe('0.00');
      expect(createdInvoiceData.sgst_total.toString()).toBe('0.00');
      expect(createdInvoiceData.igst_total.toString()).toBe('900.00');
      expect(createdInvoiceData.total_amount.toString()).toBe('5900.00');
    });
  });

  describe('postInvoiceToGeneralLedger - Inventory & COGS Double-Entry Posting', () => {
    it('should reject invoice posting if inventory stock is insufficient', async () => {
      const mockInvoice = {
        _id: new mongoose.Types.ObjectId(),
        entity_id: dummyEntity,
        customer_id: dummyCustomer,
        invoice_number: 'INV-2026-0001',
        issue_date: new Date('2026-10-15'),
        status: InvoiceStatus.DRAFT,
        total_amount: toDecimal(1000),
        lines: [
          {
            product_id: dummyProduct,
            quantity: toDecimal(10), // requires 10 units
          },
        ],
      };

      jest.spyOn(Invoice, 'findById').mockResolvedValueOnce(mockInvoice as any);
      jest.spyOn(Product, 'findOne').mockResolvedValueOnce({
        _id: dummyProduct,
        name: 'High Precision Widget',
        sku: 'HPW-001',
        is_active: true,
        track_inventory: true,
        current_stock: toDecimal(5), // only 5 units available!
      } as any);

      await expect(
        SalesEngine.postInvoiceToGeneralLedger(mockInvoice._id, dummyUser)
      ).rejects.toThrow(/insufficient stock/i);
    });

    it('should create balanced double-entry GL journal with COGS and Inventory Reduction', async () => {
      const mockInvoice = {
        _id: new mongoose.Types.ObjectId(),
        entity_id: dummyEntity,
        customer_id: dummyCustomer,
        invoice_number: 'INV-2026-0001',
        issue_date: new Date('2026-10-15'),
        status: InvoiceStatus.DRAFT,
        subtotal: toDecimal(1000.00),
        cgst_total: toDecimal(90.00),
        sgst_total: toDecimal(90.00),
        igst_total: toDecimal(0.00),
        total_amount: toDecimal(1180.00),
        amount_paid: toDecimal(0.00),
        lines: [
          {
            product_id: dummyProduct,
            description: 'Accounting Software Pack',
            line_subtotal: toDecimal(1000.00),
            quantity: toDecimal(2),
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      const mockProduct = {
        _id: dummyProduct,
        name: 'Accounting Software Pack',
        sku: 'ASP-001',
        is_active: true,
        track_inventory: true,
        current_stock: toDecimal(10), // 10 units available
        purchase_price: toDecimal(300.00), // unit cost = 300, COGS = 2 * 300 = 600
        save: jest.fn().mockResolvedValue(true),
      };

      const mockCustomer = {
        _id: dummyCustomer,
        current_balance: toDecimal(0.00),
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Invoice, 'findById').mockResolvedValueOnce(mockInvoice as any);
      jest.spyOn(Product, 'findOne').mockResolvedValueOnce(mockProduct as any);
      jest.spyOn(Customer, 'findById').mockResolvedValueOnce(mockCustomer as any);
      jest.spyOn(InventoryMovement, 'create').mockResolvedValueOnce({} as any);

      let createdJournalDoc: any = null;
      jest.spyOn(JournalEntry, 'create').mockImplementationOnce(async (doc: any) => {
        createdJournalDoc = doc;
        return { ...doc, _id: new mongoose.Types.ObjectId() } as any;
      });

      // Mock Accounts
      jest.spyOn(Account, 'findOne').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        code: '1200',
        name: 'AR',
      } as any);

      jest.spyOn(JournalEntry, 'countDocuments').mockResolvedValueOnce(0);
      jest.spyOn(JournalEntry, 'findOne').mockResolvedValueOnce(null);

      const result = await SalesEngine.postInvoiceToGeneralLedger(mockInvoice._id, dummyUser);

      expect(result.invoice.status).toBe(InvoiceStatus.SENT);
      expect(mockProduct.current_stock.toString()).toBe('8.00'); // 10 - 2 = 8
      expect(mockProduct.save).toHaveBeenCalled();
      expect(mockCustomer.current_balance.toString()).toBe('1180.00'); // + 1180
      expect(mockCustomer.save).toHaveBeenCalled();

      // Verify that total debit matches total credit in General Ledger entry
      expect(createdJournalDoc).toBeDefined();
      const totalDebit = parseFloat(createdJournalDoc.total_debit.toString());
      const totalCredit = parseFloat(createdJournalDoc.total_credit.toString());
      // Total debits = AR (1180) + COGS (600) = 1780
      // Total credits = Revenue (1000) + CGST (90) + SGST (90) + Inventory (600) = 1780
      expect(totalDebit).toBe(1780.00);
      expect(totalCredit).toBe(1780.00);
    });
  });

  describe('recordCustomerPayment - Settlement & Ledger Updates', () => {
    it('should reject payment exceeding balance due', async () => {
      const mockInvoice = {
        _id: new mongoose.Types.ObjectId(),
        entity_id: dummyEntity,
        balance_due: toDecimal(500.00),
      };
      jest.spyOn(Invoice, 'findOne').mockResolvedValueOnce(mockInvoice as any);

      await expect(
        SalesEngine.recordCustomerPayment({
          entity_id: dummyEntity,
          invoice_id: mockInvoice._id,
          amount: 600.00, // exceeds 500
          payment_mode: PaymentMode.BANK_TRANSFER,
          payment_date: new Date(),
          deposit_to_account_id: new mongoose.Types.ObjectId(),
          user_id: dummyUser,
        })
      ).rejects.toThrow(/exceeds balance due/i);
    });

    it('should record payment, update invoice to PAID, and update customer balance', async () => {
      const mockInvoice = {
        _id: new mongoose.Types.ObjectId(),
        entity_id: dummyEntity,
        customer_id: dummyCustomer,
        invoice_number: 'INV-2026-0001',
        amount_paid: toDecimal(0.00),
        balance_due: toDecimal(1000.00),
        status: InvoiceStatus.SENT,
        save: jest.fn().mockResolvedValue(true),
      };

      const mockCustomer = {
        _id: dummyCustomer,
        current_balance: toDecimal(1000.00),
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Invoice, 'findOne').mockResolvedValueOnce(mockInvoice as any);
      jest.spyOn(Customer, 'findById').mockResolvedValueOnce(mockCustomer as any);
      jest.spyOn(CustomerPayment, 'countDocuments').mockResolvedValueOnce(0);
      jest.spyOn(CustomerPayment, 'findOne').mockResolvedValueOnce(null);
      jest.spyOn(JournalEntry, 'countDocuments').mockResolvedValueOnce(0);
      jest.spyOn(JournalEntry, 'findOne').mockResolvedValueOnce(null);
      jest.spyOn(JournalEntry, 'create').mockResolvedValueOnce({ _id: new mongoose.Types.ObjectId() } as any);
      jest.spyOn(CustomerPayment, 'create').mockResolvedValueOnce({ payment_number: 'RCP-2026-0001' } as any);
      jest.spyOn(Account, 'findOne').mockResolvedValueOnce({ _id: new mongoose.Types.ObjectId() } as any);

      const result = await SalesEngine.recordCustomerPayment({
        entity_id: dummyEntity,
        invoice_id: mockInvoice._id,
        amount: 1000.00,
        payment_mode: PaymentMode.UPI,
        payment_date: new Date(),
        deposit_to_account_id: new mongoose.Types.ObjectId(),
        user_id: dummyUser,
      });

      expect(mockInvoice.amount_paid.toString()).toBe('1000.00');
      expect(mockInvoice.balance_due.toString()).toBe('0.00');
      expect(mockInvoice.status).toBe(InvoiceStatus.PAID);
      expect(mockCustomer.current_balance.toString()).toBe('0.00');
    });
  });
});
