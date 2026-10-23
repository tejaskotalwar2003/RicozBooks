import { Request, Response } from 'express';
import { ReportingEngine } from '../services/reporting.engine';

export class ReportController {
  public static async getTrialBalance(req: Request, res: Response) {
    try {
      const entityId = (req.query.entity_id as string) || (req as any).user?.default_entity_id;
      if (!entityId) {
        return res.status(400).json({ detail: 'entity_id query parameter is required' });
      }

      const now = new Date();
      const currentYear = now.getFullYear();
      const fyStart = now.getMonth() >= 3 ? new Date(currentYear, 3, 1) : new Date(currentYear - 1, 3, 1);
      
      const startDate = req.query.start_date ? new Date(req.query.start_date as string) : fyStart;
      const endDate = req.query.end_date ? new Date(req.query.end_date as string) : now;
      const includeUnposted = req.query.include_unposted === 'true';

      const report = await ReportingEngine.generateTrialBalance(entityId, startDate, endDate, includeUnposted);
      return res.json(report);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ detail: err.message });
    }
  }

  public static async getProfitAndLoss(req: Request, res: Response) {
    try {
      const entityId = (req.query.entity_id as string) || (req as any).user?.default_entity_id;
      if (!entityId) {
        return res.status(400).json({ detail: 'entity_id query parameter is required' });
      }

      const now = new Date();
      const currentYear = now.getFullYear();
      const fyStart = now.getMonth() >= 3 ? new Date(currentYear, 3, 1) : new Date(currentYear - 1, 3, 1);

      const startDate = req.query.start_date ? new Date(req.query.start_date as string) : fyStart;
      const endDate = req.query.end_date ? new Date(req.query.end_date as string) : now;
      const includeUnposted = req.query.include_unposted === 'true';

      const report = await ReportingEngine.generateProfitAndLoss(entityId, startDate, endDate, includeUnposted);
      return res.json(report);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ detail: err.message });
    }
  }

  public static async getBalanceSheet(req: Request, res: Response) {
    try {
      const entityId = (req.query.entity_id as string) || (req as any).user?.default_entity_id;
      if (!entityId) {
        return res.status(400).json({ detail: 'entity_id query parameter is required' });
      }

      const asOfDate = req.query.as_of_date ? new Date(req.query.as_of_date as string) : new Date();
      const includeUnposted = req.query.include_unposted === 'true';

      const report = await ReportingEngine.generateBalanceSheet(entityId, asOfDate, includeUnposted);
      return res.json(report);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ detail: err.message });
    }
  }

  public static async getAccountLedger(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const entityId = (req.query.entity_id as string) || (req as any).user?.default_entity_id;
      if (!entityId) {
        return res.status(400).json({ detail: 'entity_id query parameter is required' });
      }

      const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
      const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;

      const ledger = await ReportingEngine.getAccountLedger(entityId, id, startDate, endDate);
      return res.json(ledger);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ detail: err.message });
    }
  }
}
