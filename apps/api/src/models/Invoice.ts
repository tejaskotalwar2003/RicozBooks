import mongoose, { Schema, Document } from 'mongoose';
import { InvoiceStatus, PaymentMode } from '@ricozbooks/shared';

export interface IInvoiceLine {
  product_id?: mongoose.Types.ObjectId | null;
  description: string;
  quantity: mongoose.Types.Decimal128;
  unit_price: mongoose.Types.Decimal128;
  discount_percentage?: mongoose.Types.Decimal128;
  tax_rate: mongoose.Types.Decimal128;
  cgst_rate?: mongoose.Types.Decimal128;
  cgst_amount?: mongoose.Types.Decimal128;
  sgst_rate?: mongoose.Types.Decimal128;
  sgst_amount?: mongoose.Types.Decimal128;
  igst_rate?: mongoose.Types.Decimal128;
  igst_amount?: mongoose.Types.Decimal128;
  line_subtotal: mongoose.Types.Decimal128;
  line_total: mongoose.Types.Decimal128;
}

const InvoiceLineSchema = new Schema<IInvoiceLine>(
  {
    product_id: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    description: { type: String, required: true },
    quantity: { type: Schema.Types.Decimal128, required: true, default: 1.0 },
    unit_price: { type: Schema.Types.Decimal128, required: true, default: 0.0 },
    discount_percentage: { type: Schema.Types.Decimal128, default: 0.0 },
    tax_rate: { type: Schema.Types.Decimal128, default: 18.0 },
    cgst_rate: { type: Schema.Types.Decimal128, default: 0.0 },
    cgst_amount: { type: Schema.Types.Decimal128, default: 0.0 },
    sgst_rate: { type: Schema.Types.Decimal128, default: 0.0 },
    sgst_amount: { type: Schema.Types.Decimal128, default: 0.0 },
    igst_rate: { type: Schema.Types.Decimal128, default: 0.0 },
    igst_amount: { type: Schema.Types.Decimal128, default: 0.0 },
    line_subtotal: { type: Schema.Types.Decimal128, required: true, default: 0.0 },
    line_total: { type: Schema.Types.Decimal128, required: true, default: 0.0 },
  },
  { _id: true }
);

export interface IInvoice extends Document {
  entity_id: mongoose.Types.ObjectId;
  customer_id: mongoose.Types.ObjectId;
  invoice_number: string;
  issue_date: Date;
  due_date: Date;
  status: InvoiceStatus;
  subtotal: mongoose.Types.Decimal128;
  tax_total: mongoose.Types.Decimal128;
  cgst_total: mongoose.Types.Decimal128;
  sgst_total: mongoose.Types.Decimal128;
  igst_total: mongoose.Types.Decimal128;
  total_amount: mongoose.Types.Decimal128;
  amount_paid: mongoose.Types.Decimal128;
  balance_due: mongoose.Types.Decimal128;
  is_interstate: boolean;
  payment_token: string;
  lines: IInvoiceLine[];
  journal_entry_id?: mongoose.Types.ObjectId | null;
  cogs_journal_entry_id?: mongoose.Types.ObjectId | null;
  created_by_user_id: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    customer_id: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    invoice_number: { type: String, required: true, index: true },
    issue_date: { type: Date, required: true, index: true },
    due_date: { type: Date, required: true },
    status: { type: String, enum: Object.values(InvoiceStatus), default: InvoiceStatus.DRAFT, index: true },
    subtotal: { type: Schema.Types.Decimal128, required: true, default: 0.0 },
    tax_total: { type: Schema.Types.Decimal128, required: true, default: 0.0 },
    cgst_total: { type: Schema.Types.Decimal128, default: 0.0 },
    sgst_total: { type: Schema.Types.Decimal128, default: 0.0 },
    igst_total: { type: Schema.Types.Decimal128, default: 0.0 },
    total_amount: { type: Schema.Types.Decimal128, required: true, default: 0.0 },
    amount_paid: { type: Schema.Types.Decimal128, default: 0.0 },
    balance_due: { type: Schema.Types.Decimal128, required: true, default: 0.0 },
    is_interstate: { type: Boolean, default: false },
    payment_token: { type: String, required: true, unique: true, index: true },
    lines: [InvoiceLineSchema],
    journal_entry_id: { type: Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
    cogs_journal_entry_id: { type: Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
    created_by_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

InvoiceSchema.index({ entity_id: 1, invoice_number: 1 }, { unique: true });

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);

export interface ICustomerPayment extends Document {
  entity_id: mongoose.Types.ObjectId;
  customer_id: mongoose.Types.ObjectId;
  invoice_id: mongoose.Types.ObjectId;
  payment_number: string;
  payment_date: Date;
  amount: mongoose.Types.Decimal128;
  payment_mode: PaymentMode;
  reference_number?: string;
  deposit_to_account_id: mongoose.Types.ObjectId;
  journal_entry_id?: mongoose.Types.ObjectId | null;
  created_at: Date;
}

const CustomerPaymentSchema = new Schema<ICustomerPayment>(
  {
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    customer_id: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    invoice_id: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
    payment_number: { type: String, required: true },
    payment_date: { type: Date, required: true },
    amount: { type: Schema.Types.Decimal128, required: true },
    payment_mode: { type: String, enum: Object.values(PaymentMode), required: true },
    reference_number: { type: String, default: null },
    deposit_to_account_id: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    journal_entry_id: { type: Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

export const CustomerPayment = mongoose.model<ICustomerPayment>('CustomerPayment', CustomerPaymentSchema);

