import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Project, ProjectTask, Timesheet, IProject, IProjectTask, ITimesheet } from '../models/Project';
import { Customer } from '../models/Customer';
import { AuditService } from '../services/audit.service';

export function calculateProfitability(project: any, timesheets: any[]): any {
  let totalBillableHours = 0;
  let totalNonBillableHours = 0;
  let totalLaborCost = 0;
  let unbilledRevenue = 0;
  let invoicedRevenue = 0;

  for (const ts of timesheets) {
    const hrs = Number(ts.hours || 0);
    const hourlyRate = Number(ts.hourly_rate?.toString() || project.default_hourly_rate?.toString() || 0);
    const costRate = Math.round(hourlyRate * 0.6 * 100) / 100; // standard 60% direct labor cost ratio

    totalLaborCost += hrs * costRate;

    if (ts.is_billable) {
      totalBillableHours += hrs;
      if (ts.is_billed) {
        invoicedRevenue += hrs * hourlyRate;
      } else {
        unbilledRevenue += hrs * hourlyRate;
      }
    } else {
      totalNonBillableHours += hrs;
    }
  }

  const budgetAmount = Number(project.budget_amount?.toString() || 0);
  let totalRecognizedRevenue = invoicedRevenue + unbilledRevenue;
  if (project.billing_type === 'FIXED') {
    totalRecognizedRevenue = budgetAmount;
  }

  const totalProjectCost = totalLaborCost;
  const grossProfit = totalRecognizedRevenue - totalProjectCost;
  const grossMarginPct = totalRecognizedRevenue > 0 ? Math.round((grossProfit / totalRecognizedRevenue) * 10000) / 100 : 0;
  const budgetConsumedPct = budgetAmount > 0 ? Math.round((totalProjectCost / budgetAmount) * 10000) / 100 : 0;

  return {
    project_id: project._id,
    project_name: project.name,
    budget_amount: budgetAmount,
    total_hours_logged: totalBillableHours + totalNonBillableHours,
    billable_hours: totalBillableHours,
    non_billable_hours: totalNonBillableHours,
    invoiced_revenue: Math.round(invoicedRevenue * 100) / 100,
    unbilled_revenue: Math.round(unbilledRevenue * 100) / 100,
    total_recognized_revenue: Math.round(totalRecognizedRevenue * 100) / 100,
    total_labor_cost: Math.round(totalLaborCost * 100) / 100,
    total_direct_expenses: 0,
    total_project_cost: Math.round(totalProjectCost * 100) / 100,
    gross_profit: Math.round(grossProfit * 100) / 100,
    gross_margin_percentage: grossMarginPct,
    budget_consumed_percentage: budgetConsumedPct,
  };
}

