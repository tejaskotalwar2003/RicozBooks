import mongoose, { Schema, Document } from 'mongoose';

export interface IGSTReturnFiling extends Document {
  entity_id: mongoose.Types.ObjectId;
  return_type: 'GSTR1' | 'GSTR3B';
  return_period: string; // e.g. "092026"
  financial_year: string;
  filing_date: Date;
  status: 'DRAFT' | 'READY' | 'FILED' | 'ACCEPTED';
  total_taxable_value: mongoose.Types.Decimal128;
  total_output_liability: mongoose.Types.Decimal128;
  total_itc_claimed: mongoose.Types.Decimal128;
  cash_paid: mongoose.Types.Decimal128;
  acknowledgement_number?: string;
  details?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

const GSTReturnFilingSchema = new Schema<IGSTReturnFiling>(
  {
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    return_type: { type: String, enum: ['GSTR1', 'GSTR3B'], required: true },
    return_period: { type: String, required: true },
    financial_year: { type: String, default: '2025-26' },
    filing_date: { type: Date, default: Date.now },
    status: { type: String, enum: ['DRAFT', 'READY', 'FILED', 'ACCEPTED'], default: 'DRAFT' },
    total_taxable_value: { type: Schema.Types.Decimal128, default: 0.0 },
    total_output_liability: { type: Schema.Types.Decimal128, default: 0.0 },
    total_itc_claimed: { type: Schema.Types.Decimal128, default: 0.0 },
    cash_paid: { type: Schema.Types.Decimal128, default: 0.0 },
    acknowledgement_number: { type: String, default: null },
    details: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

GSTReturnFilingSchema.index({ entity_id: 1, return_type: 1, return_period: 1 }, { unique: true });

export const GSTReturnFiling = mongoose.model<IGSTReturnFiling>('GSTReturnFiling', GSTReturnFilingSchema);
