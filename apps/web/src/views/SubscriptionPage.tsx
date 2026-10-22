import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  Building2, 
  Users, 
  FileText, 
  Layers, 
  RefreshCw, 
  AlertTriangle,
  ArrowRight,
  Check,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getSubscriptionPlans, 
  getCurrentSubscription, 
  upgradeSubscription, 
  SubscriptionPlan, 
  CompanySubscription 
} from '../services/accountingApi';

export const SubscriptionPage: React.FC = () => {
  const { activeEntity } = useAuth();
  
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSub, setCurrentSub] = useState<CompanySubscription | null>(null);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUALLY'>('ANNUALLY');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const [plansRes, subRes] = await Promise.all([
        getSubscriptionPlans(),
        getCurrentSubscription()
      ]);
      setPlans(plansRes);
      setCurrentSub(subRes);
      if (subRes?.billing_cycle) {
        setBillingCycle(subRes.billing_cycle as any);
      }
    } catch (err: any) {
      console.error('Failed to load subscriptions:', err);
      setActionError(err.message || 'Failed to fetch subscription status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async (tier: string) => {
    setIsUpgrading(tier);
    setActionError(null);
    setActionSuccess(null);
    try {
      const updated = await upgradeSubscription({
        tier,
        billing_cycle: billingCycle
      });
      setCurrentSub(updated);
      setActionSuccess(`Successfully upgraded company subscription to ${updated.plan.name} (${billingCycle})!`);
    } catch (err: any) {
      console.error('Upgrade failed:', err);
      setActionError(err.message || 'Failed to update plan');
    } finally {
      setIsUpgrading(null);
    }
  };

  const currentTier = currentSub?.plan?.tier || 'GROWTH';

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200/80 text-amber-700 shadow-sm">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                SaaS Subscription & Billing
              </h1>
              <p className="text-xs text-slate-500">
                Manage organization plans, seat allocations, entity quotas, and enterprise feature access
              </p>
            </div>
          </div>
        </div>

        {/* BILLING CYCLE TOGGLE */}
        <div className="flex items-center space-x-1.5 bg-slate-100 border border-slate-200 p-1 rounded-xl shadow-inner">
          <button
            onClick={() => setBillingCycle('MONTHLY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              billingCycle === 'MONTHLY'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle('ANNUALLY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
              billingCycle === 'ANNUALLY'
                ? 'bg-slate-900 text-white font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Annual Billing</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              billingCycle === 'ANNUALLY' ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-800'
            }`}>
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* FEEDBACK ALERTS */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-sm shadow-sm">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800 text-sm shadow-sm">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{actionError}</span>
          </div>
        </div>
      )}

      {/* CURRENT USAGE METERS BANNER */}
      {currentSub && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
            <div>
              <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
                <span className="text-xs uppercase tracking-wider font-bold text-slate-500">Current Plan</span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                  {currentSub.plan.name}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{currentSub.status}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Organization: <span className="font-semibold text-slate-900">{currentSub.company_name}</span> • Renews on <span className="font-medium text-slate-700">{currentSub.current_period_end}</span>
              </p>
            </div>

            {/* USAGE GAUGES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:w-96">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Legal Entities</span>
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {currentSub.entities_used} / {currentSub.entities_limit}
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (currentSub.entities_used / currentSub.entities_limit) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>User Seats</span>
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {currentSub.users_used} / {currentSub.users_limit}
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (currentSub.users_used / currentSub.users_limit) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLAN COMPARISON TIERS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.tier === currentTier;
          const price = billingCycle === 'ANNUALLY' 
            ? (Number(plan.annual_price) / 12).toFixed(0)
            : Number(plan.monthly_price).toFixed(0);

          return (
            <div 
              key={plan.id}
              className={`rounded-2xl p-6 flex flex-col justify-between border transition-all ${
                isCurrent 
                  ? 'bg-blue-50/20 border-blue-400 shadow-md ring-2 ring-blue-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md shadow-sm'
              }`}
            >
              <div>
                {/* Plan Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{plan.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 min-h-[32px] leading-relaxed">{plan.description}</p>
                  </div>
                  {isCurrent && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      Active
                    </span>
                  )}
                </div>

                {/* Price Display */}
                <div className="my-5 flex items-baseline">
                  <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">${price}</span>
                  <span className="text-xs text-slate-500 ml-1.5 font-semibold">/ month</span>
                </div>

                {/* Quotas list */}
                <div className="space-y-2 py-4 border-t border-b border-slate-100 text-xs">
                  <div className="flex items-center text-slate-700">
                    <Check className="w-4 h-4 text-blue-600 mr-2 shrink-0" />
                    <span>Up to <strong className="text-slate-900 font-mono">{plan.max_entities}</strong> legal {plan.max_entities > 1 ? 'entities' : 'entity'}</span>
                  </div>
                  <div className="flex items-center text-slate-700">
                    <Check className="w-4 h-4 text-blue-600 mr-2 shrink-0" />
                    <span>Up to <strong className="text-slate-900 font-mono">{plan.max_users}</strong> team members</span>
                  </div>
                  <div className="flex items-center text-slate-700">
                    <Check className="w-4 h-4 text-blue-600 mr-2 shrink-0" />
                    <span><strong className="text-slate-900 font-mono">{plan.max_invoices_per_month > 5000 ? 'Unlimited' : plan.max_invoices_per_month}</strong> invoices/month</span>
                  </div>
                </div>

                {/* Features list */}
                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-2">
                    Features Included:
                  </span>
                  {plan.features.map((feat, i) => (
                    <div key={i} className="flex items-start">
                      <Check className="w-3.5 h-3.5 text-emerald-600 mr-2 mt-0.5 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                  >
                    Current Active Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.tier)}
                    disabled={isUpgrading !== null}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {isUpgrading === plan.tier ? 'Switching Plan...' : `Upgrade to ${plan.name}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
