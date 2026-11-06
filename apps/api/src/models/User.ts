import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password_hash: string;
  full_name: string;
  role: string;
  is_active: boolean;
  is_superuser: boolean;
  department_id?: mongoose.Types.ObjectId | null;
  default_company_id?: mongoose.Types.ObjectId | null;
  default_entity_id?: mongoose.Types.ObjectId | null;
  job_title?: string;
  phone_number?: string;
  profile_photo_url?: string;
  companies: mongoose.Types.ObjectId[];
  entities: mongoose.Types.ObjectId[];
  created_at: Date;
  updated_at: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },
    full_name: { type: String, required: true, trim: true },
    role: { type: String, required: true, default: 'MEMBER' },
    is_active: { type: Boolean, default: true, index: true },
    is_superuser: { type: Boolean, default: false, index: true },
    department_id: { type: Schema.Types.ObjectId, ref: 'Department', default: null, index: true },
    default_company_id: { type: Schema.Types.ObjectId, ref: 'Organization', default: null },
    default_entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', default: null },
    job_title: { type: String, default: 'Finance Team' },
    phone_number: { type: String, default: null },
    profile_photo_url: { type: String, default: null },
    companies: [{ type: Schema.Types.ObjectId, ref: 'Organization' }],
    entities: [{ type: Schema.Types.ObjectId, ref: 'Entity' }],
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);

export interface IUserSession extends Document {
  user_id: mongoose.Types.ObjectId;
  session_token: string;
  refresh_token?: string | null;
  device: string;
  browser: string;
  os: string;
  ip_address?: string;
  location?: string;
  is_active: boolean;
  remember_me?: boolean;
  expires_at?: Date | null;
  created_at: Date;
  last_active_at: Date;
}

const UserSessionSchema = new Schema<IUserSession>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    session_token: { type: String, required: true, unique: true, index: true },
    refresh_token: { type: String, default: null, index: true },
    device: { type: String, default: 'Desktop PC' },
    browser: { type: String, default: 'Web Browser' },
    os: { type: String, default: 'Operating System' },
    ip_address: { type: String, default: null },
    location: { type: String, default: 'Current Location' },
    is_active: { type: Boolean, default: true, index: true },
    remember_me: { type: Boolean, default: false },
    expires_at: { type: Date, default: null, index: true },
    last_active_at: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const UserSession = mongoose.model<IUserSession>('UserSession', UserSessionSchema);

