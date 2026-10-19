import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
  entity_id: mongoose.Types.ObjectId;
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  pan?: string;
  billing_address?: string;
  shipping_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;
  payment_terms_days: number;
  opening_balance: mongoose.Types.Decimal128;
  current_balance: mongoose.Types.Decimal128;
  currency: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    name: { type: String, required: true, trim: true },
    company_name: { type: String, default: null },
    email: { type: String, default: null, lowercase: true, trim: true },
    phone: { type: String, default: null },
    gstin: { type: String, default: null },
    pan: { type: String, default: null },
    billing_address: { type: String, default: null },
    shipping_address: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    postal_code: { type: String, default: null },
    country: { type: String, default: 'India' },
    payment_terms_days: { type: Number, default: 30 },
    opening_balance: { type: Schema.Types.Decimal128, default: 0.0 },
    current_balance: { type: Schema.Types.Decimal128, default: 0.0 },
    currency: { type: String, default: 'INR' },
    is_active: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

CustomerSchema.index({ entity_id: 1, name: 1 });

export const Customer = mongoose.model<ICustomer>('Customer', CustomerSchema);

export interface IVendor extends Document {
  entity_id: mongoose.Types.ObjectId;
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  pan?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;
  payment_terms_days: number;
  opening_balance: mongoose.Types.Decimal128;
  current_balance: mongoose.Types.Decimal128;
  currency: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const VendorSchema = new Schema<IVendor>(
  {
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    name: { type: String, required: true, trim: true },
    company_name: { type: String, default: null },
    email: { type: String, default: null, lowercase: true, trim: true },
    phone: { type: String, default: null },
    gstin: { type: String, default: null },
    pan: { type: String, default: null },
    address: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    postal_code: { type: String, default: null },
    country: { type: String, default: 'India' },
    payment_terms_days: { type: Number, default: 30 },
    opening_balance: { type: Schema.Types.Decimal128, default: 0.0 },
    current_balance: { type: Schema.Types.Decimal128, default: 0.0 },
    currency: { type: String, default: 'INR' },
    is_active: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

VendorSchema.index({ entity_id: 1, name: 1 });

export const Vendor = mongoose.model<IVendor>('Vendor', VendorSchema);

