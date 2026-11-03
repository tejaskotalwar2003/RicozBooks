import mongoose, { Schema, Document } from 'mongoose';

export interface ICurrency extends Document {
  code: string;
  name: string;
  symbol: string;
  is_base: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const CurrencySchema = new Schema<ICurrency>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    symbol: { type: String, default: '' },
    is_base: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const Currency = (mongoose.models.Currency as mongoose.Model<ICurrency>) || mongoose.model<ICurrency>('Currency', CurrencySchema);

export interface IExchangeRate extends Document {
  from_currency: string;
  to_currency: string;
  rate: mongoose.Types.Decimal128;
  effective_date: Date;
  created_at: Date;
  updated_at: Date;
}

const ExchangeRateSchema = new Schema<IExchangeRate>(
  {
    from_currency: { type: String, required: true, uppercase: true, trim: true },
    to_currency: { type: String, required: true, uppercase: true, trim: true },
    rate: { type: Schema.Types.Decimal128, required: true },
    effective_date: { type: Date, default: Date.now, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

ExchangeRateSchema.index({ from_currency: 1, to_currency: 1, effective_date: -1 });

export const ExchangeRate = (mongoose.models.ExchangeRate as mongoose.Model<IExchangeRate>) || mongoose.model<IExchangeRate>('ExchangeRate', ExchangeRateSchema);
