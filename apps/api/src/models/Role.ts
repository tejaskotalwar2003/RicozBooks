import mongoose, { Schema, Document } from 'mongoose';

export interface IPermission extends Document {
  code: string;
  name: string;
  module: string;
  description: string;
}

const PermissionSchema = new Schema<IPermission>(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    module: { type: String, required: true, index: true },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Permission = mongoose.model<IPermission>('Permission', PermissionSchema);

export interface IRole extends Document {
  name: string;
  description: string;
  permissions: string[]; // List of permission codes
  is_system: boolean;
  created_at: Date;
  updated_at: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    permissions: [{ type: String, index: true }],
    is_system: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export const Role = mongoose.model<IRole>('Role', RoleSchema);

