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
            <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200/80 text-blue-700 shadow-sm">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  GST & Statutory Tax Center
                </h1>
                {activeEntity?.tax_identifier && (
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                    GSTIN: {activeEntity.tax_identifier}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated GSTR-1 outward tax liability, GSTR-3B Input Tax Credit (ITC) offset, and 1-click ledger settlement
              </p>
            </div>
          </div>
        </div>

        {/* PERIOD SELECTOR & ACTIONS */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center space-x-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-500 font-semibold">Period:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {periodOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-white text-slate-800">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => loadGstData()}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors shadow-sm"
            title="Refresh Return"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={downloadGstr1Json}
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            title="Export official JSON for GST portal upload"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export GSTR-1 JSON</span>
          </button>

          {gstr3bData?.status !== 'FILED' ? (
            <button
              onClick={handleOpenSettleModal}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-all shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>File & Settle GSTR-3B</span>
            </button>
          ) : (
            <div className="flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 rounded-lg text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Filed (ARN: {gstr3bData.arn_number?.substring(0, 10)}...)</span>
            </div>
          )}
        </div>
      </div>

      {/* NOTIFICATION ALERTS */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-sm shadow-sm">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800 text-sm shadow-sm">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-600 hover:text-rose-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STATUTORY SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Output Tax Liability */}
        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Output Tax Due</span>
            <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {currency} {Number(metrics?.total_output_tax_due || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-rose-600 mt-1 flex items-center gap-1.5 font-medium">
              <span>Sales & Outward Supplies</span>
            </div>
          </div>
        </div>

        {/* Input Tax Credit (ITC) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Eligible ITC</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-700 tracking-tight">
              {currency} {Number(metrics?.total_input_tax_credit_available || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
              <span>Vendor Purchases & Bills</span>
            </div>
          </div>
        </div>

        {/* Net Cash Payable */}
        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Cash Payable</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {currency} {Number(metrics?.net_tax_payable || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              After automatic ITC credit utilization
            </div>
          </div>
        </div>

        {/* Statutory Filing Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Return Status</span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                gstr3bData?.status === 'FILED' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}>
                {gstr3bData?.status || 'READY_FOR_FILING'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">
              {gstr3bData?.arn_number ? `ARN: ${gstr3bData.arn_number}` : 'Awaiting confirmation'}
            </div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('gstr3b')}
          className={`flex items-center space-x-2 py-3 px-5 font-semibold text-sm border-b-2 transition-colors cursor-pointer ${
            activeTab === 'gstr3b'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>GSTR-3B Monthly Return & Offset Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('gstr1')}
          className={`flex items-center space-x-2 py-3 px-5 font-semibold text-sm border-b-2 transition-colors cursor-pointer ${
            activeTab === 'gstr1'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>GSTR-1 Outward Supplies (B2B & HSN)</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-mono">
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
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                <Receipt className="w-4 h-4 text-blue-600" />
                <span>Table 3.1 Outward Taxable Supplies</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
                  <span>Total Taxable Value:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {currency} {Number(gstr3bData.outward_supplies.taxable_value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
                  <span>Integrated Tax (IGST):</span>
                  <span className="font-mono text-slate-800">
                    {currency} {Number(gstr3bData.outward_supplies.igst).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
                  <span>Central Tax (CGST):</span>
                  <span className="font-mono text-slate-800">
                    {currency} {Number(gstr3bData.outward_supplies.cgst).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
                  <span>State Tax (SGST):</span>
                  <span className="font-mono text-slate-800">
                    {currency} {Number(gstr3bData.outward_supplies.sgst).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between pt-2.5 font-bold text-slate-900 text-sm">
                  <span>Total Output Liability:</span>
                  <span className="font-mono text-rose-600">
                    {currency} {Number(gstr3bData.tax_settlement.total_output_liability).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Table 4 Eligible ITC */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>Table 4 Eligible Input Tax Credit (ITC)</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
                  <span>ITC Integrated Tax (IGST):</span>
                  <span className="font-mono text-slate-800">
                    {currency} {Number(gstr3bData.eligible_itc.itc_igst).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
                  <span>ITC Central Tax (CGST):</span>
                  <span className="font-mono text-slate-800">
                    {currency} {Number(gstr3bData.eligible_itc.itc_cgst).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
                  <span>ITC State Tax (SGST):</span>
                  <span className="font-mono text-slate-800">
                    {currency} {Number(gstr3bData.eligible_itc.itc_sgst).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
                  <span>Other Inward Supplies / RCM:</span>
                  <span className="font-mono text-slate-400">0.00</span>
                </div>
                <div className="flex justify-between pt-2.5 font-bold text-slate-900 text-sm">
                  <span>Total ITC Available:</span>
                  <span className="font-mono text-emerald-600">
                    {currency} {Number(gstr3bData.eligible_itc.total_itc_available).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* TABLE 6: STATUTORY OFFSET & PAYMENT MATRIX */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Table 6.1 Payment of Tax (Offset of Output Liability against ITC)</h3>
                <p className="text-xs text-slate-500">Statutory waterfall: IGST ITC offsets IGST then CGST/SGST; CGST ITC offsets CGST; SGST ITC offsets SGST</p>
              </div>
              {gstr3bData.status === 'FILED' && (
                <div className="text-xs text-emerald-700 font-mono font-semibold flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Settlement Posted ({gstr3bData.filing_date})</span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Tax Description</th>
                    <th className="py-3.5 px-4 text-right">Total Liability</th>
                    <th className="py-3.5 px-4 text-right">Paid Through ITC</th>
                    <th className="py-3.5 px-4 text-right">Tax Paid in Cash</th>
                    <th className="py-3.5 px-4 text-center">Settlement Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-4 font-sans font-semibold text-slate-900">Integrated Tax (IGST)</td>
                    <td className="py-3.5 px-4 text-right text-slate-700">
                      {currency} {Number(gstr3bData.tax_settlement.output_igst).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-600 font-semibold">
                      {currency} {Number(gstr3bData.tax_settlement.itc_offset_igst).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {currency} {Number(gstr3bData.tax_settlement.cash_payable_igst).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-sans">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {Number(gstr3bData.tax_settlement.cash_payable_igst) === 0 ? 'Full ITC Offset' : 'Cash Remitted'}
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-4 font-sans font-semibold text-slate-900">Central Tax (CGST)</td>
                    <td className="py-3.5 px-4 text-right text-slate-700">
                      {currency} {Number(gstr3bData.tax_settlement.output_cgst).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-600 font-semibold">
                      {currency} {Number(gstr3bData.tax_settlement.itc_offset_cgst).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {currency} {Number(gstr3bData.tax_settlement.cash_payable_cgst).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-sans">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {Number(gstr3bData.tax_settlement.cash_payable_cgst) === 0 ? 'Full ITC Offset' : 'Cash Remitted'}
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-4 font-sans font-semibold text-slate-900">State / UT Tax (SGST)</td>
                    <td className="py-3.5 px-4 text-right text-slate-700">
                      {currency} {Number(gstr3bData.tax_settlement.output_sgst).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-600 font-semibold">
                      {currency} {Number(gstr3bData.tax_settlement.itc_offset_sgst).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {currency} {Number(gstr3bData.tax_settlement.cash_payable_sgst).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-sans">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {Number(gstr3bData.tax_settlement.cash_payable_sgst) === 0 ? 'Full ITC Offset' : 'Cash Remitted'}
                      </span>
                    </td>
                  </tr>

                  <tr className="bg-slate-50 font-bold border-t border-slate-200">
                    <td className="py-3.5 px-4 font-sans text-slate-900">Total Statutory Settlement</td>
                    <td className="py-3.5 px-4 text-right text-slate-900">
                      {currency} {Number(gstr3bData.tax_settlement.total_output_liability).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-600">
                      {currency} {Number(gstr3bData.tax_settlement.total_itc_utilized).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-900 text-sm">
                      {currency} {Number(gstr3bData.tax_settlement.total_cash_payable).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-sans">
                      {gstr3bData.status === 'FILED' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Filed & Settled
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
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
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Table 4: Taxable Outward B2B Supplies</h3>
                <p className="text-xs text-slate-500">All registered customer invoices issued within period {selectedPeriod}</p>
              </div>
              <div className="text-xs text-slate-700 font-mono font-semibold bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                Total Invoices: {gstr1Data.b2b_invoices.length}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
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
                <tbody className="divide-y divide-slate-100">
                  {gstr1Data.b2b_invoices.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <span>No B2B invoices generated in period {selectedPeriod}.</span>
                      </td>
                    </tr>
                  ) : (
                    gstr1Data.b2b_invoices.map((inv, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {inv.invoice_number}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono">
                          {inv.invoice_date}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {inv.customer_name}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                          {inv.customer_gstin || 'URP (Unregistered)'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {inv.place_of_supply}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-900 font-medium">
                          {currency} {Number(inv.taxable_value).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          {Number(inv.tax_rate)}%
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          {Number(inv.igst_amount) > 0 ? `${currency} ${Number(inv.igst_amount).toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          {Number(inv.cgst_amount) > 0 ? `${currency} ${Number(inv.cgst_amount).toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          {Number(inv.sgst_amount) > 0 ? `${currency} ${Number(inv.sgst_amount).toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
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
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Table 12: HSN/SAC Summary of Outward Supplies</h3>
                <p className="text-xs text-slate-500">Mandatory statutory aggregate breakdown categorized by HSN/SAC chapter</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
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
                <tbody className="divide-y divide-slate-100 font-mono">
                  {gstr1Data.hsn_summary.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400 font-sans">
                        <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <span>No HSN summary data available for period {selectedPeriod}.</span>
                      </td>
                    </tr>
                  ) : (
                    gstr1Data.hsn_summary.map((hsn, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-bold text-slate-900">{hsn.hsn_sac_code}</td>
                        <td className="py-3 px-4 font-sans text-slate-700">{hsn.description || 'Goods / Services'}</td>
                        <td className="py-3 px-4 text-slate-500">{hsn.uqc}</td>
                        <td className="py-3 px-4 text-right text-slate-900 font-bold">{hsn.total_quantity}</td>
                        <td className="py-3 px-4 text-right text-slate-700">{currency} {Number(hsn.total_value).toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-slate-900 font-bold">{currency} {Number(hsn.taxable_value).toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-slate-500">{Number(hsn.tax_rate)}%</td>
                        <td className="py-3 px-4 text-right text-slate-700">{currency} {Number(hsn.igst_amount).toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-slate-700">{currency} {Number(hsn.cgst_amount).toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-slate-700">{currency} {Number(hsn.sgst_amount).toFixed(2)}</td>
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
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <Landmark className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">Execute GSTR-3B Tax Filing & Settlement</h2>
              </div>
              <button
                onClick={() => setIsSettleModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteSettlement} className="p-5 space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Return Period:</span>
                  <span className="font-bold text-slate-900 font-mono">{selectedPeriod}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Output Tax Liability:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {currency} {Number(gstr3bData.tax_settlement.total_output_liability).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Eligible ITC Utilized:</span>
                  <span className="font-bold font-mono">
                    - {currency} {Number(gstr3bData.tax_settlement.total_itc_utilized).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                  <span>Net Cash Disbursement Required:</span>
                  <span className="font-mono text-rose-600">
                    {currency} {Number(gstr3bData.tax_settlement.total_cash_payable).toFixed(2)}
                  </span>
                </div>
              </div>

              {Number(gstr3bData.tax_settlement.total_cash_payable) > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Disbursement Bank Account *
                  </label>
                  <select
                    value={settleBankId}
                    onChange={(e) => setSettleBankId(Number(e.target.value))}
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Challan / Payment Reference Number
                </label>
                <input
                  type="text"
                  value={settleReference}
                  onChange={(e) => setSettleReference(e.target.value)}
                  placeholder="e.g. CPIN-982348271 or GST-CHALLAN-092026"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* AUTOMATED DOUBLE-ENTRY BREAKDOWN */}
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80 text-[11px] text-blue-900 space-y-1">
                <div className="font-semibold text-blue-900 flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-blue-700" />
                  <span>Double-Entry Statutory Settlement Journal:</span>
                </div>
                <p className="font-mono text-blue-800 text-[11px] leading-relaxed">
                  Dr 2100 GST Output Liabilities (clears {currency} {Number(gstr3bData.tax_settlement.total_output_liability).toFixed(2)})<br />
                  Cr 1400/1410/1420 GST Input ITC (offsets {currency} {Number(gstr3bData.tax_settlement.total_itc_utilized).toFixed(2)})<br />
                  {Number(gstr3bData.tax_settlement.total_cash_payable) > 0 && (
                    <span>Cr 1100 Bank Account (pays {currency} {Number(gstr3bData.tax_settlement.total_cash_payable).toFixed(2)})</span>
                  )}
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsSettleModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (Number(gstr3bData.tax_settlement.total_cash_payable) > 0 && !settleBankId)}
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
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
