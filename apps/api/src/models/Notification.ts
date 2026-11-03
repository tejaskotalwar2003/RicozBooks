import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  entity_id: mongoose.Types.ObjectId;
  user_id?: mongoose.Types.ObjectId | null;
  title: string;
  message: string;
  notification_type: string;
  link_url?: string | null;
  is_read: boolean;
  read_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    notification_type: { type: String, default: 'INFO' },
    link_url: { type: String, default: null },
    is_read: { type: Boolean, default: false, index: true },
    read_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

NotificationSchema.index({ entity_id: 1, is_read: 1, created_at: -1 });

export const Notification = (mongoose.models.Notification as mongoose.Model<INotification>) || mongoose.model<INotification>('Notification', NotificationSchema);