export class ProjectController {
  // ==========================================
  // List Projects
  // ==========================================
  public static async listProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, status, page = 1, page_size = 20, paginate = 'true' } = req.query;
      if (!entity_id) {
        res.status(400).json({ detail: 'entity_id is required' });
        return;
      }

      const filter: any = { entity_id };
      if (status && status !== 'ALL') filter.status = status;

      const total = await Project.countDocuments(filter);
      const effLimit = Number(page_size);
      const effSkip = (Number(page) - 1) * effLimit;

      const projects = await Project.find(filter)
        .populate('customer_id', 'name company_name')
        .sort({ created_at: -1 })
        .skip(effSkip)
        .limit(effLimit);

      const items = await Promise.all(
        projects.map(async (p: any) => {
          const tasksCount = await ProjectTask.countDocuments({ project_id: p._id });
          const timesheets = await Timesheet.find({ project_id: p._id });
          const totalHours = timesheets.reduce((acc, ts) => acc + Number(ts.hours || 0), 0);
          const profitability = calculateProfitability(p, timesheets);

          return {
            id: p._id,
            entity_id: p.entity_id,
            customer_id: p.customer_id?._id || p.customer_id,
            customer_name: p.customer_id?.name || null,
            name: p.name,
            code: p.code,
            description: p.description,
            billing_type: p.billing_type,
            status: p.status,
            budget_amount: Number(p.budget_amount?.toString() || 0),
            default_hourly_rate: Number(p.default_hourly_rate?.toString() || 0),
            start_date: p.start_date,
            end_date: p.end_date,
            created_at: p.created_at,
            tasks_count: tasksCount,
            total_hours_logged: totalHours,
            profitability,
          };
        })
      );

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
  // Create Project
  // ==========================================
  public static async createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, code, name, customer_id, description, billing_type, budget_amount, default_hourly_rate, start_date, end_date } = req.body;
      const userId = (req as any).user?.id || (req as any).user?._id;

      const existing = await Project.findOne({ entity_id, code });
      if (existing) {
        res.status(400).json({ detail: `Project with code '${code}' already exists in this entity` });
        return;
      }

      const project = await Project.create({
        entity_id,
        code,
        name,
        customer_id: customer_id || null,
        description,
        billing_type: billing_type || 'TIME_AND_MATERIALS',
        budget_amount: budget_amount || 0,
        default_hourly_rate: default_hourly_rate || 0,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
      });

      await AuditService.log({
        user_id: userId,
        user_email: (req as any).user?.email,
        action: 'CREATE_PROJECT',
        record_type: 'Project',
        record_id: String(project._id),
        entity_id,
        details: `Created project ${project.code} - ${project.name}`,
      });

      const profitability = calculateProfitability(project, []);

      res.status(201).json({
        id: project._id,
        entity_id: project.entity_id,
        customer_id: project.customer_id,
        customer_name: null,
        name: project.name,
        code: project.code,
        description: project.description,
        billing_type: project.billing_type,
        status: project.status,
        budget_amount: Number(project.budget_amount?.toString() || 0),
        default_hourly_rate: Number(project.default_hourly_rate?.toString() || 0),
        start_date: project.start_date,
        end_date: project.end_date,
        created_at: project.created_at,
        tasks_count: 0,
        total_hours_logged: 0,
        profitability,
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Get Project Detail
  // ==========================================
  public static async getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const project = await Project.findById(id).populate('customer_id', 'name company_name');
      if (!project) {
        res.status(404).json({ detail: 'Project not found' });
        return;
      }

      const tasksCount = await ProjectTask.countDocuments({ project_id: project._id });
      const timesheets = await Timesheet.find({ project_id: project._id });
      const totalHours = timesheets.reduce((acc, ts) => acc + Number(ts.hours || 0), 0);
      const profitability = calculateProfitability(project, timesheets);

      res.json({
        id: project._id,
        entity_id: project.entity_id,
        customer_id: (project as any).customer_id?._id || project.customer_id,
        customer_name: (project as any).customer_id?.name || null,
        name: project.name,
        code: project.code,
        description: project.description,
        billing_type: project.billing_type,
        status: project.status,
        budget_amount: Number(project.budget_amount?.toString() || 0),
        default_hourly_rate: Number(project.default_hourly_rate?.toString() || 0),
        start_date: project.start_date,
        end_date: project.end_date,
        created_at: project.created_at,
        tasks_count: tasksCount,
        total_hours_logged: totalHours,
        profitability,
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Update Project
  // ==========================================
  public static async updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const project = await Project.findByIdAndUpdate(id, req.body, { new: true });
      if (!project) {
        res.status(404).json({ detail: 'Project not found' });
        return;
      }
      res.json(project);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Delete Project
  // ==========================================
  public static async deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const project = await Project.findByIdAndDelete(id);
      if (!project) {
        res.status(404).json({ detail: 'Project not found' });
        return;
      }
      res.json({ message: 'Project deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Profitability
  // ==========================================
  public static async getProfitability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;
      const project = await Project.findById(projectId);
      if (!project) {
        res.status(404).json({ detail: 'Project not found' });
        return;
      }

      const timesheets = await Timesheet.find({ project_id: project._id });
      const profitability = calculateProfitability(project, timesheets);
      res.json(profitability);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Tasks
  // ==========================================
  public static async listTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;
      const tasks = await ProjectTask.find({ project_id: projectId });
      res.json(tasks);
    } catch (err) {
      next(err);
    }
  }

  public static async createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;
      const { name, description, estimated_hours, status, hourly_rate } = req.body;

      const task = await ProjectTask.create({
        project_id: projectId,
        name,
        description,
        estimated_hours: estimated_hours || 0,
        status: status || 'TODO',
        hourly_rate: hourly_rate || 0,
      });

      res.status(201).json(task);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Timesheets
  // ==========================================
  public static async listTimesheets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;
      const filter: any = {};
      if (projectId) filter.project_id = projectId;
      if (req.query.entity_id) filter.entity_id = req.query.entity_id;

      const timesheets = await Timesheet.find(filter)
        .populate('user_id', 'first_name last_name name email')
        .populate('task_id', 'name')
        .sort({ entry_date: -1 });

      const items = timesheets.map((ts: any) => ({
        id: ts._id,
        project_id: ts.project_id,
        task_id: ts.task_id?._id || ts.task_id,
        task_name: ts.task_id?.name || null,
        user_id: ts.user_id?._id || ts.user_id,
        user_name: ts.user_id ? `${ts.user_id.first_name || ''} ${ts.user_id.last_name || ''}`.trim() || ts.user_id.name : 'Staff',
        entry_date: ts.entry_date,
        hours: ts.hours,
        hourly_rate: Number(ts.hourly_rate?.toString() || 0),
        is_billable: ts.is_billable,
        is_billed: ts.is_billed,
        notes: ts.notes,
        created_at: ts.created_at,
      }));

      res.json(items);
    } catch (err) {
      next(err);
    }
  }

  public static async logTimesheet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.projectId || req.body.project_id;
      const userId = (req as any).user?.id || (req as any).user?._id;

      const project = await Project.findById(projectId);
      if (!project) {
        res.status(404).json({ detail: 'Project not found' });
        return;
      }

      const { task_id, hours, hourly_rate, is_billable, notes, entry_date } = req.body;

      const rate = hourly_rate !== undefined ? hourly_rate : Number(project.default_hourly_rate?.toString() || 0);

      const timesheet = await Timesheet.create({
        project_id: project._id,
        task_id: task_id || null,
        user_id: userId,
        entity_id: project.entity_id,
        entry_date: entry_date ? new Date(entry_date) : new Date(),
        hours: Number(hours),
        hourly_rate: rate,
        is_billable: is_billable !== undefined ? is_billable : true,
        is_billed: false,
        notes,
      });

      // Update actual hours on task if linked
      if (task_id) {
        await ProjectTask.findByIdAndUpdate(task_id, {
          $inc: { actual_hours: Number(hours) },
        });
      }

      res.status(201).json(timesheet);
    } catch (err) {
      next(err);
    }
  }
}
