import { Request, Response, NextFunction } from 'express';
import mongoose from 'express';
import { Currency, ExchangeRate } from '../models/Settings';
import { FiscalPeriod } from '../models/FiscalPeriod';
import { Role, Permission } from '../models/Role';
import { Entity } from '../models/Organization';
import { AuditService } from '../services/audit.service';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export class SettingsController {
  // ==========================================
  // Multi-Currency & Exchange Rates
  // ==========================================
  public static async getExchangeRates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { from_currency, to_currency } = req.query;
      const filter: any = {};
      if (from_currency) filter.from_currency = String(from_currency).toUpperCase();
      if (to_currency) filter.to_currency = String(to_currency).toUpperCase();

      const rates = await ExchangeRate.find(filter).sort({ effective_date: -1, from_currency: 1 });
      const items = rates.map((r) => ({
        id: r._id,
        from_currency: r.from_currency,
        to_currency: r.to_currency,
        rate: Number(r.rate?.toString() || 1),
        effective_date: r.effective_date,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));

      res.json(items);
    } catch (err) {
      next(err);
    }
  }

  public static async upsertExchangeRate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { from_currency, to_currency, rate, effective_date } = req.body;
      const fromCurr = String(from_currency).toUpperCase().trim();
      const toCurr = String(to_currency).toUpperCase().trim();
      const effDate = effective_date ? new Date(effective_date) : new Date();

      let record = await ExchangeRate.findOne({
        from_currency: fromCurr,
        to_currency: toCurr,
        effective_date: effDate,
      });

      let action = 'EXCHANGE_RATE_CREATED';
      if (record) {
        record.rate = rate;
        await record.save();
        action = 'EXCHANGE_RATE_UPDATED';
      } else {
        record = await ExchangeRate.create({
          from_currency: fromCurr,
          to_currency: toCurr,
          rate,
          effective_date: effDate,
        });
      }

      const userId = (req as any).user?.id || (req as any).user?._id;
      await AuditService.log({
        user_id: userId,
        user_email: (req as any).user?.email,
        action,
        record_type: 'ExchangeRate',
        record_id: String(record._id),
        details: `${action}: 1 ${fromCurr} = ${rate} ${toCurr}`,
      });

      res.status(201).json({
        id: record._id,
        from_currency: record.from_currency,
        to_currency: record.to_currency,
        rate: Number(record.rate?.toString() || 1),
        effective_date: record.effective_date,
        created_at: record.created_at,
        updated_at: record.updated_at,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateExchangeRate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { rateId } = req.params;
      const { rate, effective_date } = req.body;

      const record = await ExchangeRate.findById(rateId);
      if (!record) {
        res.status(404).json({ detail: 'Exchange rate record not found' });
        return;
      }

      record.rate = rate;
      if (effective_date) record.effective_date = new Date(effective_date);
      await record.save();

      res.json({
        id: record._id,
        from_currency: record.from_currency,
        to_currency: record.to_currency,
        rate: Number(record.rate?.toString() || 1),
        effective_date: record.effective_date,
        created_at: record.created_at,
        updated_at: record.updated_at,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteExchangeRate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { rateId } = req.params;
      await ExchangeRate.findByIdAndDelete(rateId);
      res.json({ message: 'Exchange rate deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Fiscal Periods
  // ==========================================
  public static async getFiscalPeriods(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, fiscal_year } = req.query;
      const filter: any = {};
      if (entity_id) filter.entity_id = entity_id;
      if (fiscal_year) filter.fiscal_year = fiscal_year;

      const periods = await FiscalPeriod.find(filter).sort({ start_date: 1 });
      const items = periods.map((p) => ({
        id: p._id,
        entity_id: p.entity_id,
        name: p.name,
        fiscal_year: p.fiscal_year,
        start_date: p.start_date,
        end_date: p.end_date,
        is_closed: p.is_closed,
        closed_at: p.closed_at,
      }));

      res.json(items);
    } catch (err) {
      next(err);
    }
  }

  public static async generateFiscalYear(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, fiscal_year, start_month = 4 } = req.body;
      const fyStr = String(fiscal_year || '2025-26').trim();

      let startYear = 2025;
      if (fyStr.includes('-')) {
        startYear = parseInt(fyStr.split('-')[0], 10);
      } else {
        startYear = parseInt(fyStr, 10);
      }

      const createdPeriods = [];
      let monthCursor = Number(start_month); // 4 for April (Indian FY)
      let yearCursor = startYear;

      for (let periodNum = 1; periodNum <= 12; periodNum++) {
        const lastDay = new Date(yearCursor, monthCursor, 0).getDate();
        const pStart = new Date(yearCursor, monthCursor - 1, 1);
        const pEnd = new Date(yearCursor, monthCursor - 1, lastDay, 23, 59, 59);
        const pName = `${MONTH_NAMES[monthCursor - 1]} ${yearCursor}`;

        let period = await FiscalPeriod.findOne({
          entity_id,
          fiscal_year: fyStr,
          name: pName,
        });

        if (!period) {
          period = await FiscalPeriod.create({
            entity_id,
            fiscal_year: fyStr,
            name: pName,
            start_date: pStart,
            end_date: pEnd,
            is_closed: false,
          });
        }

        createdPeriods.push({
          id: period._id,
          entity_id: period.entity_id,
          name: period.name,
          fiscal_year: period.fiscal_year,
          start_date: period.start_date,
          end_date: period.end_date,
          is_closed: period.is_closed,
        });

        monthCursor += 1;
        if (monthCursor > 12) {
          monthCursor = 1;
          yearCursor += 1;
        }
      }

      const userId = (req as any).user?.id || (req as any).user?._id;
      await AuditService.log({
        user_id: userId,
        user_email: (req as any).user?.email,
        action: 'FISCAL_YEAR_GENERATED',
        record_type: 'FiscalPeriod',
        record_id: String(entity_id),
        entity_id,
        details: `Generated 12 fiscal periods for FY ${fyStr}`,
      });

      res.status(201).json(createdPeriods);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // RBAC Roles & Permissions Matrix
  // ==========================================
  public static async getRolesMatrix(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roles = await Role.find().sort({ name: 1 });
      const permissions = await Permission.find().sort({ module: 1, code: 1 });

      res.json({
        roles: roles.map((r) => ({
          id: r._id,
          name: r.name,
          description: r.description,
          permissions: r.permissions || [],
          is_system: r.is_system,
        })),
        all_permissions: permissions.map((p) => ({
          id: p._id,
          code: p.code,
          name: p.name,
          module: p.module,
          description: p.description,
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateRolePermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { role_name, permission_codes } = req.body;
      const role = await Role.findOne({ name: String(role_name).toUpperCase().trim() });
      if (!role) {
        res.status(404).json({ detail: `Role '${role_name}' not found` });
        return;
      }

      if (role.name === 'ADMIN' && (!permission_codes || permission_codes.length === 0)) {
        res.status(400).json({ detail: 'Cannot revoke all permissions from the ADMIN role' });
        return;
      }

      role.permissions = permission_codes || [];
      await role.save();

      res.json({
        id: role._id,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        is_system: role.is_system,
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Entity Statutory Tax Profile
  // ==========================================
  public static async getEntityTaxProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entityId } = req.params;
      const entity = await Entity.findById(entityId);
      if (!entity) {
        res.status(404).json({ detail: 'Entity not found' });
        return;
      }

      res.json({
        id: entity._id,
        name: entity.name,
        code: entity.code,
        gstin: (entity as any).gstin || (entity as any).tax_identifier,
        pan: (entity as any).pan || (entity as any).tax_identifier?.slice(2, 12),
        currency: entity.currency,
        address: (entity as any).address,
        is_active: entity.is_active,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateEntityTaxProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entityId } = req.params;
      const entity = await Entity.findById(entityId);
      if (!entity) {
        res.status(404).json({ detail: 'Entity not found' });
        return;
      }

      if (req.body.gstin) {
        (entity as any).gstin = req.body.gstin;
        (entity as any).tax_identifier = req.body.gstin;
      }
      if (req.body.pan) (entity as any).pan = req.body.pan;
      if (req.body.currency) entity.currency = req.body.currency;
      if (req.body.address) (entity as any).address = req.body.address;

      await entity.save();

      res.json({
        id: entity._id,
        name: entity.name,
        code: entity.code,
        gstin: (entity as any).gstin || (entity as any).tax_identifier,
        pan: (entity as any).pan,
        currency: entity.currency,
        address: (entity as any).address,
        is_active: entity.is_active,
      });
    } catch (err) {
      next(err);
    }
  }
}
