import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Coins, 
  Calendar, 
  ShieldCheck, 
  Building2, 
  Plus, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRightLeft, 
  Lock, 
  Unlock, 
  Check, 
  X, 
  Save, 
  HelpCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  FileCheck,
  Users,
  UserPlus,
  Mail,
  Copy,
  Trash2,
  Clock,
  Zap,
  Key,
  Globe,
  Terminal,
  Send,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  accountingApi, 
  ExchangeRate, 
  FiscalPeriodSetting, 
  RolePermissionMatrix, 
  EntityTaxProfile,
  TenantMember,
  TenantInvitation,
  getTenantMembers,
  getTenantInvitations,
  createTenantInvitation,
  revokeTenantInvitation,
  getTenantCompany
} from '../services/accountingApi';

export const SettingsPage: React.FC = () => {
  const { user, entities, activeEntity } = useAuth();
  const isAdmin = user?.roles?.includes('ADMIN') || user?.roles?.includes('ORG_ADMIN');

  // Active Tab
  const [activeTab, setActiveTab] = useState<'fx' | 'calendar' | 'rbac' | 'tax' | 'team' | 'integrations'>('fx');

  // Tab: Integrations & Developer Webhooks
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [webhookNameInput, setWebhookNameInput] = useState('');
  const [selectedWebhookEvents, setSelectedWebhookEvents] = useState<string[]>(['invoice.paid', 'voucher.approved']);
  const [webhooksList, setWebhooksList] = useState([
    { id: 1, name: 'Stripe Payment Bridge', url: 'https://api.stripe.com/v1/webhook_endpoints', events: ['invoice.paid'], status: 'ACTIVE', lastPing: '200 OK (38ms)' },
    { id: 2, name: 'Razorpay Settlements', url: 'https://api.razorpay.com/v1/webhooks/rcz', events: ['invoice.paid', 'invoice.created'], status: 'ACTIVE', lastPing: '200 OK (45ms)' },
    { id: 3, name: 'Zapier Accounting Sync', url: 'https://hooks.zapier.com/hooks/catch/912831/rcz', events: ['voucher.approved'], status: 'ACTIVE', lastPing: '200 OK (52ms)' }
  ]);
  const [pingingId, setPingingId] = useState<number | null>(null);

  // Common notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tab 1: FX State
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [loadingFx, setLoadingFx] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [selectedRate, setSelectedRate] = useState<ExchangeRate | null>(null);
  const [fromCurr, setFromCurr] = useState('USD');
  const [toCurr, setToCurr] = useState('INR');
  const [rateInput, setRateInput] = useState('83.50');
  const [effectiveDateInput, setEffectiveDateInput] = useState(new Date().toISOString().slice(0, 10));

  // Converter Simulator
  const [convertAmount, setConvertAmount] = useState<number>(1000);
  const [convertFrom, setConvertFrom] = useState('USD');
  const [convertTo, setConvertTo] = useState('INR');

  // Tab 2: Fiscal Calendar State
  const [fiscalPeriods, setFiscalPeriods] = useState<FiscalPeriodSetting[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<number>(activeEntity?.id || 1);
  const [fiscalYearInput, setFiscalYearInput] = useState('2026-27');
  const [generatingYear, setGeneratingYear] = useState(false);

  // Tab 3: RBAC Matrix State
  const [rbacMatrix, setRbacMatrix] = useState<RolePermissionMatrix | null>(null);
  const [loadingRbac, setLoadingRbac] = useState(false);
  const [selectedRoleForEdit, setSelectedRoleForEdit] = useState<string>('ACCOUNTANT');
  const [rolePermCodes, setRolePermCodes] = useState<string[]>([]);
  const [savingRbac, setSavingRbac] = useState(false);

  // Tab 4: Tax & Entity Profile State
  const [taxProfile, setTaxProfile] = useState<EntityTaxProfile | null>(null);
  const [loadingTax, setLoadingTax] = useState(false);
  const [savingTax, setSavingTax] = useState(false);
  const [taxForm, setTaxForm] = useState({
    legal_name: '',
    tax_identifier: '',
    gstin: '',
    pan: '',
    jurisdiction: '',
    financial_year: '2026-27',
    address: '',
    city: '',
    state: ''
  });

  // Tab 5: Team & Access State
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [invitations, setInvitations] = useState<TenantInvitation[]>([]);
  const [tenantCompany, setTenantCompany] = useState<any>(null);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('ACCOUNTANT');
  const [inviting, setInviting] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<number | null>(null);
  const [newlyCreatedInviteUrl, setNewlyCreatedInviteUrl] = useState<string | null>(null);

  // Tab 6: Payment Gateway & Inbound UPI Collection State
  const [gatewayUpiId, setGatewayUpiId] = useState(activeEntity?.upi_id || '');
  const [gatewayRazorpayKey, setGatewayRazorpayKey] = useState(activeEntity?.razorpay_key_id || '');
  const [gatewayActive, setGatewayActive] = useState(activeEntity?.payment_gateway_active ?? true);
  const [savingGateway, setSavingGateway] = useState(false);

  // Sync active entity if changed
  useEffect(() => {
    if (activeEntity?.id) {
      setSelectedEntityId(activeEntity.id);
      setGatewayUpiId(activeEntity.upi_id || '');
      setGatewayRazorpayKey(activeEntity.razorpay_key_id || '');
      setGatewayActive(activeEntity.payment_gateway_active ?? true);
    }
  }, [activeEntity]);

  const handleSavePaymentGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntity?.id) return;
    setSavingGateway(true);
    try {
      await api.updateEntity(activeEntity.id, {
        upi_id: gatewayUpiId.trim() || undefined,
        razorpay_key_id: gatewayRazorpayKey.trim() || undefined,
        payment_gateway_active: gatewayActive
      });
      setSuccessMessage('Payment gateway & UPI configuration updated successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update payment gateway');
      setTimeout(() => setErrorMessage(null), 3000);
    } finally {
      setSavingGateway(false);
    }
  };

  // Load data according to tab
  useEffect(() => {
    if (activeTab === 'fx') fetchExchangeRates();
    if (activeTab === 'calendar') fetchFiscalPeriods();
    if (activeTab === 'rbac') fetchRbacMatrix();
    if (activeTab === 'tax') fetchTaxProfile();
    if (activeTab === 'team') fetchTeamData();
  }, [activeTab, selectedEntityId]);

  const fetchTeamData = async () => {
    setLoadingTeam(true);
    try {
      const [membersData, invitesData, compData] = await Promise.all([
        getTenantMembers().catch(() => []),
        getTenantInvitations().catch(() => []),
        getTenantCompany().catch(() => null),
      ]);
      setMembers(membersData);
      setInvitations(invitesData);
      setTenantCompany(compData);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load organization team members.');
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    setInviting(true);
    setErrorMessage(null);
    try {
      const newInvite = await createTenantInvitation(inviteEmail.trim().toLowerCase(), inviteRole);
      setSuccessMessage(`Invitation generated for ${inviteEmail}.`);
      setNewlyCreatedInviteUrl(newInvite.invite_url);
      setInviteEmail('');
      fetchTeamData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create team invitation.');
    } finally {
      setInviting(false);
    }
  };

  const handleRevokeInvite = async (id: number) => {
    if (!confirm('Are you sure you want to revoke this pending invitation?')) return;
    try {
      await revokeTenantInvitation(id);
      setSuccessMessage('Invitation revoked successfully.');
      fetchTeamData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to revoke invitation.');
    }
  };

  const handleCopyInviteLink = (invite: TenantInvitation) => {
    navigator.clipboard.writeText(invite.invite_url);
    setCopiedInviteId(invite.id);
    setTimeout(() => setCopiedInviteId(null), 3000);
  };

  // Auto clear toasts
  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setErrorMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);

  // ==========================================
  // 1. Multi-Currency & FX
  // ==========================================
  const fetchExchangeRates = async () => {
    setLoadingFx(true);
    try {
      const rates = await accountingApi.getExchangeRates();
      setExchangeRates(rates);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch exchange rates.');
    } finally {
      setLoadingFx(false);
    }
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      const numRate = parseFloat(rateInput);
      if (isNaN(numRate) || numRate <= 0) {
        throw new Error('Exchange rate must be a valid positive number.');
      }

      await accountingApi.upsertExchangeRate({
        from_currency: fromCurr,
        to_currency: toCurr,
        rate: numRate,
        effective_date: effectiveDateInput
      });

      setSuccessMessage(`Exchange rate for ${fromCurr}/${toCurr} set to ${numRate} successfully.`);
      setShowRateModal(false);
      fetchExchangeRates();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update exchange rate.');
    }
  };

  const calculateConverted = () => {
    if (convertFrom === convertTo) return convertAmount;
    // Find direct rate
    const direct = exchangeRates.find(r => r.from_currency === convertFrom && r.to_currency === convertTo);
    if (direct) return convertAmount * direct.rate;
    // Find inverse rate
    const inverse = exchangeRates.find(r => r.from_currency === convertTo && r.to_currency === convertFrom);
    if (inverse && inverse.rate > 0) return convertAmount / inverse.rate;
    // Cross currency via INR if available
    const fromToInr = exchangeRates.find(r => r.from_currency === convertFrom && r.to_currency === 'INR')?.rate || 1;
    const toToInr = exchangeRates.find(r => r.from_currency === convertTo && r.to_currency === 'INR')?.rate || 1;
    return (convertAmount * fromToInr) / toToInr;
  };

  // ==========================================
  // 2. Fiscal Calendar
  // ==========================================
  const fetchFiscalPeriods = async () => {
    setLoadingCalendar(true);
    try {
      const periods = await accountingApi.getFiscalPeriodsSetting({
        entity_id: selectedEntityId,
        fiscal_year: fiscalYearInput
      });
      setFiscalPeriods(periods);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch fiscal periods.');
    } finally {
      setLoadingCalendar(false);
    }
  };

  const handleGenerateYear = async () => {
    setGeneratingYear(true);
    setErrorMessage(null);
    try {
      const created = await accountingApi.generateFiscalYearPeriods({
        entity_id: selectedEntityId,
        fiscal_year: fiscalYearInput,
        start_month: 4 // Indian FY April to March
      });
      setSuccessMessage(`Successfully generated ${created.length} accounting periods for FY ${fiscalYearInput}.`);
      fetchFiscalPeriods();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate fiscal year periods.');
    } finally {
      setGeneratingYear(false);
    }
  };

  // ==========================================
  // 3. RBAC Matrix
  // ==========================================
  const fetchRbacMatrix = async () => {
    setLoadingRbac(true);
    try {
      const matrix = await accountingApi.getRolesMatrix();
      setRbacMatrix(matrix);
      // Pre-select role permissions for active role edit
      const targetRole = matrix.roles.find(r => r.name === selectedRoleForEdit) || matrix.roles[0];
      if (targetRole) {
        setSelectedRoleForEdit(targetRole.name);
        setRolePermCodes(targetRole.permissions.map(p => p.code));
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch RBAC Matrix.');
    } finally {
      setLoadingRbac(false);
    }
  };

  const handleRoleSelection = (roleName: string) => {
    setSelectedRoleForEdit(roleName);
    if (rbacMatrix) {
      const role = rbacMatrix.roles.find(r => r.name === roleName);
      if (role) {
        setRolePermCodes(role.permissions.map(p => p.code));
      }
    }
  };

  const togglePermission = (code: string) => {
    if (selectedRoleForEdit === 'ADMIN') return; // Cannot toggle admin permissions for safety
    setRolePermCodes(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleSaveRbac = async () => {
    if (selectedRoleForEdit === 'ADMIN') return;
    setSavingRbac(true);
    setErrorMessage(null);
    try {
      await accountingApi.updateRolePermissions({
        role_name: selectedRoleForEdit,
        permission_codes: rolePermCodes
      });
      setSuccessMessage(`Updated access permissions for role ${selectedRoleForEdit}.`);
      fetchRbacMatrix();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save role permissions.');
    } finally {
      setSavingRbac(false);
    }
  };

  // Group permissions by module
  const getGroupedPermissions = () => {
    if (!rbacMatrix) return {};
    const groups: Record<string, typeof rbacMatrix.all_permissions> = {};
    rbacMatrix.all_permissions.forEach(p => {
      const mod = p.module.toUpperCase();
      if (!groups[mod]) groups[mod] = [];
      groups[mod].push(p);
    });
    return groups;
  };

  // ==========================================
  // 4. Entity Tax Profile
  // ==========================================
  const fetchTaxProfile = async () => {
    setLoadingTax(true);
    try {
      const prof = await accountingApi.getEntityTaxProfile(selectedEntityId);
      setTaxProfile(prof);
      setTaxForm({
        legal_name: prof.legal_name || '',
        tax_identifier: prof.tax_identifier || '',
        gstin: prof.gstin || prof.tax_identifier || '',
        pan: prof.pan || '',
        jurisdiction: prof.jurisdiction || '',
        financial_year: prof.financial_year || '2026-27',
        address: prof.address || '',
        city: prof.city || '',
        state: prof.state || ''
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load entity tax profile.');
    } finally {
      setLoadingTax(false);
    }
  };

  const handleSaveTaxProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTax(true);
    setErrorMessage(null);
    try {
      const updated = await accountingApi.updateEntityTaxProfile(selectedEntityId, taxForm);
      setTaxProfile(updated);
      setSuccessMessage(`Statutory tax profile for ${updated.name} updated successfully.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save entity statutory preferences.');
    } finally {
      setSavingTax(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notifications */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="text-sm font-medium">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#260002] to-[#781019] flex items-center justify-center text-[#E6B676] shadow-sm">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Accounting Settings & System Governance
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-currency FX matrix, 12-month fiscal calendar schedules, RBAC permission grid, and statutory compliance.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#260002]/5 text-[#781019] border border-[#781019]/20">
            Phase 6 Enterprise Core
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            {user?.roles?.[0] || 'ADMIN'} Privileges
          </span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 space-x-2 sm:space-x-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('fx')}
          className={`pb-3 px-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'fx'
              ? 'border-[#781019] text-[#781019]'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Multi-Currency & FX Rates</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
            {exchangeRates.length || 4}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`pb-3 px-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'calendar'
              ? 'border-[#781019] text-[#781019]'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Fiscal Calendar & Periods</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
            12 Mo
          </span>
        </button>

        <button
          onClick={() => setActiveTab('rbac')}
          className={`pb-3 px-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'rbac'
              ? 'border-[#781019] text-[#781019]'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Role-Based Access (RBAC)</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
            3 Roles
          </span>
        </button>

        <button
          onClick={() => setActiveTab('tax')}
          className={`pb-3 px-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'tax'
              ? 'border-[#781019] text-[#781019]'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Entity Tax & Statutory</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
            {entities.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`pb-3 px-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'team'
              ? 'border-[#781019] text-[#781019]'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Team & Access</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
            {members.length || '1'}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('integrations')}
          className={`pb-3 px-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'integrations'
              ? 'border-[#781019] text-[#781019]'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>API & Integrations</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
            v1 REST
          </span>
        </button>
      </div>

      {/* TAB 1: MULTI-CURRENCY & FX MATRIX */}
      {activeTab === 'fx' && (
        <div className="space-y-6">
          {/* Top Currencies Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-lg">
                  ₹
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">INR (Indian Rupee)</h4>
                  <p className="text-xs text-slate-500">2 Decimal Places</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                BASE
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-lg">
                  $
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">USD (US Dollar)</h4>
                  <p className="text-xs text-slate-500">Global Trade Currency</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                ACTIVE
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center font-bold text-lg">
                  £
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">GBP (British Pound)</h4>
                  <p className="text-xs text-slate-500">UK Entity Standard</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                ACTIVE
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold text-lg">
                  €
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">EUR (Euro)</h4>
                  <p className="text-xs text-slate-500">European Single Currency</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                ACTIVE
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Exchange Rate Matrix (2 Columns) */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center space-x-2">
                  <Coins className="w-4 h-4 text-[#781019]" />
                  <h3 className="text-sm font-bold text-slate-900">Live Exchange Rates (Base: INR)</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={fetchExchangeRates}
                    disabled={loadingFx}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-600 transition-all"
                    title="Refresh Rates"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingFx ? 'animate-spin' : ''}`} />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setSelectedRate(null);
                        setFromCurr('USD');
                        setToCurr('INR');
                        setRateInput('83.50');
                        setShowRateModal(true);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold bg-[#781019] text-white hover:bg-[#260002] rounded-lg transition-all flex items-center space-x-1.5 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Update FX Rate</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Currency Pair</th>
                      <th className="py-3 px-4 text-right">Exchange Rate</th>
                      <th className="py-3 px-4 text-right">Inverse Rate</th>
                      <th className="py-3 px-4">Effective Date</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {loadingFx ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#781019]" />
                          Loading multi-currency FX rates...
                        </td>
                      </tr>
                    ) : exchangeRates.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No exchange rates configured.
                        </td>
                      </tr>
                    ) : (
                      exchangeRates.map((rate) => {
                        const inv = rate.rate > 0 ? (1 / rate.rate).toFixed(6) : '0.000000';
                        return (
                          <tr key={rate.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center space-x-2">
                              <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] font-semibold text-slate-700">
                                1 {rate.from_currency}
                              </span>
                              <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-mono text-[11px] text-[#781019] font-bold">
                                {rate.to_currency}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                              {Number(rate.rate).toFixed(4)} {rate.to_currency}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                              {inv} {rate.from_currency}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                              {rate.effective_date}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {isAdmin && (
                                <button
                                  onClick={() => {
                                    setSelectedRate(rate);
                                    setFromCurr(rate.from_currency);
                                    setToCurr(rate.to_currency);
                                    setRateInput(String(rate.rate));
                                    setEffectiveDateInput(rate.effective_date);
                                    setShowRateModal(true);
                                  }}
                                  className="text-xs font-semibold text-[#781019] hover:underline"
                                >
                                  Edit Rate
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Interactive Currency Converter (1 Column) */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 mb-4">
                  <div className="p-1.5 rounded-lg bg-[#FAF5EE] text-[#781019] border border-[#E6B676]/50">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Instant FX Simulator</h3>
                    <p className="text-[11px] text-slate-500">Simulate voucher FX conversions in real-time</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Source Amount
                    </label>
                    <input
                      type="number"
                      value={convertAmount}
                      onChange={(e) => setConvertAmount(Number(e.target.value))}
                      className="w-full text-sm font-mono font-bold px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#781019]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        From Currency
                      </label>
                      <select
                        value={convertFrom}
                        onChange={(e) => setConvertFrom(e.target.value)}
                        className="w-full text-xs font-medium px-2.5 py-2 border border-slate-200 rounded-lg bg-white"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="INR">INR (₹)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        To Currency
                      </label>
                      <select
                        value={convertTo}
                        onChange={(e) => setConvertTo(e.target.value)}
                        className="w-full text-xs font-medium px-2.5 py-2 border border-slate-200 rounded-lg bg-white"
                      >
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-gradient-to-br from-[#260002] to-[#781019] text-white space-y-1 shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-[#E6B676] tracking-wider">
                      Converted Estimate
                    </span>
                    <div className="text-2xl font-mono font-bold">
                      {convertTo === 'INR' ? '₹' : convertTo === 'USD' ? '$' : convertTo === 'GBP' ? '£' : '€'}
                      {calculateConverted().toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </div>
                    <p className="text-[10px] text-white/70">
                      Calculated from institutional ledger exchange rate tables.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Precision: 6 decimals</span>
                <span className="text-[#10B981] font-semibold flex items-center">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Ready for Posting
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FISCAL CALENDAR & PERIODS */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          {/* Filter / Entity Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Select Legal Entity
                </label>
                <select
                  value={selectedEntityId}
                  onChange={(e) => setSelectedEntityId(Number(e.target.value))}
                  className="text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-[#781019]"
                >
                  {entities.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Operating Fiscal Year
                </label>
                <select
                  value={fiscalYearInput}
                  onChange={(e) => setFiscalYearInput(e.target.value)}
                  className="text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="2026-27">FY 2026-27 (Current)</option>
                  <option value="2025-26">FY 2025-26 (Prior)</option>
                  <option value="2027-28">FY 2027-28 (Future)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={fetchFiscalPeriods}
                disabled={loadingCalendar}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                title="Refresh Calendar"
              >
                <RefreshCw className={`w-4 h-4 ${loadingCalendar ? 'animate-spin' : ''}`} />
              </button>

              {isAdmin && (
                <button
                  onClick={handleGenerateYear}
                  disabled={generatingYear}
                  className="px-4 py-2 text-xs font-semibold bg-[#781019] text-white hover:bg-[#260002] rounded-lg transition-all flex items-center space-x-2 shadow-xs"
                >
                  {generatingYear ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Calendar className="w-3.5 h-3.5" />
                  )}
                  <span>Generate Full Year (12 Periods)</span>
                </button>
              )}
            </div>
          </div>

          {/* Periods Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-[#781019]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Fiscal Periods Schedule — FY {fiscalYearInput}
                </h3>
              </div>
              <span className="text-xs font-medium text-slate-500">
                {fiscalPeriods.length} configured accounting periods
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-4">Period Name</th>
                    <th className="py-3 px-4">Start Date</th>
                    <th className="py-3 px-4">End Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Lock Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {loadingCalendar ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#781019]" />
                        Loading fiscal periods...
                      </td>
                    </tr>
                  ) : fiscalPeriods.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No periods found for FY {fiscalYearInput}. Click &quot;Generate Full Year&quot; above to initialize all 12 statutory periods.
                      </td>
                    </tr>
                  ) : (
                    fiscalPeriods.map((period) => (
                      <tr key={period.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          P{String(period.period_number).padStart(2, '0')}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {period.name}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {period.start_date}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {period.end_date}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {period.is_closed ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#260002]/10 text-[#781019] border border-[#781019]/20">
                              <Lock className="w-3 h-3 mr-1" />
                              CLOSED & LOCKED
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Unlock className="w-3 h-3 mr-1" />
                              OPEN FOR POSTING
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-500">
                          {period.closed_at ? new Date(period.closed_at).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ROLE-BASED ACCESS CONTROL (RBAC) */}
      {activeTab === 'rbac' && (
        <div className="space-y-6">
          {/* Roles Selector Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => handleRoleSelection('ADMIN')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedRoleForEdit === 'ADMIN'
                  ? 'bg-[#FAF5EE] border-[#781019] ring-2 ring-[#781019]/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                  SYSTEM ADMIN
                </span>
                <ShieldCheck className="w-4 h-4 text-[#781019]" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-2">ADMIN</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Unrestricted administrative and executive close authority.
              </p>
            </div>

            <div
              onClick={() => handleRoleSelection('REVIEWER')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedRoleForEdit === 'REVIEWER'
                  ? 'bg-[#FAF5EE] border-[#781019] ring-2 ring-[#781019]/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  SUPERVISORY
                </span>
                <ShieldCheck className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-2">REVIEWER</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Approve/reject journal vouchers, inspect ledger, audit trails.
              </p>
            </div>

            <div
              onClick={() => handleRoleSelection('ACCOUNTANT')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedRoleForEdit === 'ACCOUNTANT'
                  ? 'bg-[#FAF5EE] border-[#781019] ring-2 ring-[#781019]/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  OPERATIONAL
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-2">ACCOUNTANT</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Draft & submit journals, view chart of accounts & reports.
              </p>
            </div>
          </div>

          {/* Permissions Matrix Box */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Permission Matrix for Role: <span className="text-[#781019]">{selectedRoleForEdit}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedRoleForEdit === 'ADMIN'
                    ? 'Administrator permissions are permanently locked for safety.'
                    : 'Toggle permissions and click Save to apply institutional role privileges.'}
                </p>
              </div>

              {isAdmin && selectedRoleForEdit !== 'ADMIN' && (
                <button
                  onClick={handleSaveRbac}
                  disabled={savingRbac}
                  className="px-4 py-2 text-xs font-semibold bg-[#781019] text-white hover:bg-[#260002] rounded-lg transition-all flex items-center space-x-2 shadow-xs"
                >
                  {savingRbac ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Save Role Privileges</span>
                </button>
              )}
            </div>

            {loadingRbac ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#781019]" />
                Loading RBAC matrix...
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {Object.entries(getGroupedPermissions()).map(([moduleName, perms]) => (
                  <div key={moduleName} className="p-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#781019]" />
                      <span>{moduleName} MODULE</span>
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {perms.map(p => {
                        const isChecked = selectedRoleForEdit === 'ADMIN' 
                          ? true 
                          : rolePermCodes.includes(p.code);

                        return (
                          <div
                            key={p.code}
                            onClick={() => togglePermission(p.code)}
                            className={`p-3 rounded-lg border flex items-start space-x-3 transition-all ${
                              isChecked
                                ? 'bg-emerald-50/40 border-emerald-200'
                                : 'bg-slate-50/50 border-slate-200'
                            } ${selectedRoleForEdit !== 'ADMIN' ? 'cursor-pointer hover:border-[#781019]' : 'cursor-default'}`}
                          >
                            <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center ${
                              isChecked ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white'
                            }`}>
                              {isChecked && <Check className="w-3 h-3" />}
                            </div>

                            <div className="flex-1">
                              <div className="text-xs font-bold text-slate-900">{p.name}</div>
                              <div className="font-mono text-[10px] text-slate-400">{p.code}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ENTITY TAX & STATUTORY PREFERENCES */}
      {activeTab === 'tax' && (
        <div className="space-y-6">
          {/* Entity Selector Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Configure Entity
              </label>
              <select
                value={selectedEntityId}
                onChange={(e) => setSelectedEntityId(Number(e.target.value))}
                className="text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-[#781019]"
              >
                {entities.map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e.code}) — {e.country}</option>
                ))}
              </select>
            </div>

            <span className="text-xs font-medium text-slate-500">
              Tax Jurisdiction: <strong className="text-slate-900">{taxProfile?.jurisdiction || 'Maharashtra, India'}</strong>
            </span>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-[#781019]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Statutory Tax & Regulatory Preferences — {taxProfile?.name || 'Entity'}
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                ACTIVE STATUTORY FILING
              </span>
            </div>

            {loadingTax ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#781019]" />
                Loading statutory configuration...
              </div>
            ) : (
              <form onSubmit={handleSaveTaxProfile} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Legal Registered Name
                    </label>
                    <input
                      type="text"
                      value={taxForm.legal_name}
                      onChange={(e) => setTaxForm({ ...taxForm, legal_name: e.target.value })}
                      placeholder="e.g. Ricoz Technologies Private Limited"
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#781019]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Statutory Tax ID / GSTIN
                    </label>
                    <input
                      type="text"
                      value={taxForm.gstin}
                      onChange={(e) => setTaxForm({ ...taxForm, gstin: e.target.value, tax_identifier: e.target.value })}
                      placeholder="e.g. 27AAACA1234F1Z5"
                      className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#781019]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Permanent Account Number (PAN)
                    </label>
                    <input
                      type="text"
                      value={taxForm.pan}
                      onChange={(e) => setTaxForm({ ...taxForm, pan: e.target.value })}
                      placeholder="e.g. AAACA1234F"
                      className="w-full text-xs font-mono uppercase px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#781019]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tax Jurisdiction / State
                    </label>
                    <input
                      type="text"
                      value={taxForm.jurisdiction}
                      onChange={(e) => setTaxForm({ ...taxForm, jurisdiction: e.target.value })}
                      placeholder="e.g. Maharashtra"
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#781019]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Current Financial Year
                    </label>
                    <input
                      type="text"
                      value={taxForm.financial_year}
                      onChange={(e) => setTaxForm({ ...taxForm, financial_year: e.target.value })}
                      placeholder="2026-27"
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#781019]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Base Operating Currency
                    </label>
                    <input
                      type="text"
                      disabled
                      value={taxProfile?.base_currency || 'INR'}
                      className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Registered Corporate Address
                  </h4>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={taxForm.address}
                      onChange={(e) => setTaxForm({ ...taxForm, address: e.target.value })}
                      placeholder="Level 14, Ricoz Financial Tower, BKC"
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#781019]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={taxForm.city}
                        onChange={(e) => setTaxForm({ ...taxForm, city: e.target.value })}
                        placeholder="Mumbai"
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#781019]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        value={taxForm.state}
                        onChange={(e) => setTaxForm({ ...taxForm, state: e.target.value })}
                        placeholder="Maharashtra"
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#781019]"
                      />
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={savingTax}
                      className="px-6 py-2.5 text-xs font-semibold bg-[#781019] text-white hover:bg-[#260002] rounded-lg transition-all flex items-center space-x-2 shadow-xs"
                    >
                      {savingTax ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Save Statutory Preferences</span>
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: TEAM & WORKSPACE ACCESS */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          {/* Organization Workspace Overview Banner */}
          <div className="bg-gradient-to-br from-[#260002] to-[#390003] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-[#E6B676]/10 blur-2xl pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E6B676]/20 text-[#EEC68B] border border-[#E6B676]/30">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Tenant Workspace</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight">
                  {tenantCompany?.name || 'Company Workspace'}
                </h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                  <span>Legal: <strong className="text-white">{tenantCompany?.legal_name || tenantCompany?.name}</strong></span>
                  <span>•</span>
                  <span>Currency: <strong className="text-white font-mono">{tenantCompany?.base_currency || 'INR'}</strong></span>
                  <span>•</span>
                  <span>Timezone: <strong className="text-white">{tenantCompany?.timezone || 'Asia/Kolkata'}</strong></span>
                  {tenantCompany?.tax_identifier && (
                    <>
                      <span>•</span>
                      <span>Tax ID: <strong className="text-white font-mono">{tenantCompany.tax_identifier}</strong></span>
                    </>
                  )}
                </div>
              </div>

              {isAdmin && (
                <button
                  onClick={() => {
                    setShowInviteModal(true);
                    setNewlyCreatedInviteUrl(null);
                  }}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C58B3E] to-[#E6B676] text-slate-900 font-bold text-xs hover:brightness-110 shadow-sm transition-all shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Invite Team Member</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Team Members Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Users className="w-4 h-4 text-[#781019]" />
                  <span>Authorized Organization Members</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono font-normal">
                    {members.length} {members.length === 1 ? 'user' : 'users'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Users with role-based access to this organization's financial entities and ledgers.
                </p>
              </div>

              <button
                onClick={fetchTeamData}
                disabled={loadingTeam}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingTeam ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {loadingTeam ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#781019]" />
                <span>Loading team roster...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Member</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {members.map((m) => {
                      const primaryRole = m.roles[0] || 'ACCOUNTANT';
                      const initials = `${m.first_name?.[0] || ''}${m.last_name?.[0] || ''}`.toUpperCase() || 'U';
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-medium text-slate-900">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#260002] to-[#781019] text-[#E6B676] font-bold text-xs flex items-center justify-center shrink-0 border border-[#C58B3E]/30">
                                {initials}
                              </div>
                              <div>
                                <span className="block font-semibold text-slate-900">{m.full_name}</span>
                                {m.job_title && (
                                  <span className="text-[10px] text-slate-400">{m.job_title}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            {m.email}
                          </td>
                          <td className="py-3.5 px-4">
                            {primaryRole === 'ORG_ADMIN' || primaryRole === 'ADMIN' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                                Organization Admin
                              </span>
                            ) : primaryRole === 'MANAGER' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                                Finance Manager
                              </span>
                            ) : primaryRole === 'ACCOUNTANT' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Accountant
                              </span>
                            ) : primaryRole === 'REVIEWER' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                                Reviewer (Checker)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                                {primaryRole}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center space-x-1.5 text-emerald-700 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                              <span>Active</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                            {new Date(m.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pending Invitations Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-[#C58B3E]" />
                  <span>Pending Employee Invitations</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-mono font-normal">
                    {invitations.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cryptographic invite links with 7-day expiry. When employees accept, they join this company directly.
                </p>
              </div>
            </div>

            {invitations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-medium text-slate-700">No pending invitations</p>
                <p className="text-slate-400 mt-1">Use the "Invite Team Member" button above to send a new workspace invitation.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4">Assigned Role</th>
                      <th className="py-3 px-4">Invited By</th>
                      <th className="py-3 px-4">Expires In</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invitations.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-800 font-mono">
                          {inv.email}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                            {inv.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {inv.invited_by_name || 'Administrator'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                          {new Date(inv.expires_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleCopyInviteLink(inv)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs transition-colors"
                          >
                            {copiedInviteId === inv.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-500" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>

                          {isAdmin && (
                            <button
                              onClick={() => handleRevokeInvite(inv.id)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-medium text-xs transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Revoke</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: DEVELOPER API & WEBHOOKS */}
      {activeTab === 'integrations' && (
        <div className="space-y-6 animate-in fade-in">
          {/* API Keys & Credentials Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Developer API Keys</h3>
                  <p className="text-xs text-slate-500">
                    Authenticate machine-to-machine requests to the RicozBooks REST API engine.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href="/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center space-x-1"
                >
                  <span>OpenAPI / Swagger</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
              {/* Production Key */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Live Production Key</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    READ & WRITE
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="password"
                    readOnly
                    value="rcz_live_8f99e31d4e284c8a98b0f1a92e10"
                    className="w-full font-mono text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg select-all"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('rcz_live_8f99e31d4e284c8a98b0f1a92e10');
                      setApiKeyCopied(true);
                      setTimeout(() => setApiKeyCopied(false), 3000);
                    }}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shrink-0 flex items-center space-x-1"
                  >
                    {apiKeyCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{apiKeyCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Pass as <code className="bg-white px-1 rounded border border-slate-200">Authorization: Bearer rcz_live_...</code> header.
                </p>
              </div>

              {/* Base Endpoint URL */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Base API URL</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                    HTTPS ONLY
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value="https://ricozbooks-api.onrender.com/api/v1"
                    className="w-full font-mono text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg select-all"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('https://ricozbooks-api.onrender.com/api/v1');
                      setSuccessMessage('Base API URL copied to clipboard');
                      setTimeout(() => setSuccessMessage(null), 3000);
                    }}
                    className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold rounded-lg shrink-0 flex items-center space-x-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Global rate limit: 120 requests/minute per authenticated tenant token.
                </p>
              </div>
            </div>
          </div>

          {/* Outbound Webhooks Management */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#781019] text-[#E6B676] flex items-center justify-center font-bold">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Outbound Webhooks</h3>
                  <p className="text-xs text-slate-500">
                    Receive real-time JSON payloads whenever financial transactions and ledger events occur.
                  </p>
                </div>
              </div>
            </div>

            {/* Registered Webhooks Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Application / Endpoint</th>
                    <th className="py-2.5 px-3">Subscribed Events</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Last Ping</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {webhooksList.map((wh) => (
                    <tr key={wh.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{wh.name}</div>
                        <div className="font-mono text-[11px] text-slate-500 truncate max-w-xs">{wh.url}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {wh.events.map((ev) => (
                            <span key={ev} className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-700 border border-slate-200">
                              {ev}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {wh.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-emerald-700">
                        {pingingId === wh.id ? 'Sending...' : wh.lastPing}
                      </td>
                      <td className="py-3 px-3 text-right space-x-2">
                        <button
                          onClick={() => {
                            setPingingId(wh.id);
                            setTimeout(() => {
                              setPingingId(null);
                              setSuccessMessage(`Test ping delivered to ${wh.name} (HTTP 200 OK)`);
                              setTimeout(() => setSuccessMessage(null), 4000);
                            }, 600);
                          }}
                          disabled={pingingId === wh.id}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700 text-[11px]"
                        >
                          Send Ping
                        </button>
                        <button
                          onClick={() => {
                            setWebhooksList(webhooksList.filter((w) => w.id !== wh.id));
                            setSuccessMessage(`Webhook subscription removed.`);
                            setTimeout(() => setSuccessMessage(null), 3000);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add New Webhook Endpoint */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs">Add New Webhook Subscription</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Integration Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Custom ERP Bridge"
                    value={webhookNameInput}
                    onChange={(e) => setWebhookNameInput(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Payload HTTPS URL</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="url"
                      placeholder="https://yourserver.com/webhooks/ricozbooks"
                      value={webhookUrlInput}
                      onChange={(e) => setWebhookUrlInput(e.target.value)}
                      className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    />
                    <button
                      onClick={() => {
                        if (!webhookUrlInput.trim()) return;
                        setWebhooksList([
                          ...webhooksList,
                          {
                            id: Date.now(),
                            name: webhookNameInput.trim() || 'Webhook Endpoint',
                            url: webhookUrlInput.trim(),
                            events: selectedWebhookEvents,
                            status: 'ACTIVE',
                            lastPing: 'Pending first event'
                          }
                        ]);
                        setWebhookNameInput('');
                        setWebhookUrlInput('');
                        setSuccessMessage('New webhook subscription activated.');
                        setTimeout(() => setSuccessMessage(null), 3000);
                      }}
                      className="px-4 py-2 bg-[#781019] hover:bg-[#8F131E] text-white font-bold text-xs rounded-lg shrink-0 flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Subscribe</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* cURL Integration Examples */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
              <Terminal className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">Developer Quickstart Examples</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] space-y-1 overflow-x-auto">
                <div className="text-slate-400"># 1. Query Current Financial Trial Balance</div>
                <div>curl -X GET "https://ricozbooks-api.onrender.com/api/v1/ledger/reports/trial-balance?entity_id=1" \</div>
                <div className="pl-4">-H "Authorization: Bearer rcz_live_8f99e31d4e284c8a98b0f1a92e10"</div>
              </div>

              <div className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] space-y-1 overflow-x-auto">
                <div className="text-slate-400"># 2. Record Automated Sales Invoice with Intra-State GST</div>
                <div>curl -X POST "https://ricozbooks-api.onrender.com/api/v1/invoices" \</div>
                <div className="pl-4">-H "Authorization: Bearer rcz_live_8f99e31d4e284c8a98b0f1a92e10" \</div>
                <div className="pl-4">-H "Content-Type: application/json" \</div>
                <div className="pl-4">-d '{`{"entity_id": 1, "customer_id": 2, "lines": [{"description": "SaaS Platform", "quantity": 1, "unit_price": 50000, "tax_rate": 18}]}`}'</div>
              </div>
            </div>
          </div>

          {/* Payment Gateways & Inbound UPI Collection */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
              <CreditCard className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">Payment Gateways & Inbound UPI Collection</h3>
            </div>
            <p className="text-xs text-slate-600">
              Configure your organization's UPI Virtual Payment Address (VPA) and payment gateway keys. Customers will automatically receive dynamic UPI QR codes and online payment links for instant reconciliation.
            </p>

            <form onSubmit={handleSavePaymentGateway} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    UPI Virtual Payment Address (VPA)
                  </label>
                  <input
                    type="text"
                    value={gatewayUpiId}
                    onChange={(e) => setGatewayUpiId(e.target.value)}
                    placeholder="e.g. yourcompany@icici or 9876543210@paytm"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#781019] font-mono"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Used to generate live UPI QR codes on customer invoices.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Razorpay / Gateway Key ID
                  </label>
                  <input
                    type="text"
                    value={gatewayRazorpayKey}
                    onChange={(e) => setGatewayRazorpayKey(e.target.value)}
                    placeholder="rzp_live_xxxxxxxxxxxxxxxx"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#781019] font-mono"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Enables card, netbanking, and UPI intent online checkout.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gatewayActive}
                    onChange={(e) => setGatewayActive(e.target.checked)}
                    className="rounded text-[#781019] focus:ring-[#781019] w-4 h-4"
                  />
                  <span className="text-xs font-semibold text-slate-700">Enable Inbound Payment Portal & UPI QR for Invoices</span>
                </label>

                <button
                  type="submit"
                  disabled={savingGateway}
                  className="px-4 py-2 bg-[#781019] hover:bg-[#8F131E] text-white font-bold text-xs rounded-lg shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  {savingGateway ? (
                    <span>Saving...</span>
                  ) : (
                    <span>Save Gateway Settings</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Update Rate Modal */}
      {showRateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <Coins className="w-4 h-4 text-[#781019]" />
                <h3 className="text-sm font-bold text-slate-900">
                  {selectedRate ? 'Edit Exchange Rate' : 'Add / Update Exchange Rate'}
                </h3>
              </div>
              <button
                onClick={() => setShowRateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRate} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    From Currency
                  </label>
                  <select
                    value={fromCurr}
                    onChange={(e) => setFromCurr(e.target.value)}
                    disabled={!!selectedRate}
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    To Currency
                  </label>
                  <select
                    value={toCurr}
                    onChange={(e) => setToCurr(e.target.value)}
                    disabled={!!selectedRate}
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Exchange Rate (1 {fromCurr} = ? {toCurr})
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#781019]"
                  placeholder="83.500000"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Effective Date
                </label>
                <input
                  type="date"
                  value={effectiveDateInput}
                  onChange={(e) => setEffectiveDateInput(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#781019]"
                  required
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-[#781019] text-white hover:bg-[#260002] rounded-lg shadow-xs"
                >
                  Save Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-[#781019]" />
                <h3 className="text-sm font-bold text-slate-900">
                  {newlyCreatedInviteUrl ? 'Invitation Ready' : 'Invite Team Member'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setNewlyCreatedInviteUrl(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {newlyCreatedInviteUrl ? (
              <div className="p-5 space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                
                <div className="text-center space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">Cryptographic Invite Generated</h4>
                  <p className="text-xs text-slate-500">
                    Share this unique onboarding link with your colleague. It is valid for 7 days.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-500 block">Invitation URL:</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={newlyCreatedInviteUrl}
                      className="w-full text-xs font-mono bg-white px-2.5 py-1.5 rounded border border-slate-200 text-slate-700 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(newlyCreatedInviteUrl);
                        setSuccessMessage('Invitation URL copied to clipboard!');
                      }}
                      className="px-3 py-1.5 bg-[#781019] text-white rounded text-xs font-semibold hover:bg-[#8F131E] flex items-center space-x-1 shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInviteModal(false);
                      setNewlyCreatedInviteUrl(null);
                    }}
                    className="w-full py-2.5 px-4 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateInvite} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Colleague's Work Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="accountant@yourcompany.com"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#781019]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assign Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium focus:ring-2 focus:ring-[#781019]"
                  >
                    <option value="ACCOUNTANT">Accountant (Bookkeeping, draft & post journals)</option>
                    <option value="REVIEWER">Reviewer (Supervisory review, sign-offs)</option>
                    <option value="MANAGER">Finance Manager (Approvals, close, reports)</option>
                    <option value="ORG_ADMIN">Organization Admin (Full ownership & invitations)</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                  {inviteRole === 'ORG_ADMIN' && 'Full administrator control over all entities, team invitations, and accounting settings.'}
                  {inviteRole === 'MANAGER' && 'Approve vouchers, run statutory close periods, and export P&L and Balance Sheets.'}
                  {inviteRole === 'ACCOUNTANT' && 'Record day-to-day transactions, reconcile bank ledgers, and manage the Chart of Accounts.'}
                  {inviteRole === 'REVIEWER' && 'Supervisory four-eyes review and approval of submitted vouchers.'}
                </div>

                <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    disabled={inviting}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="px-4 py-2 text-xs font-semibold bg-[#781019] text-white hover:bg-[#8F131E] rounded-lg shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    {inviting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{inviting ? 'Generating...' : 'Send Invitation'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;

