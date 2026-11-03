import { Request, Response, NextFunction } from 'express';
import { SubscriptionPlan, TenantSubscription } from '../models/Subscription';
import { Organization } from '../models/Organization';
import { AuditService } from '../services/audit.service';

const DEFAULT_PLANS = [
  {
    tier: 'FREE',
    name: 'Community Free',
    description: 'Essential double-entry bookkeeping for solopreneurs and micro-businesses.',
    monthly_price: 0.0,
    annual_price: 0.0,
    currency: 'USD',
    max_entities: 1,
    max_users: 2,
    max_invoices_per_month: 30,
    features: ['Double-Entry Core', 'Sales & Purchase Invoices', 'Basic Financial Reports'],
  },
  {
    tier: 'STARTER',
    name: 'Professional Starter',
    description: 'Streamlined accounting, banking feeds, and reconciliation for growing ventures.',
    monthly_price: 29.0,
    annual_price: 290.0,
    currency: 'USD',
    max_entities: 2,
    max_users: 5,
    max_invoices_per_month: 200,
    features: ['Everything in Free', 'Bank Reconciliation & CSV Parser', 'Expenses & Claims Approvals', 'Multi-Currency Rates'],
  },
  {
    tier: 'GROWTH',
    name: 'Business Growth',
    description: 'Full-stack statutory tax compliance, perpetual inventory, and project profitability.',
    monthly_price: 79.0,
    annual_price: 790.0,
    currency: 'USD',
    max_entities: 5,
    max_users: 20,
    max_invoices_per_month: 2000,
    features: ['Everything in Starter', 'GSTR-1 & GSTR-3B Tax Filing', 'Inventory Perpetual Movements', 'Projects & Timesheet Billing', 'Automated Recurring Schedules'],
  },
  {
    tier: 'ENTERPRISE',
    name: 'Enterprise Scale',
    description: 'Unlimited multi-entity consolidation, hard period locks, and custom governance.',
    monthly_price: 199.0,
    annual_price: 1990.0,
    currency: 'USD',
    max_entities: 50,
    max_users: 200,
    max_invoices_per_month: 999999,
    features: ['Everything in Growth', 'Unlimited Entities & Consolidation', 'Period-End Close Manager Hard Locks', 'SOC-2 Ready Audit Trails', 'Custom Roles RBAC Matrix'],
  },
];

async function ensureDefaultPlans(): Promise<void> {
  for (const plan of DEFAULT_PLANS) {
    const existing = await SubscriptionPlan.findOne({ tier: plan.tier });
    if (!existing) {
      await SubscriptionPlan.create(plan);
    }
  }
}

export class SubscriptionController {
  public static async getPlans(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await ensureDefaultPlans();
      const plans = await SubscriptionPlan.find({ is_active: true }).sort({ monthly_price: 1 });
      res.json(plans);
    } catch (err) {
      next(err);
    }
  }

  public static async getCurrentSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const organizationId = user?.organization_id;

      let sub = null;
      if (organizationId) {
        sub = await TenantSubscription.findOne({ organization_id: organizationId });
      }

      if (!sub) {
        // Return default growth or starter for dev
        res.json({
          plan_tier: 'GROWTH',
          billing_cycle: 'MONTHLY',
          status: 'ACTIVE',
          current_period_start: new Date(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          cancel_at_period_end: false,
        });
        return;
      }

      res.json(sub);
    } catch (err) {
      next(err);
    }
  }

  public static async upgradePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { plan_tier, billing_cycle = 'MONTHLY' } = req.body;
      const user = (req as any).user;
      const organizationId = user?.organization_id;

      if (!organizationId) {
        res.status(400).json({ detail: 'No organization attached to current user session.' });
        return;
      }

      const plan = await SubscriptionPlan.findOne({ tier: String(plan_tier).toUpperCase() });
      if (!plan) {
        res.status(404).json({ detail: `Plan '${plan_tier}' not found` });
        return;
      }

      let sub = await TenantSubscription.findOne({ organization_id: organizationId });
      if (sub) {
        sub.plan_tier = plan.tier;
        sub.billing_cycle = billing_cycle;
        sub.status = 'ACTIVE';
        await sub.save();
      } else {
        sub = await TenantSubscription.create({
          organization_id: organizationId,
          plan_tier: plan.tier,
          billing_cycle,
          status: 'ACTIVE',
        });
      }

      await AuditService.log({
        user_id: user.id || user._id,
        user_email: user.email,
        action: 'SUBSCRIPTION_UPGRADED',
        record_type: 'TenantSubscription',
        record_id: String(sub._id),
        details: `Upgraded subscription tier to ${plan.tier} (${billing_cycle})`,
      });

      res.json(sub);
    } catch (err) {
      next(err);
    }
  }
}
