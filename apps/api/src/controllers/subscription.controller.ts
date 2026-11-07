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
  try {
    for (const plan of DEFAULT_PLANS) {
      const existing = await SubscriptionPlan.findOne({ tier: plan.tier });
      if (!existing) {
        await SubscriptionPlan.create(plan);
      }
    }
  } catch (err) {
    console.warn('[SUBSCRIPTION] Notice ensuring default plans:', err);
  }
}

function sanitizePlan(doc: any) {
  const obj = doc && typeof doc.toObject === 'function' ? doc.toObject() : (doc || {});
  return {
    id: String(obj._id || obj.id || obj.tier?.toLowerCase() || 'plan'),
    tier: String(obj.tier || 'GROWTH').toUpperCase(),
    name: String(obj.name || 'Growth Enterprise'),
    description: String(obj.description || ''),
    monthly_price: typeof obj.monthly_price === 'object' && obj.monthly_price?.$numberDecimal
      ? parseFloat(obj.monthly_price.$numberDecimal)
      : Number(obj.monthly_price || 0),
    annual_price: typeof obj.annual_price === 'object' && obj.annual_price?.$numberDecimal
      ? parseFloat(obj.annual_price.$numberDecimal)
      : Number(obj.annual_price || 0),
    currency: String(obj.currency || 'USD'),
    max_entities: Number(obj.max_entities || 1),
    max_users: Number(obj.max_users || 1),
    max_invoices_per_month: Number(obj.max_invoices_per_month || 30),
    features: Array.isArray(obj.features) ? obj.features : [],
    is_active: obj.is_active !== false,
  };
}

