import mongoose, { Schema, Document } from 'mongoose';

export interface IVendor extends Document {
  entity_id: mongoose.Types.ObjectId;
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  pan?: string;
  billing_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;
  payment_terms_days: number;
  opening_balance: mongoose.Types.Decimal128;
  current_balance: mongoose.Types.Decimal128;
  currency: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const VendorSchema = new Schema<IVendor>(
  {
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    company_name: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, index: true },
    phone: { type: String, trim: true, default: '' },
    gstin: { type: String, trim: true, uppercase: true, index: true },
    pan: { type: String, trim: true, uppercase: true, index: true },
    billing_address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    postal_code: { type: String, default: '' },
    country: { type: String, default: 'India' },
    payment_terms_days: { type: Number, default: 30 },
    opening_balance: { type: Schema.Types.Decimal128, default: 0.0 },
    current_balance: { type: Schema.Types.Decimal128, default: 0.0 },
    currency: { type: String, default: 'INR' },
    bank_name: { type: String, default: '' },
    bank_account_number: { type: String, default: '' },
    bank_ifsc: { type: String, default: '' },
    is_active: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

VendorSchema.index({ entity_id: 1, name: 1 });
VendorSchema.index({ entity_id: 1, email: 1 });

export const Vendor = mongoose.model<IVendor>('Vendor', VendorSchema);

