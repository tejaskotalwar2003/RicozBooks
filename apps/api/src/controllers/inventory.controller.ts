import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { InventoryMovement, StockAdjustment } from '../models/InventoryMovement';
import { AccountingEngine } from '../services/accounting.engine';
import { AuditService } from '../services/audit.service';
import { AccountType, NormalBalance, InventoryMovementType } from '@ricozbooks/shared';

export class InventoryController {
  // ==========================================
  // Valuation Summary
  // ==========================================
  public static async getValuation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id } = req.query;
      if (!entity_id) {
        res.status(400).json({ detail: 'entity_id is required' });
        return;
      }

      const products = await Product.find({ entity_id, is_active: true }).sort({ name: 1 });

      let totalAssetValuation = 0;
      let inStockCount = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;

      const items = products.map((p) => {
        const stock = Number(p.current_stock?.toString() || 0);
        const minAlert = Number(p.min_stock_alert?.toString() || 0);
        const purchasePrice = Number(p.purchase_price?.toString() || 0);
        const sellingPrice = Number(p.selling_price?.toString() || 0);
        const valuation = Math.round(stock * purchasePrice * 100) / 100;

        totalAssetValuation += valuation;

        let stockStatus = 'IN_STOCK';
        if (stock <= 0) {
          stockStatus = 'OUT_OF_STOCK';
          outOfStockCount += 1;
        } else if (stock <= minAlert) {
          stockStatus = 'LOW_STOCK';
          lowStockCount += 1;
        } else {
          inStockCount += 1;
        }

        return {
          id: p._id,
          entity_id: p.entity_id,
          name: p.name,
          sku: p.sku,
          product_type: p.product_type,
          unit: p.unit || 'PCS',
          selling_price: sellingPrice,
          purchase_price: purchasePrice,
          hsn_sac_code: p.hsn_sac_code,
          current_stock: stock,
          min_stock_alert: minAlert,
          total_valuation: valuation,
          stock_status: stockStatus,
          is_active: p.is_active,
        };
      });

      res.json({
        total_products_count: products.length,
        in_stock_count: inStockCount,
        low_stock_count: lowStockCount,
        out_of_stock_count: outOfStockCount,
        total_asset_valuation: Math.round(totalAssetValuation * 100) / 100,
        products: items,
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Stock Movements List
  // ==========================================
  public static async listMovements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        entity_id,
        product_id,
        movement_type,
        page = 1,
        page_size = 20,
        paginate = 'true',
      } = req.query;

      if (!entity_id) {
        res.status(400).json({ detail: 'entity_id is required' });
        return;
      }

      const filter: any = { entity_id };
      if (product_id) filter.product_id = product_id;
      if (movement_type) filter.movement_type = String(movement_type).toUpperCase();

      const total = await InventoryMovement.countDocuments(filter);
      const effLimit = Number(page_size);
      const effSkip = (Number(page) - 1) * effLimit;

      const movements = await InventoryMovement.find(filter)
        .populate('product_id', 'name sku unit')
        .sort({ movement_date: -1, _id: -1 })
        .skip(effSkip)
        .limit(effLimit);

      const items = movements.map((m: any) => ({
        id: m._id,
        entity_id: m.entity_id,
        product_id: m.product_id?._id || m.product_id,
        product_name: m.product_id?.name || null,
        movement_type: m.movement_type,
        movement_date: m.movement_date,
        quantity: Number(m.quantity?.toString() || 0),
        unit_cost: Number(m.unit_cost?.toString() || 0),
        total_cost: Number(m.total_cost?.toString() || 0),
        reference_type: m.reference_type,
        reference_id: m.reference_id,
        batch_number: m.batch_number,
        warehouse_location: m.warehouse_location,
        notes: m.notes,
        journal_entry_id: m.journal_entry_id,
        created_at: m.created_at,
      }));

      if (paginate === 'false') {
        res.json(items);
        return;
      }

      res.json({
        items,
        total,
        page: Number(page),
        page_size: effLimit,
        total_pages: Math.ceil(total / effLimit) || 1,
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Stock Adjustments
  // ==========================================
  public static async createAdjustment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        entity_id,
        product_id,
        adjustment_type,
        quantity,
        unit_cost,
        reason,
        warehouse_location = 'Main Warehouse',
      } = req.body;

      const userId = (req as any).user?.id || (req as any).user?._id;

      const product = await Product.findById(product_id);
      if (!product) {
        res.status(404).json({ detail: 'Product not found' });
        return;
      }

      const adjQty = Number(quantity);
      const currentStock = Number(product.current_stock?.toString() || 0);
      const costPerUnit = unit_cost !== undefined ? Number(unit_cost) : Number(product.purchase_price?.toString() || 0);
      const totalValue = Math.round(adjQty * costPerUnit * 100) / 100;

      let newStock = currentStock;
      if (adjustment_type === 'INCREASE') {
        newStock += adjQty;
      } else {
        newStock = Math.max(0, currentStock - adjQty);
      }

      product.current_stock = newStock as any;
      await product.save();

      // Generate adjustment number
      const count = await StockAdjustment.countDocuments({ entity_id });
      const adjNumber = `ADJ-${(count + 1).toString().padStart(5, '0')}`;

      // Create StockAdjustment record
      const adjustment = await StockAdjustment.create({
        entity_id,
        adjustment_number: adjNumber,
        adjustment_date: new Date(),
        product_id,
        adjustment_type,
        quantity: adjQty,
        unit_cost: costPerUnit,
        total_value: totalValue,
        reason,
        warehouse_location,
        created_by_user_id: userId,
      });

      // Record movement
      await InventoryMovement.create({
        entity_id,
        product_id,
        movement_type: adjustment_type === 'INCREASE' ? InventoryMovementType.ADJUSTMENT_IN : InventoryMovementType.ADJUSTMENT_OUT,
        movement_date: new Date(),
        quantity: adjQty,
        unit_cost: costPerUnit,
        total_cost: totalValue,
        reference_type: 'StockAdjustment',
        reference_id: adjNumber,
        warehouse_location,
        notes: reason,
        created_by_user_id: userId,
      });

      // GL double entry for stock adjustment
      try {
        const inventoryAccount = await AccountingEngine.getOrCreateAccount(
          entity_id,
          '1300',
          'Merchandise Inventory',
          AccountType.ASSET,
          NormalBalance.DEBIT,
          'Stock in hand asset account'
        );

        const shrinkageAccount = await AccountingEngine.getOrCreateAccount(
          entity_id,
          '5100',
          'Inventory Shrinkage & Adjustment',
          AccountType.EXPENSE,
          NormalBalance.DEBIT,
          'Write-downs and physical count discrepancy expenses'
        );

        let lines: any[] = [];
        if (adjustment_type === 'INCREASE') {
          lines = [
            {
              account_id: inventoryAccount._id,
              debit: totalValue,
              credit: 0,
              description: `Stock increase: ${product.name} (${adjNumber})`,
            },
            {
              account_id: shrinkageAccount._id,
              debit: 0,
              credit: totalValue,
              description: `Inventory gain offset: ${product.name}`,
            },
          ];
        } else {
          lines = [
            {
              account_id: shrinkageAccount._id,
              debit: totalValue,
              credit: 0,
              description: `Stock write-down: ${product.name} (${adjNumber})`,
            },
            {
              account_id: inventoryAccount._id,
              debit: 0,
              credit: totalValue,
              description: `Inventory decrease: ${product.name}`,
            },
          ];
        }

        const journal = await AccountingEngine.createJournalEntry({
          entity_id,
          entry_date: new Date(),
          memo: `Inventory Adjustment #${adjNumber} - ${product.name}`,
          reference: adjNumber,
          currency: 'INR',
          created_by_user_id: userId,
          lines,
        });

        await AccountingEngine.postJournalToLedger(journal._id, userId, true);
        adjustment.journal_entry_id = journal._id;
        await adjustment.save();
      } catch (glErr) {
        console.error('Failed to post inventory adjustment to GL:', glErr);
      }

      await AuditService.log({
        user_id: userId,
        user_email: (req as any).user?.email,
        action: 'CREATE',
        record_type: 'StockAdjustment',
        record_id: String(adjustment._id),
        entity_id,
        details: `Stock adjustment #${adjNumber} (${adjustment_type} ${adjQty} units of ${product.name})`,
      });

      res.status(201).json({
        id: adjustment._id,
        entity_id: adjustment.entity_id,
        adjustment_number: adjustment.adjustment_number,
        adjustment_date: adjustment.adjustment_date,
        product_id: product._id,
        product_name: product.name,
        adjustment_type: adjustment.adjustment_type,
        quantity: adjQty,
        unit_cost: costPerUnit,
        total_value: totalValue,
        reason: adjustment.reason,
        warehouse_location: adjustment.warehouse_location,
        journal_entry_id: adjustment.journal_entry_id,
        created_at: adjustment.created_at,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async listAdjustments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, page = 1, page_size = 20, paginate = 'true' } = req.query;
      if (!entity_id) {
        res.status(400).json({ detail: 'entity_id is required' });
        return;
      }

      const total = await StockAdjustment.countDocuments({ entity_id });
      const effLimit = Number(page_size);
      const effSkip = (Number(page) - 1) * effLimit;

      const adjustments = await StockAdjustment.find({ entity_id })
        .populate('product_id', 'name sku unit')
        .sort({ adjustment_date: -1 })
        .skip(effSkip)
        .limit(effLimit);

      const items = adjustments.map((a: any) => ({
        id: a._id,
        entity_id: a.entity_id,
        adjustment_number: a.adjustment_number,
        adjustment_date: a.adjustment_date,
        product_id: a.product_id?._id || a.product_id,
        product_name: a.product_id?.name || null,
        adjustment_type: a.adjustment_type,
        quantity: Number(a.quantity?.toString() || 0),
        unit_cost: Number(a.unit_cost?.toString() || 0),
        total_value: Number(a.total_value?.toString() || 0),
        reason: a.reason,
        warehouse_location: a.warehouse_location,
        journal_entry_id: a.journal_entry_id,
        created_at: a.created_at,
      }));

      if (paginate === 'false') {
        res.json(items);
        return;
      }

      res.json({
        items,
        total,
        page: Number(page),
        page_size: effLimit,
        total_pages: Math.ceil(total / effLimit) || 1,
      });
    } catch (err) {
      next(err);
    }
  }
}
