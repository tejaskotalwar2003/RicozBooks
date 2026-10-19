import mongoose, { Schema, Document } from 'mongoose';
import { ProductType } from '@ricozbooks/shared';

export interface IProduct extends Document {
  entity_id: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  barcode?: string;
  product_type: ProductType;
  category?: string;
  unit: string;
  selling_price: mongoose.Types.Decimal128;
  purchase_price: mongoose.Types.Decimal128;
  hsn_sac_code?: string;
  tax_rate: mongoose.Types.Decimal128;
  track_inventory: boolean;
  opening_stock: mongoose.Types.Decimal128;
  current_stock: mongoose.Types.Decimal128;
  opening_stock_rate: mongoose.Types.Decimal128;
  reorder_level: mongoose.Types.Decimal128;
  min_stock_alert: mongoose.Types.Decimal128;
  warehouse_location?: string;
  sales_account_id?: mongoose.Types.ObjectId | null;
  cogs_account_id?: mongoose.Types.ObjectId | null;
  inventory_account_id?: mongoose.Types.ObjectId | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    entity_id: { type: Schema.Types.ObjectId, ref: 'Entity', required: true, index: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    barcode: { type: String, default: null },
    product_type: { type: String, enum: Object.values(ProductType), default: ProductType.PRODUCT, index: true },
    category: { type: String, default: 'General' },
    unit: { type: String, default: 'PCS' },
    selling_price: { type: Schema.Types.Decimal128, required: true, default: 0.0 },
    purchase_price: { type: Schema.Types.Decimal128, required: true, default: 0.0 },
    hsn_sac_code: { type: String, default: null },
    tax_rate: { type: Schema.Types.Decimal128, default: 18.0 },
    track_inventory: { type: Boolean, default: true },
    opening_stock: { type: Schema.Types.Decimal128, default: 0.0 },
    current_stock: { type: Schema.Types.Decimal128, default: 0.0 },
    opening_stock_rate: { type: Schema.Types.Decimal128, default: 0.0 },
    reorder_level: { type: Schema.Types.Decimal128, default: 0.0 },
    min_stock_alert: { type: Schema.Types.Decimal128, default: 0.0 },
    warehouse_location: { type: String, default: 'Main Warehouse' },
    sales_account_id: { type: Schema.Types.ObjectId, ref: 'Account', default: null },
    cogs_account_id: { type: Schema.Types.ObjectId, ref: 'Account', default: null },
    inventory_account_id: { type: Schema.Types.ObjectId, ref: 'Account', default: null },
    is_active: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

ProductSchema.index({ entity_id: 1, sku: 1 }, { unique: true });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
