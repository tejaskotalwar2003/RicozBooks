import mongoose, { Schema, Document } from 'mongoose';

export interface IDepartment extends Document {
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  head_user_id?: mongoose.Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    is_active: { type: Boolean, default: true, index: true },
    head_user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export const Department = mongoose.model<IDepartment>('Department', DepartmentSchema);

