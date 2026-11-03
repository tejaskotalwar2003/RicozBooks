import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Invoice } from '../models/Invoice';
import { Bill } from '../models/Bill';
import { Expense } from '../models/Expense';
import { GSTReturnFiling } from '../models/GST';
import { AccountingEngine } from '../services/accounting.engine';
import { AuditService } from '../services/audit.service';
import { AccountType, NormalBalance } from '@ricozbooks/shared';

function parsePeriodDates(period: string): { startDate: Date; endDate: Date } {
  // period is e.g. "092026" or "2026-09"
  let month = 1;
  let year = 2026;

  if (period.includes('-')) {
    const parts = period.split('-');
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
  } else if (period.length === 6) {
    month = parseInt(period.substring(0, 2), 10);
    year = parseInt(period.substring(2, 6), 10);
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  return { startDate, endDate };
}

export class GSTController {
  // ==========================================
  // GST Dashboard Metrics
  // ==========================================
  public static async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, period } = req.query;
      if (!entity_id) {
        res.status(400).json({ detail: 'entity_id is required' });
        return;
      }

      const now = new Date();
      const currentPeriod = period ? String(period) : `${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getFullYear()}`;
      const { startDate, endDate } = parsePeriodDates(currentPeriod);

      // Invoices in period
      const invoices = await Invoice.find({
        entity_id,
        issue_date: { $gte: startDate, $lte: endDate },
        status: { $in: ['POSTED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'SENT'] },
      });

      let totalOutputTax = 0;
      let totalOutputTaxable = 0;
      invoices.forEach((inv) => {
        totalOutputTaxable += Number(inv.subtotal?.toString() || 0);
        totalOutputTax += Number(inv.tax_total?.toString() || 0);
      });

      // Bills in period
      const bills = await Bill.find({
        entity_id,
        bill_date: { $gte: startDate, $lte: endDate },
        status: { $in: ['POSTED', 'PAID', 'PARTIALLY_PAID'] },
      });

      let totalInputTax = 0;
      bills.forEach((b) => {
        totalInputTax += Number(b.tax_total?.toString() || 0);
      });

      // Expenses in period
      const expenses = await Expense.find({
        entity_id,
        expense_date: { $gte: startDate, $lte: endDate },
        status: { $in: ['POSTED', 'PAID', 'APPROVED'] },
      });

      expenses.forEach((e) => {
        totalInputTax += Number(e.tax_amount?.toString() || 0);
      });

      const netTaxPayable = Math.max(0, Math.round((totalOutputTax - totalInputTax) * 100) / 100);

      const lastFiling = await GSTReturnFiling.findOne({
        entity_id,
        status: { $in: ['FILED', 'ACCEPTED'] },
      }).sort({ filing_date: -1 });

      res.json({
        current_period: currentPeriod,
        total_output_tax_due: Math.round(totalOutputTax * 100) / 100,
        total_input_tax_credit_available: Math.round(totalInputTax * 100) / 100,
        net_tax_payable: netTaxPayable,
        gstr1_status: 'READY_FOR_FILING',
        gstr3b_status: 'CALCULATED',
        last_filed_period: lastFiling?.return_period || null,
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // GSTR-1 Summary
  // ==========================================
  public static async getGSTR1(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, period } = req.query;
      if (!entity_id || !period) {
        res.status(400).json({ detail: 'entity_id and period are required' });
        return;
      }

      const { startDate, endDate } = parsePeriodDates(String(period));

      const invoices = await Invoice.find({
        entity_id,
        issue_date: { $gte: startDate, $lte: endDate },
        status: { $in: ['POSTED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'SENT'] },
      }).populate('customer_id', 'name gstin state country');

      let totalTaxable = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;

      const b2bInvoices = invoices.map((inv: any) => {
        const taxable = Number(inv.subtotal?.toString() || 0);
        const cgst = Number(inv.cgst_total?.toString() || 0);
        const sgst = Number(inv.sgst_total?.toString() || 0);
        const igst = Number(inv.igst_total?.toString() || 0);
        const total = Number(inv.total_amount?.toString() || 0);

        totalTaxable += taxable;
        totalCgst += cgst;
        totalSgst += sgst;
        totalIgst += igst;

        return {
          invoice_number: inv.invoice_number,
          invoice_date: inv.issue_date,
          customer_name: inv.customer_id?.name || 'Customer',
          customer_gstin: inv.customer_id?.gstin || 'UNREGISTERED',
          place_of_supply: `${inv.customer_id?.state || 'Maharashtra'} (${inv.customer_id?.country || 'India'})`,
          reverse_charge: 'N',
          invoice_type: 'Regular',
          total_invoice_value: total,
          taxable_value: taxable,
          tax_rate: inv.lines?.[0]?.tax_rate || 18,
          cgst_amount: cgst,
          sgst_amount: sgst,
          igst_amount: igst,
        };
      });

      res.json({
        return_period: String(period),
        total_taxable_value: Math.round(totalTaxable * 100) / 100,
        total_cgst: Math.round(totalCgst * 100) / 100,
        total_sgst: Math.round(totalSgst * 100) / 100,
        total_igst: Math.round(totalIgst * 100) / 100,
        total_tax: Math.round((totalCgst + totalSgst + totalIgst) * 100) / 100,
        b2b_invoices: b2bInvoices,
        hsn_summary: [],
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // GSTR-3B Summary
  // ==========================================
  public static async getGSTR3B(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, period } = req.query;
      if (!entity_id || !period) {
        res.status(400).json({ detail: 'entity_id and period are required' });
        return;
      }

      const { startDate, endDate } = parsePeriodDates(String(period));

      // Output from Invoices
      const invoices = await Invoice.find({
        entity_id,
        issue_date: { $gte: startDate, $lte: endDate },
        status: { $in: ['POSTED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'SENT'] },
      });

      let outTaxable = 0;
      let outCgst = 0;
      let outSgst = 0;
      let outIgst = 0;
      invoices.forEach((inv) => {
        outTaxable += Number(inv.subtotal?.toString() || 0);
        outCgst += Number(inv.cgst_total?.toString() || 0);
        outSgst += Number(inv.sgst_total?.toString() || 0);
        outIgst += Number(inv.igst_total?.toString() || 0);
      });

      // Input ITC from Bills
      const bills = await Bill.find({
        entity_id,
        bill_date: { $gte: startDate, $lte: endDate },
        status: { $in: ['POSTED', 'PAID', 'PARTIALLY_PAID'] },
      });

      let itcCgst = 0;
      let itcSgst = 0;
      let itcIgst = 0;
      bills.forEach((b) => {
        const tax = Number(b.tax_total?.toString() || 0);
        itcCgst += tax / 2;
        itcSgst += tax / 2;
      });

      // Input ITC from Expenses
      const expenses = await Expense.find({
        entity_id,
        expense_date: { $gte: startDate, $lte: endDate },
        status: { $in: ['POSTED', 'PAID', 'APPROVED'] },
      });

      expenses.forEach((e) => {
        const tax = Number(e.tax_amount?.toString() || 0);
        itcCgst += tax / 2;
        itcSgst += tax / 2;
      });

      const totalOutLiability = outCgst + outSgst + outIgst;
      const totalItcAvailable = itcCgst + itcSgst + itcIgst;

      const cgstPayable = Math.max(0, outCgst - itcCgst);
      const sgstPayable = Math.max(0, outSgst - itcSgst);
      const igstPayable = Math.max(0, outIgst - itcIgst);
      const totalCashPayable = cgstPayable + sgstPayable + igstPayable;

      res.json({
        return_period: String(period),
        status: 'CALCULATED',
        outward_taxable_supplies: {
          taxable_value: Math.round(outTaxable * 100) / 100,
          cgst: Math.round(outCgst * 100) / 100,
          sgst: Math.round(outSgst * 100) / 100,
          igst: Math.round(outIgst * 100) / 100,
          total_tax: Math.round(totalOutLiability * 100) / 100,
        },
        eligible_itc: {
          itc_cgst: Math.round(itcCgst * 100) / 100,
          itc_sgst: Math.round(itcSgst * 100) / 100,
          itc_igst: Math.round(itcIgst * 100) / 100,
          total_itc_available: Math.round(totalItcAvailable * 100) / 100,
        },
        tax_settlement: {
          total_output_liability: Math.round(totalOutLiability * 100) / 100,
          itc_utilized: Math.round(Math.min(totalOutLiability, totalItcAvailable) * 100) / 100,
          cgst_cash_payable: Math.round(cgstPayable * 100) / 100,
          sgst_cash_payable: Math.round(sgstPayable * 100) / 100,
          igst_cash_payable: Math.round(igstPayable * 100) / 100,
          total_cash_payable: Math.round(totalCashPayable * 100) / 100,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Settle & Record Filing
  // ==========================================
  public static async settleReturn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, return_period, payment_bank_account_id, reference_number } = req.body;
      const userId = (req as any).user?.id || (req as any).user?._id;

      const { startDate, endDate } = parsePeriodDates(return_period);

      // Invoices
      const invoices = await Invoice.find({
        entity_id,
        issue_date: { $gte: startDate, $lte: endDate },
        status: { $in: ['POSTED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'SENT'] },
      });
      let outTax = 0;
      let outTaxable = 0;
      invoices.forEach((i) => {
        outTaxable += Number(i.subtotal?.toString() || 0);
        outTax += Number(i.tax_total?.toString() || 0);
      });

      // Bills + Expenses
      const bills = await Bill.find({
        entity_id,
        bill_date: { $gte: startDate, $lte: endDate },
        status: { $in: ['POSTED', 'PAID', 'PARTIALLY_PAID'] },
      });
      let itc = 0;
      bills.forEach((b) => (itc += Number(b.tax_total?.toString() || 0)));

      const expenses = await Expense.find({
        entity_id,
        expense_date: { $gte: startDate, $lte: endDate },
        status: { $in: ['POSTED', 'PAID', 'APPROVED'] },
      });
      expenses.forEach((e) => (itc += Number(e.tax_amount?.toString() || 0)));

      const cashPaid = Math.max(0, outTax - itc);

      // Create or update filing record
      let filing = await GSTReturnFiling.findOne({
        entity_id,
        return_type: 'GSTR3B',
        return_period,
      });

      const ackNumber = `GST-${Date.now().toString().slice(-8)}`;

      if (filing) {
        filing.status = 'FILED';
        filing.total_taxable_value = outTaxable as any;
        filing.total_output_liability = outTax as any;
        filing.total_itc_claimed = itc as any;
        filing.cash_paid = cashPaid as any;
        filing.acknowledgement_number = ackNumber;
        await filing.save();
      } else {
        filing = await GSTReturnFiling.create({
          entity_id,
          return_type: 'GSTR3B',
          return_period,
          status: 'FILED',
          total_taxable_value: outTaxable,
          total_output_liability: outTax,
          total_itc_claimed: itc,
          cash_paid: cashPaid,
          acknowledgement_number: ackNumber,
        });
      }

      // Record GL tax settlement
      if (cashPaid > 0 && payment_bank_account_id) {
        try {
          const gstOutputAccount = await AccountingEngine.getOrCreateAccount(
            entity_id,
            '2200',
            'GST Output Tax Payable',
            AccountType.LIABILITY,
            NormalBalance.CREDIT,
            'Output GST collected from sales'
          );

          const gstInputAccount = await AccountingEngine.getOrCreateAccount(
            entity_id,
            '1400',
            'Input GST Tax Credit',
            AccountType.ASSET,
            NormalBalance.DEBIT,
            'Input GST paid on purchases'
          );

          const lines = [
            {
              account_id: gstOutputAccount._id,
              debit: outTax,
              credit: 0,
              description: `Settlement of GST liability for period ${return_period}`,
            },
            {
              account_id: gstInputAccount._id,
              debit: 0,
              credit: Math.min(outTax, itc),
              description: `ITC offset for period ${return_period}`,
            },
            {
              account_id: payment_bank_account_id,
              debit: 0,
              credit: cashPaid,
              description: `Net GST cash payment for period ${return_period} (${reference_number || ackNumber})`,
            },
          ];

          const journal = await AccountingEngine.createJournalEntry({
            entity_id,
            entry_date: new Date(),
            memo: `GST Statutory Return Settlement - ${return_period}`,
            reference: ackNumber,
            currency: 'INR',
            created_by_user_id: userId,
            lines,
          });

          await AccountingEngine.postJournalToLedger(journal._id, userId, true);
        } catch (glErr) {
          console.error('Failed to post GST settlement to GL:', glErr);
        }
      }

      await AuditService.log({
        user_id: userId,
        user_email: (req as any).user?.email,
        action: 'EXECUTE',
        record_type: 'GSTReturnFiling',
        record_id: String(filing._id),
        entity_id,
        details: `Filed GSTR-3B for ${return_period} with cash payment ₹${cashPaid}. Ack: ${ackNumber}`,
      });

      res.json({
        filing_id: filing._id,
        return_period,
        status: 'FILED',
        acknowledgement_number: ackNumber,
        cash_paid: cashPaid,
        message: 'GST return successfully filed and settled.',
      });
    } catch (err) {
      next(err);
    }
  }
}
