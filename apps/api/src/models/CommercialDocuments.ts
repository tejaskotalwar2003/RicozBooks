import mongoose, { Schema, Document } from 'mongoose';

// -------------------------------------------------------------
// Common Item Line Schema
// -------------------------------------------------------------
export interface IDocumentLine {
  product_id?: mongoose.Types.ObjectId | null;
  description: string;
  quantity: mongoose.Types.Decimal128;
  unit_price: mongoose.Types.Decimal128;
  tax_rate: mongoose.Types.Decimal128;
  line_subtotal?: mongoose.Types.Decimal128;
  line_total: mongoose.Types.Decimal128;
}

const DocumentLineSchema = new Schema<IDocumentLine>(
  {
    product_id: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    description: { type: String, required: true },
    quantity: { type: Schema.Types.Decimal128, required: true, default: 1.0 },
    unit_price: { type: Schema.Types.Decimal128, required: true, default: 0.0 },
    tax_rate: { type: Schema.Types.Decimal128, default: 0.0 },
    line_subtotal: { type: Schema.Types.Decimal128, default: 0.0 },
    line_total: { type: Schema.Types.Decimal128, required: true, default: 0.0 },
  },
  { _id: true }
);

// -------------------------------------------------------------
// Estimate / Quotation
// -------------------------------------------------------------
export interface IEstimate extends Document {
  entity_id: mongoose.Types.ObjectId;
  customer_id: mongoose.Types.ObjectId;
  estimate_number: string;
  estimate_date: Date;
  expiry_date?: Date | null;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'INVOICED';
  subtotal: mongoose.Types.Decimal128;
  tax_total: mongoose.Types.Decimal128;
  total_amount: mongoose.Types.Decimal128;
  notes?: string;
  lines: IDocumentLine[];
  converted_invoice_id?: mongoose.Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const EstimateSchema = new Schema<IEstimate>(
  {
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    customer_id: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    estimate_number: { type: String, required: true },
    estimate_date: { type: Date, default: Date.now, index: true },
    expiry_date: { type: Date, default: null },
    status: {
      type: String,
      enum: ['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'INVOICED'],
      default: 'DRAFT',
      index: true,
    },
    subtotal: { type: Schema.Types.Decimal128, default: 0.0 },
    tax_total: { type: Schema.Types.Decimal128, default: 0.0 },
    total_amount: { type: Schema.Types.Decimal128, default: 0.0 },
    notes: { type: String, default: null },
    lines: [DocumentLineSchema],
    converted_invoice_id: { type: Schema.Types.ObjectId, ref: 'Invoice', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

EstimateSchema.index({ entity_id: 1, estimate_number: 1 }, { unique: true });

export const Estimate = (mongoose.models.Estimate as mongoose.Model<IEstimate>) || mongoose.model<IEstimate>('Estimate', EstimateSchema);

// -------------------------------------------------------------
// Sales Order
// -------------------------------------------------------------
export interface ISalesOrder extends Document {
  entity_id: mongoose.Types.ObjectId;
  customer_id: mongoose.Types.ObjectId;
  order_number: string;
  order_date: Date;
  expected_delivery_date?: Date | null;
  status: 'DRAFT' | 'CONFIRMED' | 'FULFILLED' | 'CANCELLED';
  subtotal: mongoose.Types.Decimal128;
  tax_total: mongoose.Types.Decimal128;
  total_amount: mongoose.Types.Decimal128;
  notes?: string;
  lines: IDocumentLine[];
  created_at: Date;
  updated_at: Date;
}

const SalesOrderSchema = new Schema<ISalesOrder>(
  {
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    customer_id: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    order_number: { type: String, required: true },
    order_date: { type: Date, default: Date.now, index: true },
    expected_delivery_date: { type: Date, default: null },
    status: {
      type: String,
      enum: ['DRAFT', 'CONFIRMED', 'FULFILLED', 'CANCELLED'],
      default: 'DRAFT',
      index: true,
    },
    subtotal: { type: Schema.Types.Decimal128, default: 0.0 },
    tax_total: { type: Schema.Types.Decimal128, default: 0.0 },
    total_amount: { type: Schema.Types.Decimal128, default: 0.0 },
    notes: { type: String, default: null },
    lines: [DocumentLineSchema],
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

SalesOrderSchema.index({ entity_id: 1, order_number: 1 }, { unique: true });

export const SalesOrder = (mongoose.models.SalesOrder as mongoose.Model<ISalesOrder>) || mongoose.model<ISalesOrder>('SalesOrder', SalesOrderSchema);

// -------------------------------------------------------------
// Credit Note
// -------------------------------------------------------------
export interface ICreditNote extends Document {
  entity_id: mongoose.Types.ObjectId;
  customer_id: mongoose.Types.ObjectId;
  invoice_id?: mongoose.Types.ObjectId | null;
  credit_note_number: string;
  issue_date: Date;
  status: 'DRAFT' | 'OPEN' | 'APPLIED' | 'VOID';
  subtotal: mongoose.Types.Decimal128;
  tax_total: mongoose.Types.Decimal128;
  total_amount: mongoose.Types.Decimal128;
  reason?: string;
  lines: IDocumentLine[];
  journal_entry_id?: mongoose.Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const CreditNoteSchema = new Schema<ICreditNote>(
  {
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    customer_id: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    invoice_id: { type: Schema.Types.ObjectId, ref: 'Invoice', default: null },
    credit_note_number: { type: String, required: true },
    issue_date: { type: Date, default: Date.now, index: true },
    status: {
      type: String,
      enum: ['DRAFT', 'OPEN', 'APPLIED', 'VOID'],
      default: 'OPEN',
      index: true,
    },
    subtotal: { type: Schema.Types.Decimal128, default: 0.0 },
    tax_total: { type: Schema.Types.Decimal128, default: 0.0 },
    total_amount: { type: Schema.Types.Decimal128, default: 0.0 },
    reason: { type: String, default: null },
    lines: [DocumentLineSchema],
    journal_entry_id: { type: Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

CreditNoteSchema.index({ entity_id: 1, credit_note_number: 1 }, { unique: true });

export const CreditNote = (mongoose.models.CreditNote as mongoose.Model<ICreditNote>) || mongoose.model<ICreditNote>('CreditNote', CreditNoteSchema);

// -------------------------------------------------------------
// Purchase Order
// -------------------------------------------------------------
export interface IPurchaseOrder extends Document {
  entity_id: mongoose.Types.ObjectId;
  vendor_id: mongoose.Types.ObjectId;
  po_number: string;
  po_date: Date;
  delivery_date?: Date | null;
  status: 'DRAFT' | 'ISSUED' | 'RECEIVED' | 'BILLED' | 'CANCELLED';
  subtotal: mongoose.Types.Decimal128;
  tax_total: mongoose.Types.Decimal128;
  total_amount: mongoose.Types.Decimal128;
  notes?: string;
  lines: IDocumentLine[];
  converted_bill_id?: mongoose.Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    vendor_id: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    po_number: { type: String, required: true },
    po_date: { type: Date, default: Date.now, index: true },
    delivery_date: { type: Date, default: null },
    status: {
      type: String,
      enum: ['DRAFT', 'ISSUED', 'RECEIVED', 'BILLED', 'CANCELLED'],
      default: 'DRAFT',
      index: true,
    },
    subtotal: { type: Schema.Types.Decimal128, default: 0.0 },
    tax_total: { type: Schema.Types.Decimal128, default: 0.0 },
    total_amount: { type: Schema.Types.Decimal128, default: 0.0 },
    notes: { type: String, default: null },
    lines: [DocumentLineSchema],
    converted_bill_id: { type: Schema.Types.ObjectId, ref: 'Bill', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

PurchaseOrderSchema.index({ entity_id: 1, po_number: 1 }, { unique: true });

export const PurchaseOrder = (mongoose.models.PurchaseOrder as mongoose.Model<IPurchaseOrder>) || mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);

// -------------------------------------------------------------
// Debit Note
// -------------------------------------------------------------
export interface IDebitNote extends Document {
  entity_id: mongoose.Types.ObjectId;
  vendor_id: mongoose.Types.ObjectId;
  bill_id?: mongoose.Types.ObjectId | null;
  debit_note_number: string;
  issue_date: Date;
  status: 'DRAFT' | 'OPEN' | 'APPLIED' | 'VOID';
  subtotal: mongoose.Types.Decimal128;
  tax_total: mongoose.Types.Decimal128;
  total_amount: mongoose.Types.Decimal128;
  reason?: string;
  lines: IDocumentLine[];
  journal_entry_id?: mongoose.Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const DebitNoteSchema = new Schema<IDebitNote>(
  {
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    vendor_id: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    bill_id: { type: Schema.Types.ObjectId, ref: 'Bill', default: null },
    debit_note_number: { type: String, required: true },
    issue_date: { type: Date, default: Date.now, index: true },
    status: {
      type: String,
      enum: ['DRAFT', 'OPEN', 'APPLIED', 'VOID'],
      default: 'OPEN',
      index: true,
    },
    subtotal: { type: Schema.Types.Decimal128, default: 0.0 },
    tax_total: { type: Schema.Types.Decimal128, default: 0.0 },
    total_amount: { type: Schema.Types.Decimal128, default: 0.0 },
    reason: { type: String, default: null },
    lines: [DocumentLineSchema],
    journal_entry_id: { type: Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

DebitNoteSchema.index({ entity_id: 1, debit_note_number: 1 }, { unique: true });

export const DebitNote = (mongoose.models.DebitNote as mongoose.Model<IDebitNote>) || mongoose.model<IDebitNote>('DebitNote', DebitNoteSchema);

// -------------------------------------------------------------
// Recurring Invoice Profile
// -------------------------------------------------------------
export interface IRecurringInvoice extends Document {
  entity_id: mongoose.Types.ObjectId;
  customer_id: mongoose.Types.ObjectId;
  profile_name: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  start_date: Date;
  next_issue_date: Date;
  end_date?: Date | null;
  total_occurrences?: number | null;
  occurrences_created: number;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  subtotal: mongoose.Types.Decimal128;
  tax_total: mongoose.Types.Decimal128;
  total_amount: mongoose.Types.Decimal128;
  lines: IDocumentLine[];
  created_at: Date;
  updated_at: Date;
}

const RecurringInvoiceSchema = new Schema<IRecurringInvoice>(
  {
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    customer_id: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    profile_name: { type: String, required: true },
    frequency: {
      type: String,
      enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY'],
      default: 'MONTHLY',
    },
    start_date: { type: Date, required: true },
    next_issue_date: { type: Date, required: true },
    end_date: { type: Date, default: null },
    total_occurrences: { type: Number, default: null },
    occurrences_created: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['ACTIVE', 'PAUSED', 'COMPLETED'],
      default: 'ACTIVE',
      index: true,
    },
    subtotal: { type: Schema.Types.Decimal128, default: 0.0 },
    tax_total: { type: Schema.Types.Decimal128, default: 0.0 },
    total_amount: { type: Schema.Types.Decimal128, default: 0.0 },
    lines: [DocumentLineSchema],
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const RecurringInvoice = (mongoose.models.RecurringInvoice as mongoose.Model<IRecurringInvoice>) || mongoose.model<IRecurringInvoice>('RecurringInvoice', RecurringInvoiceSchema);
