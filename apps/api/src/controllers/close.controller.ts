import { Request, Response, NextFunction } from 'express';
import mongoose from 'express';
import { ClosePeriod, CloseTask, IClosePeriod, ICloseTask } from '../models/Close';
import { FiscalPeriod } from '../models/FiscalPeriod';
import { AuditService } from '../services/audit.service';

const DEFAULT_CLOSE_TASKS = [
  { title: 'Bank Reconciliation', description: 'Reconcile primary operating bank accounts with ledger cash balances' },
  { title: 'Accrued Expenses & Amortization', description: 'Calculate and post monthly accruals for utilities, SaaS, and unbilled vendor invoices' },
  { title: 'Fixed Asset Depreciation', description: 'Run and post fixed asset straight-line monthly depreciation schedules' },
  { title: 'SaaS MRR Revenue Recognition', description: 'Audit and verify monthly recurring software subscription revenue recognition' },
  { title: 'Intercompany Reconciliation', description: 'Reconcile intercompany transfers and due-to/due-from balances across subsidiaries' },
  { title: 'GST 2B Input Tax Reconciliation', description: 'Reconcile GST 2B tax credits with eligible input purchase entries' },
  { title: 'Supervisory Journal Review', description: 'Complete four-eyes maker-checker supervisory review of submitted journal vouchers' },
  { title: 'Management Final Approval & Lock', description: 'CFO executive authorization and permanent period ledger lock' },
];

async function recalculatePeriodProgress(period: any): Promise<any> {
  const tasks = await CloseTask.find({ close_period_id: period._id });
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'APPROVED' || t.status === 'COMPLETED').length;

  period.completion_percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  if (period.status !== 'CLOSED') {
    if (total > 0 && completed === total) {
      period.status = 'READY_FOR_REVIEW';
    } else if (completed > 0) {
      period.status = 'IN_PROGRESS';
    } else {
      period.status = 'NOT_STARTED';
    }
  }

  await period.save();
  return period;
}

export class CloseController {
  // ==========================================
  // List Close Periods
  // ==========================================
  public static async getPeriods(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id } = req.query;
      const filter: any = {};
      if (entity_id) filter.entity_id = entity_id;

      const periods = await ClosePeriod.find(filter).sort({ start_date: -1, _id: -1 });

      const results = await Promise.all(
        periods.map(async (p) => {
          await recalculatePeriodProgress(p);
          const totalTasks = await CloseTask.countDocuments({ close_period_id: p._id });
          const completedTasks = await CloseTask.countDocuments({
            close_period_id: p._id,
            status: { $in: ['APPROVED', 'COMPLETED'] },
          });

          return {
            id: p._id,
            entity_id: p.entity_id,
            name: p.name,
            period_name: p.period_name || p.name,
            fiscal_year: p.fiscal_year,
            period_number: p.period_number,
            month: p.month || p.period_number,
            start_date: p.start_date,
            end_date: p.end_date,
            target_date: p.target_date,
            status: p.status,
            completion_percentage: p.completion_percentage,
            total_tasks: totalTasks,
            completed_tasks: completedTasks,
            closed_at: p.closed_at,
            created_at: p.created_at,
          };
        })
      );

      res.json(results);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Get Close Period Detail
  // ==========================================
  public static async getPeriodDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const period = await ClosePeriod.findById(id);
      if (!period) {
        res.status(404).json({ detail: 'Close period not found' });
        return;
      }

      await recalculatePeriodProgress(period);

