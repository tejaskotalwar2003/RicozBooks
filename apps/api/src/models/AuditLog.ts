import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  user_id?: mongoose.Types.ObjectId | null;
  user_email?: string;
  action: string;
  record_type: string;
  record_id?: string;
  company_id?: mongoose.Types.ObjectId | null;
  entity_id?: mongoose.Types.ObjectId | null;
  details?: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    user_email: { type: String, default: null },
    action: { type: String, required: true, index: true },
    record_type: { type: String, required: true, index: true },
    record_id: { type: String, default: null },
    company_id: { type: Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', default: null, index: true },
    details: { type: String, default: null },
    ip_address: { type: String, default: null },
    user_agent: { type: String, default: null },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

AuditLogSchema.index({ timestamp: -1, action: 1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

