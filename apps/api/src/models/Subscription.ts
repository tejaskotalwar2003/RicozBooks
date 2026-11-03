import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionPlan extends Document {
  tier: string;
  name: string;
  description: string;
  monthly_price: mongoose.Types.Decimal128;
  annual_price: mongoose.Types.Decimal128;
  currency: string;
  max_entities: number;
  max_users: number;
  max_invoices_per_month: number;
  features: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    tier: { type: String, required: true, unique: true, uppercase: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    monthly_price: { type: Schema.Types.Decimal128, default: 0.0 },
    annual_price: { type: Schema.Types.Decimal128, default: 0.0 },
    currency: { type: String, default: 'USD' },
    max_entities: { type: Number, default: 1 },
    max_users: { type: Number, default: 2 },
    max_invoices_per_month: { type: Number, default: 30 },
    features: [{ type: String }],
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const SubscriptionPlan = (mongoose.models.SubscriptionPlan as mongoose.Model<ISubscriptionPlan>) || mongoose.model<ISubscriptionPlan>('SubscriptionPlan', SubscriptionPlanSchema);

export interface ITenantSubscription extends Document {
  organization_id: mongoose.Types.ObjectId;
  plan_tier: string;
  billing_cycle: 'MONTHLY' | 'ANNUAL';
  status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELLED';
  current_period_start: Date;
  current_period_end: Date;
  cancel_at_period_end: boolean;
  created_at: Date;
  updated_at: Date;
}

const TenantSubscriptionSchema = new Schema<ITenantSubscription>(
  {
    organization_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, unique: true },
    plan_tier: { type: String, default: 'GROWTH' },
    billing_cycle: { type: String, enum: ['MONTHLY', 'ANNUAL'], default: 'MONTHLY' },
    status: { type: String, enum: ['ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELLED'], default: 'ACTIVE' },
    current_period_start: { type: Date, default: Date.now },
    current_period_end: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    cancel_at_period_end: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const TenantSubscription = (mongoose.models.TenantSubscription as mongoose.Model<ITenantSubscription>) || mongoose.model<ITenantSubscription>('TenantSubscription', TenantSubscriptionSchema);
