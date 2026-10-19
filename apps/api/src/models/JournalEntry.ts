import mongoose, { Schema, Document } from 'mongoose';
import { JournalStatus } from '@ricozbooks/shared';

export interface IJournalLine {
  account_id: mongoose.Types.ObjectId;
  debit: mongoose.Types.Decimal128;
  credit: mongoose.Types.Decimal128;
  description?: string;
  dimension_id?: mongoose.Types.ObjectId | null;
}

const JournalLineSchema = new Schema<IJournalLine>(
  {
    account_id: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    debit: { type: Schema.Types.Decimal128, required: true, default: 0.0 },
    credit: { type: Schema.Types.Decimal128, required: true, default: 0.0 },
    description: { type: String, default: '' },
    dimension_id: { type: Schema.Types.ObjectId, default: null },
  },
  { _id: true }
);

export interface IJournalEntry extends Document {
  entity_id: mongoose.Types.ObjectId;
  entry_number: string;
  entry_date: Date;
  status: JournalStatus;
  memo?: string;
  reference?: string;
  currency: string;
  exchange_rate: mongoose.Types.Decimal128;
  total_debit: mongoose.Types.Decimal128;
  total_credit: mongoose.Types.Decimal128;
  lines: IJournalLine[];
  created_by_user_id: mongoose.Types.ObjectId;
  submitted_by_user_id?: mongoose.Types.ObjectId | null;
  approved_by_user_id?: mongoose.Types.ObjectId | null;
  posted_by_user_id?: mongoose.Types.ObjectId | null;
  reversal_of_entry_id?: mongoose.Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const JournalEntrySchema = new Schema<IJournalEntry>(
  {
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    entry_number: { type: String, required: true, index: true },
    entry_date: { type: Date, required: true, index: true },
    status: { type: String, enum: Object.values(JournalStatus), default: JournalStatus.DRAFT, index: true },
    memo: { type: String, default: '' },
    reference: { type: String, default: '' },
    currency: { type: String, default: 'INR' },
    exchange_rate: { type: Schema.Types.Decimal128, default: 1.0 },
    total_debit: { type: Schema.Types.Decimal128, required: true, default: 0.0 },
    total_credit: { type: Schema.Types.Decimal128, required: true, default: 0.0 },
    lines: [JournalLineSchema],
    created_by_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    submitted_by_user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approved_by_user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    posted_by_user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reversal_of_entry_id: { type: Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

JournalEntrySchema.index({ entity_id: 1, entry_number: 1 }, { unique: true });

export const JournalEntry = mongoose.model<IJournalEntry>('JournalEntry', JournalEntrySchema);

