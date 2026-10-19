import mongoose, { Schema, Document } from 'mongoose';
import { BillStatus, PaymentMode } from '@ricozbooks/shared';

export interface IBillLine {
  product_id?: mongoose.Types.ObjectId | null;
  expense_account_id?: mongoose.Types.ObjectId | null;
  description: string;
  quantity: mongoose.Types.Decimal128;
  unit_price: mongoose.Types.Decimal128;
  tax_rate: mongoose.Types.Decimal128;
  line_total: mongoose.Types.Decimal128;
}

const BillLineSchema = new Schema<IBillLine>(
  {
    product_id: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    expense_account_id: { type: Schema.Types.ObjectId, ref: 'Account', default: null },
    description: { type: String, required: true },
    quantity: { type: Schema.Types.Decimal128, required: true, default: 1.0 },
    unit_price: { type: Schema.Types.Decimal128, required: true, default: 0.0 },
    tax_rate: { type: Schema.Types.Decimal128, default: 0.0 },
    line_total: { type: Schema.Types.Decimal128, required: true, default: 0.0 },
  },
  { _id: true }
);

export interface IBill extends Document {
  entity_id: mongoose.Types.ObjectId;
  vendor_id: mongoose.Types.ObjectId;
  bill_number: string;
  bill_date: Date;
  due_date: Date;
  status: BillStatus;
  subtotal: mongoose.Types.Decimal128;
  tax_total: mongoose.Types.Decimal128;
  total_amount: mongoose.Types.Decimal128;
  amount_paid: mongoose.Types.Decimal128;
  balance_due: mongoose.Types.Decimal128;
  lines: IBillLine[];
  journal_entry_id?: mongoose.Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const BillSchema = new Schema<IBill>(
  {
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    vendor_id: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    bill_number: { type: String, required: true, index: true },
    bill_date: { type: Date, required: true, index: true },
    due_date: { type: Date, required: true },
    status: { type: String, enum: Object.values(BillStatus), default: BillStatus.DRAFT, index: true },
    subtotal: { type: Schema.Types.Decimal128, required: true, default: 0.0 },
    tax_total: { type: Schema.Types.Decimal128, required: true, default: 0.0 },
    total_amount: { type: Schema.Types.Decimal128, required: true, default: 0.0 },
    amount_paid: { type: Schema.Types.Decimal128, default: 0.0 },
    balance_due: { type: Schema.Types.Decimal128, required: true, default: 0.0 },
    lines: [BillLineSchema],
    journal_entry_id: { type: Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

BillSchema.index({ entity_id: 1, bill_number: 1 }, { unique: true });

export const Bill = mongoose.model<IBill>('Bill', BillSchema);

export interface IVendorPayment extends Document {
  entity_id: mongoose.Types.ObjectId;
  vendor_id: mongoose.Types.ObjectId;
  bill_id: mongoose.Types.ObjectId;
  payment_number: string;
  payment_date: Date;
  amount: mongoose.Types.Decimal128;
  payment_mode: PaymentMode;
  paid_from_account_id: mongoose.Types.ObjectId;
  journal_entry_id?: mongoose.Types.ObjectId | null;
  created_at: Date;
}

const VendorPaymentSchema = new Schema<IVendorPayment>(
  {
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    vendor_id: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    bill_id: { type: Schema.Types.ObjectId, ref: 'Bill', required: true, index: true },
    payment_number: { type: String, required: true },
    payment_date: { type: Date, required: true },
    amount: { type: Schema.Types.Decimal128, required: true },
    payment_mode: { type: String, enum: Object.values(PaymentMode), required: true },
    paid_from_account_id: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    journal_entry_id: { type: Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

export const VendorPayment = mongoose.model<IVendorPayment>('VendorPayment', VendorPaymentSchema);
