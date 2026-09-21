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
            <div className="p-2.5 bg-[#390003] rounded-xl border border-[#C58B3E]/30 text-[#E6B676]">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                SaaS Subscription & Billing
              </h1>
              <p className="text-xs text-slate-400">
                Manage organization plans, seat allocations, entity quotas, and enterprise feature access
              </p>
            </div>
          </div>
        </div>

        {/* BILLING CYCLE TOGGLE */}
        <div className="flex items-center space-x-3 bg-[#1E0002] border border-[#390003] p-1 rounded-xl">
          <button
            onClick={() => setBillingCycle('MONTHLY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              billingCycle === 'MONTHLY'
                ? 'bg-[#390003] text-white shadow-sm border border-[#55080E]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle('ANNUALLY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
              billingCycle === 'ANNUALLY'
                ? 'bg-gradient-to-r from-[#C58B3E] to-[#E6B676] text-[#260002] font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Annual Billing</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#390003] text-[#EEC68B]">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* FEEDBACK ALERTS */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl flex items-center justify-between text-emerald-300 text-sm">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 bg-rose-950/60 border border-rose-500/40 rounded-xl flex items-center justify-between text-rose-300 text-sm">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
        </div>
      )}

      {/* CURRENT USAGE METERS BANNER */}
      {currentSub && (
        <div className="bg-[#1E0002] border border-[#390003] rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
            <div>
              <div className="flex items-center space-x-2.5">
                <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Current Plan</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#390003] text-[#EEC68B] border border-[#C58B3E]/40 font-mono">
                  {currentSub.plan.name}
                </span>
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{currentSub.status}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Organization: <span className="font-semibold text-white">{currentSub.company_name}</span> • Renews on {currentSub.current_period_end}
              </p>
            </div>

            {/* USAGE GAUGES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:w-96">
              <div className="bg-[#260002] p-3.5 rounded-xl border border-[#390003]">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#E6B676]" />
                    <span>Legal Entities</span>
                  </span>
                  <span className="font-mono font-bold text-white">
                    {currentSub.entities_used} / {currentSub.entities_limit}
                  </span>
                </div>
                <div className="w-full bg-[#1E0002] h-2 rounded-full overflow-hidden border border-[#55080E]">
                  <div 
                    className="bg-gradient-to-r from-[#C58B3E] to-[#E6B676] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (currentSub.entities_used / currentSub.entities_limit) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="bg-[#260002] p-3.5 rounded-xl border border-[#390003]">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>User Seats</span>
                  </span>
                  <span className="font-mono font-bold text-white">
                    {currentSub.users_used} / {currentSub.users_limit}
                  </span>
                </div>
                <div className="w-full bg-[#1E0002] h-2 rounded-full overflow-hidden border border-[#55080E]">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
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
                  ? 'bg-[#260002] border-[#E6B676] shadow-xl ring-1 ring-[#E6B676]/50'
                  : 'bg-[#1E0002] border-[#390003] hover:border-[#55080E]'
              }`}
            >
              <div>
                {/* Plan Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-white text-base">{plan.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{plan.description}</p>
                  </div>
                  {isCurrent && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 shrink-0">
                      Active
                    </span>
                  )}
                </div>

                {/* Price Display */}
                <div className="my-5 flex items-baseline">
                  <span className="text-3xl font-extrabold text-white font-mono">${price}</span>
                  <span className="text-xs text-slate-400 ml-1.5 font-semibold">/ month</span>
                </div>

                {/* Quotas list */}
                <div className="space-y-2 py-4 border-t border-b border-[#390003]/80 text-xs">
                  <div className="flex items-center text-slate-300">
                    <Check className="w-4 h-4 text-[#E6B676] mr-2 shrink-0" />
                    <span>Up to <strong className="text-white font-mono">{plan.max_entities}</strong> legal {plan.max_entities > 1 ? 'entities' : 'entity'}</span>
                  </div>
                  <div className="flex items-center text-slate-300">
                    <Check className="w-4 h-4 text-[#E6B676] mr-2 shrink-0" />
                    <span>Up to <strong className="text-white font-mono">{plan.max_users}</strong> team members</span>
                  </div>
                  <div className="flex items-center text-slate-300">
                    <Check className="w-4 h-4 text-[#E6B676] mr-2 shrink-0" />
                    <span><strong className="text-white font-mono">{plan.max_invoices_per_month > 5000 ? 'Unlimited' : plan.max_invoices_per_month}</strong> invoices/month</span>
                  </div>
                </div>

                {/* Features list */}
                <div className="mt-4 space-y-2 text-xs text-slate-300">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-2">
                    Features Included:
                  </span>
                  {plan.features.map((feat, i) => (
                    <div key={i} className="flex items-start">
                      <Check className="w-3.5 h-3.5 text-emerald-400 mr-2 mt-0.5 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-4 border-t border-[#390003]">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#390003] text-slate-400 border border-[#55080E] cursor-not-allowed"
                  >
                    Current Active Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.tier)}
                    disabled={isUpgrading !== null}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#C58B3E] to-[#E6B676] text-[#260002] hover:opacity-90 transition-opacity cursor-pointer shadow-md disabled:opacity-50"
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
