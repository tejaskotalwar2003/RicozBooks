import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models/AuditLog';

export class AuditController {
  public static async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        entity_id,
        action,
        record_type,
        user_email,
        start_date,
        end_date,
        search,
        page = 1,
        page_size = 50,
        limit,
        skip,
        paginate = 'true',
      } = req.query;

      const filter: any = {};
      if (entity_id) filter.entity_id = entity_id;
      if (action) filter.action = action;
      if (record_type) filter.record_type = record_type;
      if (user_email) filter.user_email = { $regex: String(user_email), $options: 'i' };

      if (start_date || end_date) {
        filter.timestamp = {};
        if (start_date) filter.timestamp.$gte = new Date(start_date as string);
        if (end_date) filter.timestamp.$lte = new Date(end_date as string);
      }

      if (search) {
        const s = String(search);
        filter.$or = [
          { action: { $regex: s, $options: 'i' } },
          { record_type: { $regex: s, $options: 'i' } },
          { record_id: { $regex: s, $options: 'i' } },
          { details: { $regex: s, $options: 'i' } },
          { user_email: { $regex: s, $options: 'i' } },
        ];
      }

      const total = await AuditLog.countDocuments(filter);
      const effLimit = Number(limit || page_size);
      const effSkip = skip !== undefined ? Number(skip) : (Number(page) - 1) * effLimit;

      const logs = await AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(effSkip)
        .limit(effLimit);

      const items = logs.map((l) => ({
        id: l._id,
        user_id: l.user_id,
        user_email: l.user_email,
        action: l.action,
        record_type: l.record_type,
        record_id: l.record_id,
        company_id: l.company_id,
        entity_id: l.entity_id,
        details: l.details,
        ip_address: l.ip_address,
        user_agent: l.user_agent,
        timestamp: l.timestamp,
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

  public static async exportAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id } = req.query;
      const filter: any = {};
      if (entity_id) filter.entity_id = entity_id;

      const logs = await AuditLog.find(filter).sort({ timestamp: -1 }).limit(1000);

      const headers = ['Timestamp', 'Action', 'Record Type', 'Record ID', 'User Email', 'Details', 'IP Address'];
      const rows = logs.map((l) => [
        `"${l.timestamp?.toISOString() || ''}"`,
        `"${l.action || ''}"`,
        `"${l.record_type || ''}"`,
        `"${l.record_id || ''}"`,
        `"${l.user_email || ''}"`,
        `"${(l.details || '').replace(/"/g, '""')}"`,
        `"${l.ip_address || ''}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit_logs.csv"');
      res.send(csvContent);
    } catch (err) {
      next(err);
    }
  }
}
