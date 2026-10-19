import mongoose, { Schema, Document } from 'mongoose';

export interface IInvitation extends Document {
  organization_id?: mongoose.Types.ObjectId;
  department_id?: mongoose.Types.ObjectId | null;
  email: string;
  role: string;
  token: string;
  invited_by_user_id: mongoose.Types.ObjectId;
  status: string; // PENDING, ACCEPTED, EXPIRED, REVOKED
  email_status: string; // PENDING, SENT, NOT_CONFIGURED, FAILED
  email_sent_at?: Date;
  email_error?: string;
  expires_at: Date;
  accepted_at?: Date;
  created_at: Date;
}

const InvitationSchema = new Schema<IInvitation>(
  {
    organization_id: { type: Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
    department_id: { type: Schema.Types.ObjectId, ref: 'Department', default: null, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, required: true },
    token: { type: String, required: true, unique: true, index: true },
    invited_by_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, default: 'PENDING', index: true },
    email_status: { type: String, default: 'PENDING' },
    email_sent_at: { type: Date, default: null },
    email_error: { type: String, default: null },
    expires_at: { type: Date, required: true },
    accepted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

InvitationSchema.index({ organization_id: 1, email: 1, status: 1 });
InvitationSchema.index({ department_id: 1, email: 1, status: 1 });

export const Invitation = mongoose.model<IInvitation>('Invitation', InvitationSchema);

