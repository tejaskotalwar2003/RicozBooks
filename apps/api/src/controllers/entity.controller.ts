import { Request, Response } from 'express';
import { Entity, Organization } from '../models/Organization';
import { Account } from '../models/Account';
import { AccountType, NormalBalance } from '@ricozbooks/shared';
import { AuditService } from '../services/audit.service';

export class EntityController {
  public static async listEntities(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { company_id } = req.query;

      const query: any = { is_active: true };
      if (company_id) {
        query.company_id = company_id;
      } else if (user?.default_company_id) {
        query.company_id = user.default_company_id;
      }

      const entities = await Entity.find(query).sort({ created_at: 1 });
      const formatted = entities.map((e) => {
        const obj = e.toObject ? e.toObject() : e;
        return {
          ...obj,
          id: String(obj._id),
          _id: String(obj._id),
          company_id: obj.company_id ? String(obj.company_id) : null,
        };
      });
      return res.json(formatted);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ detail: err.message });
    }
  }

  public static async getEntity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const entity = await Entity.findById(id);
      if (!entity) {
        return res.status(404).json({ detail: `Entity with ID ${id} not found` });
      }
      const obj = entity.toObject ? entity.toObject() : entity;
      return res.json({
        ...obj,
        id: String(obj._id),
        _id: String(obj._id),
        company_id: obj.company_id ? String(obj.company_id) : null,
      });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ detail: err.message });
    }
  }

  public static async createEntity(req: Request, res: Response) {
    try {
      const {
        company_id,
        name,
        legal_name,
        tax_identifier,
        gstin,
        pan,
        address,
        city,
        state,
        financial_year = '2025-26',
        currency = 'INR',
        upi_id,
        razorpay_key_id,
      } = req.body;

      if (!name || !tax_identifier) {
        return res.status(400).json({ detail: 'Name and tax identifier are required.' });
      }

      let companyId = company_id;
      if (!companyId) {
        const user = (req as any).user;
        companyId = user?.default_company_id;
        if (!companyId) {
          const defaultOrg = await Organization.findOne({ is_active: true });
          companyId = defaultOrg?._id;
        }
      }

      const entity = await Entity.create({
        company_id: companyId,
        name: name.trim(),
        legal_name: legal_name || name.trim(),
        tax_identifier: tax_identifier.trim(),
        gstin: gstin || tax_identifier.trim(),
        pan: pan || null,
        currency,
        financial_year,
        address: address || null,
        city: city || null,
        state: state || null,
        status: 'ACTIVE',
        upi_id: upi_id || null,
        razorpay_key_id: razorpay_key_id || null,
        payment_gateway_active: true,
        is_active: true,
      });

      // Automatically provision standard 5700 COGS account
      const existingCogs = await Account.findOne({ entity_id: entity._id, code: '5700' });
      if (!existingCogs) {
        await Account.create({
          entity_id: entity._id,
          code: '5700',
          name: 'Cost of Goods Sold (COGS)',
          account_type: AccountType.EXPENSE,
          normal_balance: NormalBalance.DEBIT,
          currency: entity.currency,
          description: 'Cost of inventory and merchandise sold',
          is_active: true,
        });
      }

      await AuditService.logEvent({
        req,
        userId: (req as any).user?.id,
        userEmail: (req as any).user?.email,
        action: 'ENTITY_CREATED',
        recordType: 'ENTITY',
        recordId: String(entity._id),
        details: { name: entity.name, tax_identifier: entity.tax_identifier },
      });

      return res.status(201).json(entity);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ detail: err.message });
    }
  }

  public static async updateEntity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const entity = await Entity.findByIdAndUpdate(id, { $set: req.body }, { new: true });
      if (!entity) {
        return res.status(404).json({ detail: `Entity with ID ${id} not found` });
      }

      await AuditService.logEvent({
        req,
        userId: (req as any).user?.id,
        userEmail: (req as any).user?.email,
        action: 'ENTITY_UPDATED',
        recordType: 'ENTITY',
        recordId: String(entity._id),
        details: req.body,
      });

      return res.json(entity);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ detail: err.message });
    }
  }

  public static async listCompanies(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      let query: any = { is_active: true };
      if (user?.default_company_id && !user?.is_superuser) {
        query._id = user.default_company_id;
      }
      const orgs = await Organization.find(query);
      const results = await Promise.all(
        orgs.map(async (org) => {
          const rawEntities = await Entity.find({ company_id: org._id, is_active: true });
          const entities = rawEntities.map((e) => {
            const obj = e.toObject ? e.toObject() : e;
            return {
              ...obj,
              id: String(obj._id),
              _id: String(obj._id),
              company_id: String(org._id),
            };
          });
          return {
            id: String(org._id),
            _id: String(org._id),
            name: org.name,
            code: (org as any).code || org.name.substring(0, 4).toUpperCase(),
            legal_name: org.legal_name,
            tax_identifier: (org as any).tax_identifier || null,
            base_currency: org.currency || 'INR',
            entities,
          };
        })
      );
      return res.json(results);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ detail: err.message });
    }
  }
}

