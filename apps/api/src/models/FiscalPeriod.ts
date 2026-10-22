import mongoose, { Schema, Document } from 'mongoose';
import { CloseStatus } from '@ricozbooks/shared';

export interface IFiscalPeriod extends Document {
  entity_id: mongoose.Types.ObjectId;
  name: string;
  fiscal_year: string;
  start_date: Date;
  end_date: Date;
  is_closed: boolean;
  closed_at?: Date | null;
  closed_by_user_id?: mongoose.Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const FiscalPeriodSchema = new Schema<IFiscalPeriod>(
  {
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    name: { type: String, required: true },
    fiscal_year: { type: String, required: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    is_closed: { type: Boolean, default: false, index: true },
    closed_at: { type: Date, default: null },
    closed_by_user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

FiscalPeriodSchema.index({ entity_id: 1, start_date: 1, end_date: 1 });

export const FiscalPeriod = mongoose.model<IFiscalPeriod>('FiscalPeriod', FiscalPeriodSchema);

export interface IClosePeriod extends Document {
  entity_id: mongoose.Types.ObjectId;
  period_name: string;
  fiscal_year: string;
  month: number;
  status: CloseStatus;
  completion_percentage: number;
  target_date: Date;
  closed_at?: Date | null;
  closed_by_user_id?: mongoose.Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const ClosePeriodSchema = new Schema<IClosePeriod>(
  {
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    period_name: { type: String, required: true },
    fiscal_year: { type: String, required: true },
    month: { type: Number, required: true },
    status: { type: String, enum: Object.values(CloseStatus), default: CloseStatus.IN_PROGRESS, index: true },
    completion_percentage: { type: Number, default: 0 },
    target_date: { type: Date, required: true },
    closed_at: { type: Date, default: null },
    closed_by_user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

ClosePeriodSchema.index({ entity_id: 1, fiscal_year: 1, month: 1 }, { unique: true });

export const ClosePeriod = mongoose.model<IClosePeriod>('ClosePeriod', ClosePeriodSchema);

