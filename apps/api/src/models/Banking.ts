import mongoose, { Schema, Document } from 'mongoose';
import { BankAccountType, BankTxType, BankTxStatus, ReconciliationStatus } from '@ricozbooks/shared';

export interface IBankAccount extends Document {
  entity_id: mongoose.Types.ObjectId;
  bank_name: string;
  account_name: string;
  account_number: string;
  account_type: BankAccountType;
  ifsc_code?: string;
  swift_bic?: string;
  branch_name?: string;
  currency: string;
  gl_account_id: mongoose.Types.ObjectId;
  opening_balance: mongoose.Types.Decimal128;
  current_balance: mongoose.Types.Decimal128;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const BankAccountSchema = new Schema<IBankAccount>(
  {
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    bank_name: { type: String, required: true },
    account_name: { type: String, required: true },
    account_number: { type: String, required: true },
    account_type: { type: String, enum: Object.values(BankAccountType), default: BankAccountType.CHECKING },
    ifsc_code: { type: String, default: '' },
    swift_bic: { type: String, default: '' },
    branch_name: { type: String, default: '' },
    currency: { type: String, default: 'INR' },
    gl_account_id: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    opening_balance: { type: Schema.Types.Decimal128, default: 0.0 },
    current_balance: { type: Schema.Types.Decimal128, default: 0.0 },
    is_active: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

BankAccountSchema.index({ entity_id: 1, account_number: 1 }, { unique: true });

export const BankAccount = mongoose.model<IBankAccount>('BankAccount', BankAccountSchema);

export interface IBankTransaction extends Document {
  bank_account_id: mongoose.Types.ObjectId;
  transaction_type: BankTxType;
  transaction_date: Date;
  amount: mongoose.Types.Decimal128;
  is_credit: boolean;
  running_balance?: mongoose.Types.Decimal128 | null;
  reference_number?: string;
  counterparty?: string;
  description?: string;
  status: BankTxStatus;
  reconciled_at?: Date | null;
  reconciliation_id?: mongoose.Types.ObjectId | null;
  journal_entry_id?: mongoose.Types.ObjectId | null;
  created_at: Date;
}

const BankTransactionSchema = new Schema<IBankTransaction>(
  {
    bank_account_id: { type: Schema.Types.ObjectId, ref: 'BankAccount', required: true, index: true },
    transaction_type: { type: String, enum: Object.values(BankTxType), required: true },
    transaction_date: { type: Date, required: true, index: true },
    amount: { type: Schema.Types.Decimal128, required: true },
    is_credit: { type: Boolean, required: true },
    running_balance: { type: Schema.Types.Decimal128, default: null },
    reference_number: { type: String, default: '' },
    counterparty: { type: String, default: '' },
    description: { type: String, default: '' },
    status: { type: String, enum: Object.values(BankTxStatus), default: BankTxStatus.UNRECONCILED, index: true },
    reconciled_at: { type: Date, default: null },
    reconciliation_id: { type: Schema.Types.ObjectId, ref: 'BankReconciliation', default: null },
    journal_entry_id: { type: Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

BankTransactionSchema.index({ bank_account_id: 1, transaction_date: -1 });

export const BankTransaction = mongoose.model<IBankTransaction>('BankTransaction', BankTransactionSchema);

export interface IBankReconciliation extends Document {
  bank_account_id: mongoose.Types.ObjectId;
  statement_date: Date;
  statement_balance: mongoose.Types.Decimal128;
  book_balance: mongoose.Types.Decimal128;
  reconciled_balance: mongoose.Types.Decimal128;
  difference: mongoose.Types.Decimal128;
  status: ReconciliationStatus;
  notes?: string;
  reconciled_by_user_id?: mongoose.Types.ObjectId | null;
  completed_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

const BankReconciliationSchema = new Schema<IBankReconciliation>(
  {
    bank_account_id: { type: Schema.Types.ObjectId, ref: 'BankAccount', required: true, index: true },
    statement_date: { type: Date, required: true, index: true },
    statement_balance: { type: Schema.Types.Decimal128, required: true },
    book_balance: { type: Schema.Types.Decimal128, required: true },
    reconciled_balance: { type: Schema.Types.Decimal128, default: 0.0 },
    difference: { type: Schema.Types.Decimal128, default: 0.0 },
    status: { type: String, enum: Object.values(ReconciliationStatus), default: ReconciliationStatus.DRAFT, index: true },
    notes: { type: String, default: '' },
    reconciled_by_user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    completed_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export const BankReconciliation = mongoose.model<IBankReconciliation>('BankReconciliation', BankReconciliationSchema);

export interface IBankStatementLine extends Document {
  reconciliation_id: mongoose.Types.ObjectId;
  transaction_date: Date;
  description: string;
  reference?: string;
  amount: mongoose.Types.Decimal128;
  is_credit: boolean;
  balance_after?: mongoose.Types.Decimal128 | null;
  is_matched: boolean;
  matched_transaction_id?: mongoose.Types.ObjectId | null;
  created_at: Date;
}

const BankStatementLineSchema = new Schema<IBankStatementLine>(
  {
    reconciliation_id: { type: Schema.Types.ObjectId, ref: 'BankReconciliation', required: true, index: true },
    transaction_date: { type: Date, required: true },
    description: { type: String, required: true },
    reference: { type: String, default: '' },
    amount: { type: Schema.Types.Decimal128, required: true },
    is_credit: { type: Boolean, required: true },
    balance_after: { type: Schema.Types.Decimal128, default: null },
    is_matched: { type: Boolean, default: false },
    matched_transaction_id: { type: Schema.Types.ObjectId, ref: 'BankTransaction', default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

export const BankStatementLine = mongoose.model<IBankStatementLine>('BankStatementLine', BankStatementLineSchema);

