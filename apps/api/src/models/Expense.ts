import mongoose, { Schema, Document } from 'mongoose';

export interface IExpenseCategory extends Document {
  entity_id: mongoose.Types.ObjectId;
  code: string;
  name: string;
  description?: string;
  default_account_id?: mongoose.Types.ObjectId;
  tax_rate_percent: mongoose.Types.Decimal128;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const ExpenseCategorySchema = new Schema<IExpenseCategory>(
  {
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    default_account_id: { type: Schema.Types.ObjectId, ref: 'Account', default: null },
    tax_rate_percent: { type: Schema.Types.Decimal128, default: 0.0 },
    is_active: { type: Boolean, default: true },
  },
  { 
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ExpenseCategorySchema.index({ entity_id: 1, code: 1 }, { unique: true });

export interface IExpense extends Document {
  entity_id: mongoose.Types.ObjectId;
  expense_number: string;
  title: string;
  category_id?: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  expense_date: Date;
  expense_account_id: mongoose.Types.ObjectId;
  payment_account_id?: mongoose.Types.ObjectId;
  bank_account_id?: mongoose.Types.ObjectId;
  payment_method: string;
  subtotal: mongoose.Types.Decimal128;
  tax_amount: mongoose.Types.Decimal128;
  total_amount: mongoose.Types.Decimal128;
  gst_rate?: number;
  currency: string;
  merchant_name?: string;
  reference_number?: string;
  description?: string;
  notes?: string;
  receipt_url?: string;
  is_reimbursable: boolean;
  is_billable: boolean;
  customer_id?: mongoose.Types.ObjectId;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'POSTED' | 'PAID';
  approved_by_id?: mongoose.Types.ObjectId;
  approved_at?: Date;
  rejection_reason?: string;
  journal_entry_id?: mongoose.Types.ObjectId;
  reimbursement_journal_id?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    expense_number: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    category_id: { type: Schema.Types.ObjectId, ref: 'ExpenseCategory', default: null },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expense_date: { type: Date, default: Date.now },
    expense_account_id: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    payment_account_id: { type: Schema.Types.ObjectId, ref: 'Account', default: null },
    bank_account_id: { type: Schema.Types.ObjectId, ref: 'BankAccount', default: null },
    payment_method: { type: String, default: 'CASH' },
    subtotal: { type: Schema.Types.Decimal128, default: 0.0 },
    tax_amount: { type: Schema.Types.Decimal128, default: 0.0 },
    total_amount: { type: Schema.Types.Decimal128, default: 0.0 },
    gst_rate: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    merchant_name: { type: String, default: null },
    reference_number: { type: String, default: null },
    description: { type: String, default: null },
    notes: { type: String, default: null },
    receipt_url: { type: String, default: null },
    is_reimbursable: { type: Boolean, default: false },
    is_billable: { type: Boolean, default: false },
    customer_id: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'POSTED', 'PAID'],
      default: 'DRAFT',
      index: true,
    },
    approved_by_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approved_at: { type: Date, default: null },
    rejection_reason: { type: String, default: null },
    journal_entry_id: { type: Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
    reimbursement_journal_id: { type: Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
  },
  { 
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ExpenseSchema.index({ entity_id: 1, expense_number: 1 }, { unique: true });
ExpenseSchema.index({ entity_id: 1, expense_date: -1 });

export const ExpenseCategory = mongoose.model<IExpenseCategory>('ExpenseCategory', ExpenseCategorySchema);
export const Expense = mongoose.model<IExpense>('Expense', ExpenseSchema);
