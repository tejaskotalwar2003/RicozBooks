import React, { useState, useEffect } from 'react';
import { 
  FileCheck, 
  Landmark, 
  Receipt, 
  Download, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Building2, 
  CreditCard, 
  RefreshCw, 
  X, 
  Layers, 
  HelpCircle,
  FileSpreadsheet,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getGstMetrics, 
  getGstr1, 
  getGstr3b, 
  settleGstReturn, 
  getBankAccounts,
  GSTDashboardMetrics, 
  GSTR1Summary, 
  GSTR3BSummary, 
  BankAccount 
} from '../services/accountingApi';

export const GstCenterPage: React.FC = () => {
  const { activeEntity } = useAuth();

  // Current return period default: September 2026 (092026)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('092026');
  const [metrics, setMetrics] = useState<GSTDashboardMetrics | null>(null);
  const [gstr1Data, setGstr1Data] = useState<GSTR1Summary | null>(null);
  const [gstr3bData, setGstr3bData] = useState<GSTR3BSummary | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'gstr1' | 'gstr3b'>('gstr3b');

  // Settlement modal state
  const [isSettleModalOpen, setIsSettleModalOpen] = useState<boolean>(false);
  const [settleBankId, setSettleBankId] = useState<number | ''>('');
  const [settleReference, setSettleReference] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Available filing periods
  const periodOptions = [
    { value: '092026', label: 'September 2026 (Current)' },
    { value: '082026', label: 'August 2026' },
    { value: '072026', label: 'July 2026' },
    { value: '062026', label: 'June 2026' },
  ];

  useEffect(() => {
    if (activeEntity?.id) {
      loadGstData();
    }
  }, [activeEntity?.id, selectedPeriod]);

  const loadGstData = async () => {
    if (!activeEntity?.id) return;
    setIsLoading(true);
    setActionError(null);
    try {
      const [metRes, g1Res, g3bRes, banksRes] = await Promise.all([
        getGstMetrics(activeEntity.id, selectedPeriod),
        getGstr1(activeEntity.id, selectedPeriod),
        getGstr3b(activeEntity.id, selectedPeriod),
        getBankAccounts(activeEntity.id)
      ]);
      setMetrics(metRes);
      setGstr1Data(g1Res);
      setGstr3bData(g3bRes);
      setBankAccounts(banksRes);
      if (banksRes.length > 0 && !settleBankId) {
        setSettleBankId(banksRes[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load GST return data:', err);
      setActionError(err.message || 'Failed to fetch GST figures.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenSettleModal = () => {
    setSettleReference(`GST-CHALLAN-${selectedPeriod}`);
    setActionSuccess(null);
    setActionError(null);
    setIsSettleModalOpen(true);
  };

  const handleExecuteSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntity?.id) return;

    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const result = await settleGstReturn({
        entity_id: activeEntity.id,
        return_period: selectedPeriod,
        payment_bank_account_id: settleBankId ? Number(settleBankId) : undefined,
        reference_number: settleReference
      });

      setActionSuccess(`GST Return successfully filed! ARN: ${result.arn_number}. Journal Entry #${result.settlement_journal_id} posted.`);
      setIsSettleModalOpen(false);
      await loadGstData();
    } catch (err: any) {
      console.error('GST filing failed:', err);
      setActionError(err.message || 'Failed to execute GST settlement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadGstr1Json = () => {
    if (!gstr1Data) return;
    const jsonStr = JSON.stringify(gstr1Data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSTR1_${activeEntity?.tax_identifier || 'ENTITY'}_${selectedPeriod}.json`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const currency = activeEntity?.base_currency || 'INR';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#390003] rounded-xl border border-[#C58B3E]/30 text-[#E6B676]">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  GST & Statutory Tax Center
                </h1>
                {activeEntity?.tax_identifier && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#390003] text-[#EEC68B] border border-[#C58B3E]/30">
                    GSTIN: {activeEntity.tax_identifier}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Automated GSTR-1 outward tax liability, GSTR-3B Input Tax Credit (ITC) offset, and 1-click ledger settlement
              </p>
            </div>
          </div>
        </div>

        {/* PERIOD SELECTOR & ACTIONS */}
        <div className="flex items-center gap-3">
          <div className="flex items-center space-x-2 bg-[#1E0002] border border-[#390003] px-3 py-1.5 rounded-lg">
            <Calendar className="w-4 h-4 text-[#E6B676]" />
            <span className="text-xs text-slate-400 font-semibold">Period:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              {periodOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#1E0002] text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => loadGstData()}
            className="p-2 text-slate-400 hover:text-white hover:bg-[#390003] rounded-lg border border-[#55080E] transition-colors"
            title="Refresh Return"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={downloadGstr1Json}
            className="flex items-center space-x-1.5 bg-[#260002] hover:bg-[#390003] text-slate-200 border border-[#55080E] px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
            title="Export official JSON for GST portal upload"
          >
            <Download className="w-3.5 h-3.5 text-[#E6B676]" />
            <span>Export GSTR-1 JSON</span>
          </button>

          {gstr3bData?.status !== 'FILED' ? (
            <button
              onClick={handleOpenSettleModal}
              className="flex items-center space-x-2 bg-gradient-to-r from-[#C58B3E] to-[#E6B676] hover:from-[#b57d33] hover:to-[#d8a867] text-[#260002] font-semibold px-4 py-2 rounded-lg text-sm transition-all shadow-md cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>File & Settle GSTR-3B</span>
            </button>
          ) : (
            <div className="flex items-center space-x-1.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-3 py-2 rounded-lg text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Filed (ARN: {gstr3bData.arn_number?.substring(0, 10)}...)</span>
            </div>
          )}
        </div>
      </div>

      {/* NOTIFICATION ALERTS */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl flex items-center justify-between text-emerald-300 text-sm">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 bg-rose-950/60 border border-rose-500/40 rounded-xl flex items-center justify-between text-rose-300 text-sm">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STATUTORY SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Output Tax Liability */}
        <div className="bg-[#1E0002] border border-[#390003] rounded-xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Output Tax Due</span>
            <div className="p-2 bg-[#390003] rounded-lg text-rose-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">
              {currency} {Number(metrics?.total_output_tax_due || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-rose-400 mt-1 flex items-center gap-1.5">
              <span>Sales & Outward Supplies</span>
            </div>
          </div>
        </div>

        {/* Input Tax Credit (ITC) */}
        <div className="bg-[#1E0002] border border-[#390003] rounded-xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Eligible ITC</span>
            <div className="p-2 bg-[#390003] rounded-lg text-emerald-400">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-300 tracking-tight">
              {currency} {Number(metrics?.total_input_tax_credit_available || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <span>Vendor Purchases & Bills</span>
            </div>
          </div>
        </div>

        {/* Net Cash Payable */}
        <div className="bg-[#1E0002] border border-[#390003] rounded-xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Cash Payable</span>
            <div className="p-2 bg-[#390003] rounded-lg text-[#E6B676]">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#E6B676] tracking-tight">
              {currency} {Number(metrics?.net_tax_payable || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              After automatic ITC credit utilization
            </div>
          </div>
        </div>

        {/* Statutory Filing Status */}
        <div className="bg-[#1E0002] border border-[#390003] rounded-xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Return Status</span>
            <div className="p-2 bg-[#390003] rounded-lg text-sky-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                gstr3bData?.status === 'FILED' 
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50' 
                  : 'bg-amber-950/80 text-amber-300 border border-amber-700/50'
              }`}>
                {gstr3bData?.status || 'READY_FOR_FILING'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 truncate">
              {gstr3bData?.arn_number ? `ARN: ${gstr3bData.arn_number}` : 'Awaiting confirmation'}
            </div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-[#390003]">
        <button
          onClick={() => setActiveTab('gstr3b')}
          className={`flex items-center space-x-2 py-3 px-5 font-semibold text-sm border-b-2 transition-colors cursor-pointer ${
            activeTab === 'gstr3b'
              ? 'border-[#E6B676] text-[#E6B676] bg-[#390003]/30'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>GSTR-3B Monthly Return & Offset Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('gstr1')}
          className={`flex items-center space-x-2 py-3 px-5 font-semibold text-sm border-b-2 transition-colors cursor-pointer ${
            activeTab === 'gstr1'
              ? 'border-[#E6B676] text-[#E6B676] bg-[#390003]/30'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>GSTR-1 Outward Supplies (B2B & HSN)</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-[#390003] text-slate-300 border border-[#55080E]">
            {gstr1Data?.total_invoices_count || 0} Invoices
          </span>
        </button>
      </div>

      {/* TAB 1: GSTR-3B CONSOLIDATED RETURN & OFFSET */}
      {activeTab === 'gstr3b' && gstr3bData && (
        <div className="space-y-6">
          {/* TABLE 3.1 & TABLE 4 SUMMARY GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Table 3.1 Outward Supplies */}
            <div className="bg-[#1E0002] border border-[#390003] rounded-xl p-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                <Receipt className="w-4 h-4 text-[#E6B676]" />
                <span>Table 3.1 Outward Taxable Supplies</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[#390003]/60 text-slate-300">
                  <span>Total Taxable Value:</span>
                  <span className="font-mono font-bold text-white">
                    {currency} {Number(gstr3bData.outward_supplies.taxable_value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#390003]/60 text-slate-300">
                  <span>Integrated Tax (IGST):</span>
                  <span className="font-mono text-white">
                    {currency} {Number(gstr3bData.outward_supplies.igst).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#390003]/60 text-slate-300">
                  <span>Central Tax (CGST):</span>
                  <span className="font-mono text-white">
                    {currency} {Number(gstr3bData.outward_supplies.cgst).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#390003]/60 text-slate-300">
                  <span>State Tax (SGST):</span>
                  <span className="font-mono text-white">
                    {currency} {Number(gstr3bData.outward_supplies.sgst).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 font-bold text-[#E6B676]">
                  <span>Total Output Liability:</span>
                  <span className="font-mono">
                    {currency} {Number(gstr3bData.tax_settlement.total_output_liability).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Table 4 Eligible ITC */}
            <div className="bg-[#1E0002] border border-[#390003] rounded-xl p-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>Table 4 Eligible Input Tax Credit (ITC)</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[#390003]/60 text-slate-300">
                  <span>ITC Integrated Tax (IGST):</span>
                  <span className="font-mono text-emerald-400">
                    {currency} {Number(gstr3bData.eligible_itc.itc_igst).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#390003]/60 text-slate-300">
                  <span>ITC Central Tax (CGST):</span>
                  <span className="font-mono text-emerald-400">
                    {currency} {Number(gstr3bData.eligible_itc.itc_cgst).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#390003]/60 text-slate-300">
                  <span>ITC State Tax (SGST):</span>
                  <span className="font-mono text-emerald-400">
                    {currency} {Number(gstr3bData.eligible_itc.itc_sgst).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#390003]/60 text-slate-300">
                  <span>Other Inward Supplies / RCM:</span>
                  <span className="font-mono text-slate-400">0.00</span>
                </div>
                <div className="flex justify-between pt-2 font-bold text-emerald-300">
                  <span>Total ITC Available:</span>
                  <span className="font-mono">
                    {currency} {Number(gstr3bData.eligible_itc.total_itc_available).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* TABLE 6: STATUTORY OFFSET & PAYMENT MATRIX */}
          <div className="bg-[#1E0002] border border-[#390003] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#390003] bg-[#260002]/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Table 6.1 Payment of Tax (Offset of Output Liability against ITC)</h3>
                <p className="text-xs text-slate-400">Statutory waterfall: IGST ITC offsets IGST then CGST/SGST; CGST ITC offsets CGST; SGST ITC offsets SGST</p>
              </div>
              {gstr3bData.status === 'FILED' && (
                <div className="text-xs text-emerald-400 font-mono font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Settlement Posted ({gstr3bData.filing_date})</span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#390003] bg-[#260002]/80 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Tax Description</th>
                    <th className="py-3.5 px-4 text-right">Total Liability</th>
                    <th className="py-3.5 px-4 text-right">Paid Through ITC</th>
                    <th className="py-3.5 px-4 text-right">Tax Paid in Cash</th>
                    <th className="py-3.5 px-4 text-center">Settlement Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#390003]/60 font-mono">
                  <tr className="hover:bg-[#260002]/60">
                    <td className="py-3.5 px-4 font-sans font-semibold text-white">Integrated Tax (IGST)</td>
                    <td className="py-3.5 px-4 text-right text-slate-200">
                      {currency} {Number(gstr3bData.tax_settlement.output_igst).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-400">
                      {currency} {Number(gstr3bData.tax_settlement.itc_offset_igst).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#E6B676]">
                      {currency} {Number(gstr3bData.tax_settlement.cash_payable_igst).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-sans">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {Number(gstr3bData.tax_settlement.cash_payable_igst) === 0 ? 'Full ITC Offset' : 'Cash Remitted'}
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-[#260002]/60">
                    <td className="py-3.5 px-4 font-sans font-semibold text-white">Central Tax (CGST)</td>
                    <td className="py-3.5 px-4 text-right text-slate-200">
                      {currency} {Number(gstr3bData.tax_settlement.output_cgst).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-400">
                      {currency} {Number(gstr3bData.tax_settlement.itc_offset_cgst).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#E6B676]">
                      {currency} {Number(gstr3bData.tax_settlement.cash_payable_cgst).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-sans">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {Number(gstr3bData.tax_settlement.cash_payable_cgst) === 0 ? 'Full ITC Offset' : 'Cash Remitted'}
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-[#260002]/60">
                    <td className="py-3.5 px-4 font-sans font-semibold text-white">State / UT Tax (SGST)</td>
                    <td className="py-3.5 px-4 text-right text-slate-200">
                      {currency} {Number(gstr3bData.tax_settlement.output_sgst).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-400">
                      {currency} {Number(gstr3bData.tax_settlement.itc_offset_sgst).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#E6B676]">
                      {currency} {Number(gstr3bData.tax_settlement.cash_payable_sgst).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-sans">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {Number(gstr3bData.tax_settlement.cash_payable_sgst) === 0 ? 'Full ITC Offset' : 'Cash Remitted'}
                      </span>
                    </td>
                  </tr>

                  <tr className="bg-[#260002] font-bold">
                    <td className="py-3.5 px-4 font-sans text-[#E6B676]">Total Statutory Settlement</td>
                    <td className="py-3.5 px-4 text-right text-white">
                      {currency} {Number(gstr3bData.tax_settlement.total_output_liability).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-400">
                      {currency} {Number(gstr3bData.tax_settlement.total_itc_utilized).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#E6B676] text-sm">
                      {currency} {Number(gstr3bData.tax_settlement.total_cash_payable).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-sans">
                      {gstr3bData.status === 'FILED' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                          Filed & Settled
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-800">
                          Pending Filing
                        </span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GSTR-1 OUTWARD SUPPLIES & HSN SUMMARY */}
      {activeTab === 'gstr1' && gstr1Data && (
        <div className="space-y-6">
          {/* Table 4 B2B Invoices */}
          <div className="bg-[#1E0002] border border-[#390003] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#390003] bg-[#260002]/50 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white">Table 4: Taxable Outward B2B Supplies</h3>
                <p className="text-xs text-slate-400">All registered customer invoices issued within period {selectedPeriod}</p>
              </div>
              <div className="text-xs text-[#E6B676] font-mono font-semibold">
                Total Invoices: {gstr1Data.b2b_invoices.length}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#390003] bg-[#260002]/80 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Invoice #</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Customer GSTIN</th>
                    <th className="py-3.5 px-4">Place of Supply</th>
                    <th className="py-3.5 px-4 text-right">Taxable Val</th>
                    <th className="py-3.5 px-4 text-right">Rate</th>
                    <th className="py-3.5 px-4 text-right">IGST</th>
                    <th className="py-3.5 px-4 text-right">CGST</th>
                    <th className="py-3.5 px-4 text-right">SGST</th>
                    <th className="py-3.5 px-4 text-right">Total Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#390003]/60">
                  {gstr1Data.b2b_invoices.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-500">
                        <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                        <span>No B2B invoices generated in period {selectedPeriod}.</span>
                      </td>
                    </tr>
                  ) : (
                    gstr1Data.b2b_invoices.map((inv, idx) => (
                      <tr key={idx} className="hover:bg-[#260002]/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          {inv.invoice_number}
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-mono">
                          {inv.invoice_date}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-200">
                          {inv.customer_name}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#EEC68B]">
                          {inv.customer_gstin || 'URP (Unregistered)'}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {inv.place_of_supply}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-white">
                          {currency} {Number(inv.taxable_value).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">
                          {Number(inv.tax_rate)}%
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                          {Number(inv.igst_amount) > 0 ? `${currency} ${Number(inv.igst_amount).toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                          {Number(inv.cgst_amount) > 0 ? `${currency} ${Number(inv.cgst_amount).toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                          {Number(inv.sgst_amount) > 0 ? `${currency} ${Number(inv.sgst_amount).toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#E6B676]">
                          {currency} {Number(inv.total_invoice_value).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 12 HSN Summary */}
          <div className="bg-[#1E0002] border border-[#390003] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#390003] bg-[#260002]/50 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white">Table 12: HSN/SAC Summary of Outward Supplies</h3>
                <p className="text-xs text-slate-400">Mandatory statutory aggregate breakdown categorized by HSN/SAC chapter</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#390003] bg-[#260002]/80 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4">HSN / SAC</th>
                    <th className="py-3.5 px-4">Description</th>
                    <th className="py-3.5 px-4">UQC</th>
                    <th className="py-3.5 px-4 text-right">Total Qty</th>
                    <th className="py-3.5 px-4 text-right">Total Value</th>
                    <th className="py-3.5 px-4 text-right">Taxable Value</th>
                    <th className="py-3.5 px-4 text-right">Tax Rate</th>
                    <th className="py-3.5 px-4 text-right">Integrated Tax</th>
                    <th className="py-3.5 px-4 text-right">Central Tax</th>
                    <th className="py-3.5 px-4 text-right">State Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#390003]/60 font-mono">
                  {gstr1Data.hsn_summary.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500 font-sans">
                        <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                        <span>No HSN summary data available for period {selectedPeriod}.</span>
                      </td>
                    </tr>
                  ) : (
                    gstr1Data.hsn_summary.map((hsn, idx) => (
                      <tr key={idx} className="hover:bg-[#260002]/60">
                        <td className="py-3 px-4 font-bold text-[#EEC68B]">{hsn.hsn_sac_code}</td>
                        <td className="py-3 px-4 font-sans text-slate-300">{hsn.description || 'Goods / Services'}</td>
                        <td className="py-3 px-4 text-slate-400">{hsn.uqc}</td>
                        <td className="py-3 px-4 text-right text-white font-bold">{hsn.total_quantity}</td>
                        <td className="py-3 px-4 text-right text-slate-200">{currency} {Number(hsn.total_value).toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-white font-bold">{currency} {Number(hsn.taxable_value).toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-slate-400">{Number(hsn.tax_rate)}%</td>
                        <td className="py-3 px-4 text-right text-slate-300">{currency} {Number(hsn.igst_amount).toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-slate-300">{currency} {Number(hsn.cgst_amount).toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-slate-300">{currency} {Number(hsn.sgst_amount).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 1-CLICK SETTLE GSTR-3B MODAL */}
      {isSettleModalOpen && gstr3bData && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#1E0002] border border-[#390003] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[#390003] flex items-center justify-between bg-[#260002]/80">
              <div className="flex items-center space-x-2.5">
                <Landmark className="w-5 h-5 text-[#E6B676]" />
                <h2 className="text-base font-bold text-white">Execute GSTR-3B Tax Filing & Settlement</h2>
              </div>
              <button
                onClick={() => setIsSettleModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteSettlement} className="p-5 space-y-4">
              <div className="p-3.5 bg-[#260002] rounded-xl border border-[#390003] space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Return Period:</span>
                  <span className="font-bold text-white font-mono">{selectedPeriod}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Total Output Tax Liability:</span>
                  <span className="font-bold text-white font-mono">
                    {currency} {Number(gstr3bData.tax_settlement.total_output_liability).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Eligible ITC Utilized:</span>
                  <span className="font-bold font-mono">
                    - {currency} {Number(gstr3bData.tax_settlement.total_itc_utilized).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#390003] text-sm font-bold text-[#E6B676]">
                  <span>Net Cash Disbursement Required:</span>
                  <span className="font-mono">
                    {currency} {Number(gstr3bData.tax_settlement.total_cash_payable).toFixed(2)}
                  </span>
                </div>
              </div>

              {Number(gstr3bData.tax_settlement.total_cash_payable) > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Disbursement Bank Account *
                  </label>
                  <select
                    value={settleBankId}
                    onChange={(e) => setSettleBankId(Number(e.target.value))}
                    required
                    className="w-full bg-[#260002] border border-[#390003] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C58B3E]"
                  >
                    <option value="">Select corporate bank account...</option>
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bank_name} — {b.account_number} ({b.currency} {Number(b.current_balance).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Challan / Payment Reference Number
                </label>
                <input
                  type="text"
                  value={settleReference}
                  onChange={(e) => setSettleReference(e.target.value)}
                  placeholder="e.g. CPIN-982348271 or GST-CHALLAN-092026"
                  className="w-full bg-[#260002] border border-[#390003] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#C58B3E]"
                />
              </div>

              {/* AUTOMATED DOUBLE-ENTRY BREAKDOWN */}
              <div className="p-3 bg-[#390003]/60 rounded-xl border border-[#C58B3E]/20 text-[11px] text-slate-300 space-y-1">
                <div className="font-semibold text-[#E6B676] flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Double-Entry Statutory Settlement Journal:</span>
                </div>
                <p className="font-mono text-slate-400">
                  Dr 2100 GST Output Liabilities (clears {currency} {Number(gstr3bData.tax_settlement.total_output_liability).toFixed(2)})<br />
                  Cr 1400/1410/1420 GST Input ITC (offsets {currency} {Number(gstr3bData.tax_settlement.total_itc_utilized).toFixed(2)})<br />
                  {Number(gstr3bData.tax_settlement.total_cash_payable) > 0 && (
                    <span>Cr 1100 Bank Account (pays {currency} {Number(gstr3bData.tax_settlement.total_cash_payable).toFixed(2)})</span>
                  )}
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#390003]">
                <button
                  type="button"
                  onClick={() => setIsSettleModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (Number(gstr3bData.tax_settlement.total_cash_payable) > 0 && !settleBankId)}
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#C58B3E] to-[#E6B676] text-[#260002] hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Posting Settlement...' : 'Confirm Filing & Disburse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
