import mongoose, { Schema, Document } from 'mongoose';

export interface IDemoAdminUser extends Document {
  name: string;
  email: string;
  password_hash: string;
  role: string; // DEMO_ADMIN, SALES_TEAM, DEMO_COORDINATOR
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const DemoAdminUserSchema = new Schema<IDemoAdminUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },
    role: { type: String, default: 'DEMO_COORDINATOR' },
    is_active: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export const DemoAdminUser = mongoose.model<IDemoAdminUser>('DemoAdminUser', DemoAdminUserSchema);

export interface IDemoRequest extends Document {
  reference_code: string;
  full_name: string;
  work_email: string;
  phone: string;
  company: string;
  role: string;
  entities_count: string;
  interest_area: string;
  preferred_date?: Date;
  preferred_time?: string;
  confirmed_date?: Date;
  confirmed_time?: string;
  duration: string;
  meeting_link?: string;
  status: string; // NEW, CONTACTED, SCHEDULED, COMPLETED, CONVERTED, CANCELLED
  assigned_to?: mongoose.Types.ObjectId | null;
  internal_notes?: string;
  created_at: Date;
}

const DemoRequestSchema = new Schema<IDemoRequest>(
  {
    reference_code: { type: String, required: true, unique: true, index: true },
    full_name: { type: String, required: true },
    work_email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },
    company: { type: String, required: true },
    role: { type: String, required: true },
    entities_count: { type: String, default: '1' },
    interest_area: { type: String, default: 'Complete Platform Demo' },
    preferred_date: { type: Date, default: null },
    preferred_time: { type: String, default: null },
    confirmed_date: { type: Date, default: null },
    confirmed_time: { type: String, default: null },
    duration: { type: String, default: '45 mins' },
    meeting_link: { type: String, default: null },
    status: { type: String, default: 'NEW', index: true },
    assigned_to: { type: Schema.Types.ObjectId, ref: 'DemoAdminUser', default: null },
    internal_notes: { type: String, default: '' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

export const DemoRequest = mongoose.model<IDemoRequest>('DemoRequest', DemoRequestSchema);

