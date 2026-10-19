import mongoose, { Schema, Document } from 'mongoose';
import { AccountType, NormalBalance } from '@ricozbooks/shared';

export interface IAccount extends Document {
  entity_id: mongoose.Types.ObjectId;
  code: string;
  name: string;
  account_type: AccountType;
  normal_balance: NormalBalance;
  parent_id?: mongoose.Types.ObjectId | null;
  currency: string;
  description?: string;
  is_active: boolean;
  is_system: boolean;
  created_at: Date;
  updated_at: Date;
}

const AccountSchema = new Schema<IAccount>(
  {
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    account_type: { type: String, enum: Object.values(AccountType), required: true, index: true },
    normal_balance: { type: String, enum: Object.values(NormalBalance), required: true },
    parent_id: { type: Schema.Types.ObjectId, ref: 'Account', default: null },
    currency: { type: String, default: 'INR' },
    description: { type: String, default: '' },
    is_active: { type: Boolean, default: true, index: true },
    is_system: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

AccountSchema.index({ entity_id: 1, code: 1 }, { unique: true });

export const Account = mongoose.model<IAccount>('Account', AccountSchema);

