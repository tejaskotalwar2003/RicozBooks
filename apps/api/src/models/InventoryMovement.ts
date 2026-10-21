import mongoose, { Schema, Document } from 'mongoose';
import { InventoryMovementType } from '@ricozbooks/shared';

export interface IInventoryMovement extends Document {
  entity_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  movement_type: InventoryMovementType;
  movement_date: Date;
  quantity: mongoose.Types.Decimal128;
  unit_cost: mongoose.Types.Decimal128;
  total_cost: mongoose.Types.Decimal128;
  reference_type?: string;
  reference_id?: string;
  batch_number?: string;
  warehouse_location?: string;
  notes?: string;
  journal_entry_id?: mongoose.Types.ObjectId | null;
  created_by_user_id?: mongoose.Types.ObjectId | null;
  created_at: Date;
}

const InventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    movement_type: { type: String, enum: Object.values(InventoryMovementType), required: true, index: true },
    movement_date: { type: Date, required: true, index: true },
    quantity: { type: Schema.Types.Decimal128, required: true },
    unit_cost: { type: Schema.Types.Decimal128, required: true, default: 0.0 },
    total_cost: { type: Schema.Types.Decimal128, required: true, default: 0.0 },
    reference_type: { type: String, default: null },
    reference_id: { type: String, default: null },
    batch_number: { type: String, default: null },
    warehouse_location: { type: String, default: 'Main Warehouse' },
    notes: { type: String, default: '' },
    journal_entry_id: { type: Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
    created_by_user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

InventoryMovementSchema.index({ entity_id: 1, product_id: 1, movement_date: -1 });

export const InventoryMovement = mongoose.model<IInventoryMovement>('InventoryMovement', InventoryMovementSchema);

export interface IStockAdjustment extends Document {
  entity_id: mongoose.Types.ObjectId;
  adjustment_number: string;
  adjustment_date: Date;
  product_id: mongoose.Types.ObjectId;
  adjustment_type: 'INCREASE' | 'DECREASE';
  quantity: mongoose.Types.Decimal128;
  unit_cost: mongoose.Types.Decimal128;
  total_value: mongoose.Types.Decimal128;
  reason: string;
  warehouse_location: string;
  journal_entry_id?: mongoose.Types.ObjectId | null;
  created_by_user_id?: mongoose.Types.ObjectId | null;
  created_at: Date;
}

const StockAdjustmentSchema = new Schema<IStockAdjustment>(
  {
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    adjustment_number: { type: String, required: true, index: true },
    adjustment_date: { type: Date, required: true },
    product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    adjustment_type: { type: String, enum: ['INCREASE', 'DECREASE'], required: true },
    quantity: { type: Schema.Types.Decimal128, required: true },
    unit_cost: { type: Schema.Types.Decimal128, required: true, default: 0.0 },
    total_value: { type: Schema.Types.Decimal128, required: true, default: 0.0 },
    reason: { type: String, required: true },
    warehouse_location: { type: String, default: 'Main Warehouse' },
    journal_entry_id: { type: Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
    created_by_user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

StockAdjustmentSchema.index({ entity_id: 1, adjustment_number: 1 }, { unique: true });

export const StockAdjustment = mongoose.model<IStockAdjustment>('StockAdjustment', StockAdjustmentSchema);