export class SubscriptionController {
  public static async getPlans(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await ensureDefaultPlans();
      const planDocs = await SubscriptionPlan.find({ is_active: true }).sort({ monthly_price: 1 });
      if (!planDocs || planDocs.length === 0) {
        res.json(DEFAULT_PLANS.map(sanitizePlan));
        return;
      }
      res.json(planDocs.map(sanitizePlan));
    } catch (err) {
      // In case of any database lookup error in local dev, provide default plans cleanly
      console.warn('[SUBSCRIPTION] Falling back to default plan catalog:', err);
      res.json(DEFAULT_PLANS.map(sanitizePlan));
    }
  }

  public static async getCurrentSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      let organizationId = user?.organization_id || user?.default_company_id || (req as any).tokenPayload?.company_id || req.query?.company_id;

      if (!organizationId) {
        try {
          const fallbackOrg = await Organization.findOne({ is_active: true });
          if (fallbackOrg) organizationId = fallbackOrg._id;
        } catch (_) {}
      }

      let orgName = 'Primary Organization';
      if (organizationId) {
        try {
          const org = await Organization.findById(organizationId);
          if (org?.name) orgName = org.name;
        } catch (_) {}
      }

      let sub = null;
      if (organizationId) {
        try {
          sub = await TenantSubscription.findOne({ organization_id: organizationId });
        } catch (_) {}
      }

      const defaultPeriodStart = new Date().toISOString().split('T')[0];
      const defaultPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      if (!sub) {
        const growthPlan = DEFAULT_PLANS.find(p => p.tier === 'GROWTH') || DEFAULT_PLANS[0];
        res.json({
          plan_tier: 'GROWTH',
          billing_cycle: 'ANNUALLY',
          status: 'ACTIVE',
          company_name: orgName,
          current_period_start: defaultPeriodStart,
          current_period_end: defaultPeriodEnd,
          cancel_at_period_end: false,
          plan: sanitizePlan(growthPlan),
          entities_used: 1,
          entities_limit: 5,
          users_used: 1,
          users_limit: 10,
        });
        return;
      }

      const targetTier = String(sub.plan_tier || 'GROWTH').toUpperCase();
      let planDoc = null;
      try {
        planDoc = await SubscriptionPlan.findOne({ tier: targetTier });
      } catch (_) {}

      const resolvedPlan = planDoc ? sanitizePlan(planDoc) : sanitizePlan(DEFAULT_PLANS.find(p => p.tier === targetTier) || DEFAULT_PLANS[2]);

      const subObj = typeof sub.toObject === 'function' ? sub.toObject() : sub;

      res.json({
        ...subObj,
        company_name: orgName,
        billing_cycle: sub.billing_cycle === 'ANNUAL' ? 'ANNUALLY' : (sub.billing_cycle || 'MONTHLY'),
        current_period_start: sub.current_period_start ? new Date(sub.current_period_start).toISOString().split('T')[0] : defaultPeriodStart,
        current_period_end: sub.current_period_end ? new Date(sub.current_period_end).toISOString().split('T')[0] : defaultPeriodEnd,
        plan: resolvedPlan,
        entities_used: 1,
        entities_limit: resolvedPlan.max_entities || 5,
        users_used: 1,
        users_limit: resolvedPlan.max_users || 10,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async upgradePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetTier = String(req.body.tier || req.body.plan_tier || 'GROWTH').toUpperCase();
      const rawCycle = String(req.body.billing_cycle || 'MONTHLY').toUpperCase();
      const billingCycle: 'MONTHLY' | 'ANNUAL' = (rawCycle === 'ANNUALLY' || rawCycle === 'ANNUAL') ? 'ANNUAL' : 'MONTHLY';

      const user = (req as any).user;
      let organizationId = user?.organization_id || user?.default_company_id || (req as any).tokenPayload?.company_id || req.body?.company_id;

      if (!organizationId) {
        try {
          const fallbackOrg = await Organization.findOne({ is_active: true });
          if (fallbackOrg) organizationId = fallbackOrg._id;
        } catch (_) {}
      }

      if (!organizationId) {
        res.status(400).json({ detail: 'No organization attached to current user session.' });
        return;
      }

      let orgName = 'Primary Organization';
      try {
        const org = await Organization.findById(organizationId);
        if (org?.name) orgName = org.name;
      } catch (_) {}

      let plan = null;
      try {
        plan = await SubscriptionPlan.findOne({ tier: targetTier });
      } catch (_) {}

      const planData = plan ? sanitizePlan(plan) : sanitizePlan(DEFAULT_PLANS.find(p => p.tier === targetTier));
      if (!planData) {
        res.status(404).json({ detail: `Plan '${targetTier}' not found` });
        return;
      }

      let sub = await TenantSubscription.findOne({ organization_id: organizationId });
      const now = new Date();
      const periodEnd = new Date(now.getTime() + (billingCycle === 'ANNUAL' ? 365 : 30) * 24 * 60 * 60 * 1000);

      if (sub) {
        sub.plan_tier = planData.tier;
        sub.billing_cycle = billingCycle;
        sub.status = 'ACTIVE';
        sub.current_period_start = now;
        sub.current_period_end = periodEnd;
        await sub.save();
      } else {
        sub = await TenantSubscription.create({
          organization_id: organizationId,
          plan_tier: planData.tier,
          billing_cycle: billingCycle,
          status: 'ACTIVE',
          current_period_start: now,
          current_period_end: periodEnd,
        });
      }

      try {
        await AuditService.log({
          user_id: user?.id || user?._id || 'unknown',
          user_email: user?.email || 'admin@ricozbooks.com',
          action: 'SUBSCRIPTION_UPGRADED',
          record_type: 'TenantSubscription',
          record_id: String(sub._id),
          details: `Upgraded subscription tier to ${planData.tier} (${billingCycle})`,
        });
      } catch (_) {}

      const subObj = typeof sub.toObject === 'function' ? sub.toObject() : sub;

      res.json({
        ...subObj,
        company_name: orgName,
        billing_cycle: billingCycle === 'ANNUAL' ? 'ANNUALLY' : 'MONTHLY',
        current_period_start: now.toISOString().split('T')[0],
        current_period_end: periodEnd.toISOString().split('T')[0],
        plan: planData,
        entities_used: 1,
        entities_limit: planData.max_entities || 5,
        users_used: 1,
        users_limit: planData.max_users || 10,
      });
    } catch (err) {
      next(err);
    }
  }
}
