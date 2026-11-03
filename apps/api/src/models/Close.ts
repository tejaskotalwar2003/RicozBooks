import mongoose, { Schema, Document } from 'mongoose';

export interface IClosePeriod extends Document {
  entity_id: mongoose.Types.ObjectId;
  name: string;
  period_name: string;
  fiscal_year: string;
  period_number: number;
  month: number;
  start_date: Date;
  end_date: Date;
  target_date?: Date;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'READY_FOR_REVIEW' | 'CLOSED';
  completion_percentage: number;
  closed_by_id?: mongoose.Types.ObjectId | null;
  closed_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

const ClosePeriodSchema = new Schema<IClosePeriod>(
  {
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    name: { type: String, required: true },
    period_name: { type: String, default: function(this: any) { return this.name; } },
    fiscal_year: { type: String, default: '2025-26' },
    period_number: { type: Number, required: true },
    month: { type: Number, default: function(this: any) { return this.period_number; } },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    target_date: { type: Date, default: null },
    status: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'CLOSED'],
      default: 'NOT_STARTED',
      index: true,
    },
    completion_percentage: { type: Number, default: 0 },
    closed_by_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    closed_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

ClosePeriodSchema.index({ entity_id: 1, fiscal_year: 1, period_number: 1 }, { unique: true });

export interface ICloseTask extends Document {
  close_period_id: mongoose.Types.ObjectId;
  entity_id: mongoose.Types.ObjectId;
  title: string;
  task_name: string;
  description?: string;
  category: string;
  notes?: string;
  status: 'NOT_STARTED' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED' | 'READY_FOR_REVIEW' | 'BLOCKED';
  assigned_to_id?: mongoose.Types.ObjectId | null;
  reviewer_id?: mongoose.Types.ObjectId | null;
  due_date?: Date | null;
  completed_at?: Date | null;
  is_mandatory: boolean;
  order: number;
  created_at: Date;
  updated_at: Date;
}

const CloseTaskSchema = new Schema<ICloseTask>(
  {
    close_period_id: { type: Schema.Types.ObjectId, ref: 'ClosePeriod', required: true, index: true },
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    title: { type: String, required: true },
    task_name: { type: String, default: function(this: any) { return this.title; } },
    description: { type: String, default: null },
    category: { type: String, default: 'GENERAL' },
    notes: { type: String, default: null },
    status: {
      type: String,
      enum: ['NOT_STARTED', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'APPROVED', 'READY_FOR_REVIEW', 'BLOCKED'],
      default: 'NOT_STARTED',
      index: true,
    },
    assigned_to_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewer_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    due_date: { type: Date, default: null },
    completed_at: { type: Date, default: null },
    is_mandatory: { type: Boolean, default: true },
    order: { type: Number, default: 1 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const ClosePeriod = (mongoose.models.ClosePeriod as mongoose.Model<IClosePeriod>) || mongoose.model<IClosePeriod>('ClosePeriod', ClosePeriodSchema);
export const CloseTask = (mongoose.models.CloseTask as mongoose.Model<ICloseTask>) || mongoose.model<ICloseTask>('CloseTask', CloseTaskSchema);