      const tasks = await CloseTask.find({ close_period_id: period._id })
        .populate('assigned_to_id', 'first_name last_name name email')
        .populate('reviewer_id', 'first_name last_name name email')
        .sort({ order: 1 });

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t) => ['APPROVED', 'COMPLETED'].includes(t.status)).length;

      const taskResponses = tasks.map((t: any) => ({
        id: t._id,
        close_period_id: t.close_period_id,
        entity_id: t.entity_id,
        title: t.title,
        task_name: t.task_name || t.title,
        description: t.description,
        category: t.category,
        notes: t.notes,
        status: t.status,
        assigned_to_id: t.assigned_to_id?._id || t.assigned_to_id,
        assigned_to_name: t.assigned_to_id ? `${t.assigned_to_id.first_name || ''} ${t.assigned_to_id.last_name || ''}`.trim() || t.assigned_to_id.name : null,
        reviewer_id: t.reviewer_id?._id || t.reviewer_id,
        reviewer_name: t.reviewer_id ? `${t.reviewer_id.first_name || ''} ${t.reviewer_id.last_name || ''}`.trim() || t.reviewer_id.name : null,
        due_date: t.due_date,
        completed_at: t.completed_at,
        is_mandatory: t.is_mandatory,
        order: t.order,
      }));

      res.json({
        id: period._id,
        entity_id: period.entity_id,
        name: period.name,
        period_name: period.period_name || period.name,
        fiscal_year: period.fiscal_year,
        period_number: period.period_number,
        month: period.month || period.period_number,
        start_date: period.start_date,
        end_date: period.end_date,
        target_date: period.target_date,
        status: period.status,
        completion_percentage: period.completion_percentage,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        closed_at: period.closed_at,
        created_at: period.created_at,
        tasks: taskResponses,
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Create Close Period
  // ==========================================
  public static async createPeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        entity_id,
        name,
        period_name,
        fiscal_year = '2025-26',
        period_number,
        month,
        start_date,
        end_date,
        target_date,
      } = req.body;

      const pName = period_name || name;
      const pNum = Number(period_number || month || 1);
      const startDate = start_date ? new Date(start_date) : new Date();
      const endDate = end_date ? new Date(end_date) : new Date();
      const targetDate = target_date ? new Date(target_date) : endDate;

      const existing = await ClosePeriod.findOne({
        entity_id,
        fiscal_year,
        period_number: pNum,
      });

      if (existing) {
        res.status(400).json({ detail: 'Close period already exists for this fiscal period' });
        return;
      }

      const period = await ClosePeriod.create({
        entity_id,
        name: pName,
        period_name: pName,
        fiscal_year,
        period_number: pNum,
        month: pNum,
        start_date: startDate,
        end_date: endDate,
        target_date: targetDate,
        status: 'IN_PROGRESS',
        completion_percentage: 0,
      });

      // Seed default tasks
      for (let i = 0; i < DEFAULT_CLOSE_TASKS.length; i++) {
        const item = DEFAULT_CLOSE_TASKS[i];
        await CloseTask.create({
          close_period_id: period._id,
          entity_id,
          title: item.title,
          task_name: item.title,
          description: item.description,
          due_date: targetDate,
          status: 'NOT_STARTED',
          notes: 'Standard statutory close procedure',
          order: i + 1,
        });
      }

      const userId = (req as any).user?.id || (req as any).user?._id;
      await AuditService.log({
        user_id: userId,
        user_email: (req as any).user?.email,
        action: 'CLOSE_PERIOD_INITIALIZED',
        record_type: 'ClosePeriod',
        record_id: String(period._id),
        entity_id,
        details: `Initialized close period '${pName}' with 8 statutory checklist tasks.`,
      });

      req.params.id = String(period._id);
      return CloseController.getPeriodDetail(req, res, next);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Update Task Status
  // ==========================================
  public static async updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const task = await CloseTask.findById(id);
      if (!task) {
        res.status(404).json({ detail: 'Close task not found' });
        return;
      }

      const period = await ClosePeriod.findById(task.close_period_id);
      if (period && period.status === 'CLOSED') {
        res.status(400).json({ detail: 'Cannot modify tasks in a closed and locked accounting period.' });
        return;
      }

      const userId = (req as any).user?.id || (req as any).user?._id;

      if (req.body.title) task.title = req.body.title;
      if (req.body.task_name) task.task_name = req.body.task_name;
      if (req.body.description !== undefined) task.description = req.body.description;
      if (req.body.notes !== undefined) task.notes = req.body.notes;
      if (req.body.due_date) task.due_date = new Date(req.body.due_date);
      if (req.body.assigned_to_id) task.assigned_to_id = req.body.assigned_to_id;
      if (req.body.reviewer_id) task.reviewer_id = req.body.reviewer_id;

      if (req.body.status) {
        task.status = req.body.status;
        if (req.body.status === 'APPROVED' || req.body.status === 'COMPLETED') {
          task.completed_at = new Date();
          task.reviewer_id = userId;
        } else if (req.body.status === 'IN_PROGRESS' || req.body.status === 'READY_FOR_REVIEW') {
          if (!task.assigned_to_id) task.assigned_to_id = userId;
        } else if (req.body.status === 'NOT_STARTED') {
          task.completed_at = null as any;
        }
      }

      await task.save();

      if (period) {
        await recalculatePeriodProgress(period);
      }

      const populated = await CloseTask.findById(task._id)
        .populate('assigned_to_id', 'first_name last_name name email')
        .populate('reviewer_id', 'first_name last_name name email');

      res.json({
        id: populated!._id,
        close_period_id: populated!.close_period_id,
        entity_id: populated!.entity_id,
        title: populated!.title,
        task_name: populated!.task_name || populated!.title,
        description: populated!.description,
        category: populated!.category,
        notes: populated!.notes,
        status: populated!.status,
        assigned_to_id: (populated as any)!.assigned_to_id?._id,
        assigned_to_name: (populated as any)!.assigned_to_id?.name,
        reviewer_id: (populated as any)!.reviewer_id?._id,
        reviewer_name: (populated as any)!.reviewer_id?.name,
        due_date: populated!.due_date,
        completed_at: populated!.completed_at,
        is_mandatory: populated!.is_mandatory,
        order: populated!.order,
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Lock Period
  // ==========================================
  public static async lockPeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const userId = (req as any).user?.id || (req as any).user?._id;

      const period = await ClosePeriod.findById(id);
      if (!period) {
        res.status(404).json({ detail: 'Close period not found' });
        return;
      }

      if (period.status === 'CLOSED') {
        res.status(400).json({ detail: 'Period is already locked and closed.' });
        return;
      }

      period.status = 'CLOSED';
      period.closed_at = new Date();
      period.closed_by_id = userId;
      period.completion_percentage = 100;
      await period.save();

      // Lock corresponding FiscalPeriod
      await FiscalPeriod.updateMany(
        {
          entity_id: period.entity_id,
          $or: [
            { fiscal_year: period.fiscal_year, start_date: { $gte: period.start_date, $lte: period.end_date } },
            { fiscal_year: period.fiscal_year, name: period.name },
          ],
        },
        { is_closed: true, closed_at: new Date(), closed_by_user_id: userId }
      );

      await AuditService.log({
        user_id: userId,
        user_email: (req as any).user?.email,
        action: 'PERIOD_LOCKED',
        record_type: 'ClosePeriod',
        record_id: String(period._id),
        entity_id: period.entity_id,
        details: `CFO finalized and locked accounting period '${period.period_name}'. Hard ledger lock active. Remarks: ${notes || 'None'}`,
      });

      const totalTasks = await CloseTask.countDocuments({ close_period_id: period._id });
      const completedTasks = await CloseTask.countDocuments({
        close_period_id: period._id,
        status: { $in: ['APPROVED', 'COMPLETED'] },
      });

      res.json({
        id: period._id,
        entity_id: period.entity_id,
        name: period.name,
        period_name: period.period_name || period.name,
        fiscal_year: period.fiscal_year,
        period_number: period.period_number,
        month: period.month || period.period_number,
        start_date: period.start_date,
        end_date: period.end_date,
        status: period.status,
        completion_percentage: 100,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        closed_at: period.closed_at,
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Reopen Period
  // ==========================================
  public static async reopenPeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = (req as any).user?.id || (req as any).user?._id;

      const period = await ClosePeriod.findById(id);
      if (!period) {
        res.status(404).json({ detail: 'Close period not found' });
        return;
      }

      if (period.status !== 'CLOSED') {
        res.status(400).json({ detail: 'Period is not currently closed.' });
        return;
      }

      period.status = 'IN_PROGRESS';
      period.closed_at = null as any;
      period.closed_by_id = null as any;
      await period.save();

      // Unlock corresponding FiscalPeriod
      await FiscalPeriod.updateMany(
        {
          entity_id: period.entity_id,
          $or: [
            { fiscal_year: period.fiscal_year, start_date: { $gte: period.start_date, $lte: period.end_date } },
            { fiscal_year: period.fiscal_year, name: period.name },
          ],
        },
        { is_closed: false, closed_at: null, closed_by_user_id: null }
      );

      await recalculatePeriodProgress(period);

      await AuditService.log({
        user_id: userId,
        user_email: (req as any).user?.email,
        action: 'PERIOD_REOPENED',
        record_type: 'ClosePeriod',
        record_id: String(period._id),
        entity_id: period.entity_id,
        details: `CFO reopened accounting period '${period.period_name}'. Ledger unlocked. Reason: ${reason || 'Correction required'}`,
      });

      const totalTasks = await CloseTask.countDocuments({ close_period_id: period._id });
      const completedTasks = await CloseTask.countDocuments({
        close_period_id: period._id,
        status: { $in: ['APPROVED', 'COMPLETED'] },
      });

      res.json({
        id: period._id,
        entity_id: period.entity_id,
        name: period.name,
        period_name: period.period_name || period.name,
        fiscal_year: period.fiscal_year,
        period_number: period.period_number,
        month: period.month || period.period_number,
        start_date: period.start_date,
        end_date: period.end_date,
        status: period.status,
        completion_percentage: period.completion_percentage,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        closed_at: null,
      });
    } catch (err) {
      next(err);
    }
  }
}
