import mongoose, { Schema, Document } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  legal_name?: string;
  business_email?: string;
  phone_number?: string;
  country: string;
  currency: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  timezone: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    legal_name: { type: String, default: null },
    business_email: { type: String, default: null },
    phone_number: { type: String, default: null },
    country: { type: String, default: 'India' },
    currency: { type: String, default: 'INR' },
    address: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    postal_code: { type: String, default: null },
    timezone: { type: String, default: 'Asia/Kolkata' },
    is_active: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export const Organization = mongoose.model<IOrganization>('Organization', OrganizationSchema);

export interface IEntity extends Document {
  company_id: mongoose.Types.ObjectId;
  name: string;
  legal_name?: string;
  tax_identifier: string; // GSTIN or Tax ID
  gstin?: string;
  pan?: string;
  currency: string;
  financial_year: string;
  address?: string;
  city?: string;
  state?: string;
  status: string;
  upi_id?: string;
  razorpay_key_id?: string;
  payment_gateway_active: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const EntitySchema = new Schema<IEntity>(
  {
    company_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true },
    legal_name: { type: String, default: null },
    tax_identifier: { type: String, required: true },
    gstin: { type: String, default: null },
    pan: { type: String, default: null },
    currency: { type: String, default: 'INR' },
    financial_year: { type: String, default: '2025-26' },
    address: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    status: { type: String, default: 'ACTIVE' },
    upi_id: { type: String, default: null },
    razorpay_key_id: { type: String, default: null },
    payment_gateway_active: { type: Boolean, default: true },
    is_active: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

EntitySchema.index({ company_id: 1, name: 1 }, { unique: true });

export const Entity = mongoose.model<IEntity>('Entity', EntitySchema);
