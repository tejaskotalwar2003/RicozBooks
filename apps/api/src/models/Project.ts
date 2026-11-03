import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  entity_id: mongoose.Types.ObjectId;
  customer_id?: mongoose.Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  billing_type: 'FIXED' | 'HOURLY' | 'TIME_AND_MATERIALS' | 'NON_BILLABLE';
  status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
  budget_amount: mongoose.Types.Decimal128;
  default_hourly_rate: mongoose.Types.Decimal128;
  start_date?: Date;
  end_date?: Date;
  created_at: Date;
  updated_at: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    customer_id: { type: Schema.Types.ObjectId, ref: 'Customer', default: null, index: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    description: { type: String, default: null },
    billing_type: {
      type: String,
      enum: ['FIXED', 'HOURLY', 'TIME_AND_MATERIALS', 'NON_BILLABLE'],
      default: 'TIME_AND_MATERIALS',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED'],
      default: 'ACTIVE',
      index: true,
    },
    budget_amount: { type: Schema.Types.Decimal128, default: 0.0 },
    default_hourly_rate: { type: Schema.Types.Decimal128, default: 0.0 },
    start_date: { type: Date, default: null },
    end_date: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

ProjectSchema.index({ entity_id: 1, code: 1 }, { unique: true });

export interface IProjectTask extends Document {
  project_id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  estimated_hours: number;
  actual_hours: number;
  hourly_rate: mongoose.Types.Decimal128;
  created_at: Date;
  updated_at: Date;
}

const ProjectTaskSchema = new Schema<IProjectTask>(
  {
    project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: null },
    status: { type: String, enum: ['TODO', 'IN_PROGRESS', 'DONE'], default: 'TODO' },
    estimated_hours: { type: Number, default: 0 },
    actual_hours: { type: Number, default: 0 },
    hourly_rate: { type: Schema.Types.Decimal128, default: 0.0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export interface ITimesheet extends Document {
  project_id: mongoose.Types.ObjectId;
  task_id?: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  entity_id: mongoose.Types.ObjectId;
  entry_date: Date;
  hours: number;
  hourly_rate: mongoose.Types.Decimal128;
  is_billable: boolean;
  is_billed: boolean;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

const TimesheetSchema = new Schema<ITimesheet>(
  {
    project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    task_id: { type: Schema.Types.ObjectId, ref: 'ProjectTask', default: null },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    entry_date: { type: Date, default: Date.now, index: true },
    hours: { type: Number, required: true },
    hourly_rate: { type: Schema.Types.Decimal128, default: 0.0 },
    is_billable: { type: Boolean, default: true },
    is_billed: { type: Boolean, default: false },
    notes: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const Project = mongoose.model<IProject>('Project', ProjectSchema);
export const ProjectTask = mongoose.model<IProjectTask>('ProjectTask', ProjectTaskSchema);
export const Timesheet = mongoose.model<ITimesheet>('Timesheet', TimesheetSchema);
