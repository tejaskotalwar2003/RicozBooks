import React, { useState, useEffect } from 'react';
import { 
  Landmark, 
  Plus, 
  ArrowRightLeft, 
  Search, 
  Upload, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  FileText, 
  X, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Check, 
  ShieldCheck,
  CreditCard,
  TrendingUp,
  Download
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getBankAccounts, 
  createBankAccount, 
  getBankTransactions, 
  createBankTransfer, 
  getBankTransfers, 
  createBankReconciliation, 
  getBankReconciliationDetail, 
  uploadStatementCsv, 
  matchBankTx, 
  completeBankReconciliation, 
  getBankingSummary,
  getAccounts,
  BankAccount, 
  BankAccountCreateData, 
  BankTransaction, 
  BankTransfer, 
  BankTransferCreateData, 
  BankReconciliation, 
  BankingSummary,
  Account
} from '../services/accountingApi';

export const BankingPage: React.FC = () => {
  const { activeEntity } = useAuth();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [glAccounts, setGlAccounts] = useState<Account[]>([]);
  const [summary, setSummary] = useState<BankingSummary | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [transfers, setTransfers] = useState<BankTransfer[]>([]);
  
  const [activeTab, setActiveTab] = useState<'TRANSACTIONS' | 'TRANSFERS' | 'RECONCILIATION'>('TRANSACTIONS');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState<boolean>(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [isNewReconModalOpen, setIsNewReconModalOpen] = useState<boolean>(false);
  const [activeReconciliation, setActiveReconciliation] = useState<BankReconciliation | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // New Account Form State
  const [accountFormData, setAccountFormData] = useState<{
    bank_name: string;
    account_name: string;
    account_number: string;
    account_type: string;
    ifsc_code: string;
    branch_name: string;
    gl_account_id: number | '';
    opening_balance: number;
  }>({
    bank_name: '',
    account_name: '',
    account_number: '',
    account_type: 'CHECKING',
    ifsc_code: '',
    branch_name: '',
    gl_account_id: '',
    opening_balance: 0,
  });

  // Transfer Form State
  const [transferFormData, setTransferFormData] = useState<{
    from_bank_account_id: number | '';
    to_bank_account_id: number | '';
    transfer_date: string;
    amount: number;
    fee_amount: number;
    reference_number: string;
    notes: string;
  }>({
    from_bank_account_id: '',
    to_bank_account_id: '',
    transfer_date: new Date().toISOString().split('T')[0],
    amount: 0,
    fee_amount: 0,
    reference_number: '',
    notes: '',
  });

  // New Reconciliation Form State
  const [reconFormData, setReconFormData] = useState<{
    bank_account_id: number | '';
    statement_date: string;
    statement_balance: number;
    notes: string;
  }>({
    bank_account_id: '',
    statement_date: new Date().toISOString().split('T')[0],
    statement_balance: 0,
    notes: '',
  });

  const loadInitialData = async () => {
    if (!activeEntity?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [accountsData, summaryData, allGlAccounts, transfersData] = await Promise.all([
        getBankAccounts(activeEntity.id),
        getBankingSummary(activeEntity.id),
        getAccounts(activeEntity.id),
        getBankTransfers(activeEntity.id)
      ]);
      setBankAccounts(accountsData);
      setSummary(summaryData);
      setGlAccounts(allGlAccounts);
      setTransfers(transfersData);

      if (accountsData.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accountsData[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load banking data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransactions = async (accId: number) => {
    try {
      const txData = await getBankTransactions(accId);
      setTransactions(txData);
    } catch (err: any) {
      setError(err.message || 'Failed to load transactions');
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [activeEntity?.id]);

  useEffect(() => {
    if (selectedAccountId) {
      loadTransactions(selectedAccountId);
    }
  }, [selectedAccountId]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntity?.id) return;
    setError(null);

    if (!accountFormData.bank_name || !accountFormData.account_number || !accountFormData.gl_account_id) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const payload: BankAccountCreateData = {
        entity_id: activeEntity.id,
        bank_name: accountFormData.bank_name,
        account_name: accountFormData.account_name || `${accountFormData.bank_name} Operating`,
        account_number: accountFormData.account_number,
        account_type: accountFormData.account_type,
        ifsc_code: accountFormData.ifsc_code || undefined,
        branch_name: accountFormData.branch_name || undefined,
        gl_account_id: Number(accountFormData.gl_account_id),
        opening_balance: Number(accountFormData.opening_balance || 0)
      };

      await createBankAccount(payload);
      setIsAddAccountModalOpen(false);
      setActionSuccess('Bank account configured and linked to General Ledger!');
      setAccountFormData({
        bank_name: '',
        account_name: '',
        account_number: '',
        account_type: 'CHECKING',
        ifsc_code: '',
        branch_name: '',
        gl_account_id: '',
        opening_balance: 0,
      });
      loadInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to create bank account');
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntity?.id) return;
    setError(null);

    if (!transferFormData.from_bank_account_id || !transferFormData.to_bank_account_id) {
      setError('Please select both source and destination accounts');
      return;
    }
    if (transferFormData.from_bank_account_id === transferFormData.to_bank_account_id) {
      setError('Source and destination accounts must be different');
      return;
    }
    if (transferFormData.amount <= 0) {
      setError('Transfer amount must be greater than zero');
      return;
    }

    try {
      const payload: BankTransferCreateData = {
        entity_id: activeEntity.id,
        from_bank_account_id: Number(transferFormData.from_bank_account_id),
        to_bank_account_id: Number(transferFormData.to_bank_account_id),
        transfer_date: transferFormData.transfer_date,
        amount: Number(transferFormData.amount),
        fee_amount: Number(transferFormData.fee_amount || 0),
        reference_number: transferFormData.reference_number || undefined,
        notes: transferFormData.notes || undefined,
      };

      await createBankTransfer(payload);
      setIsTransferModalOpen(false);
      setActionSuccess('Internal transfer completed! Balanced journal entries posted.');
      loadInitialData();
      if (selectedAccountId) loadTransactions(selectedAccountId);
    } catch (err: any) {
      setError(err.message || 'Internal transfer failed');
    }
  };

  const handleStartReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconFormData.bank_account_id) return;
    try {
      const recon = await createBankReconciliation({
        bank_account_id: Number(reconFormData.bank_account_id),
        statement_date: reconFormData.statement_date,
        statement_balance: Number(reconFormData.statement_balance),
        notes: reconFormData.notes || undefined
      });
      setActiveReconciliation(recon);
      setIsNewReconModalOpen(false);
      setActiveTab('RECONCILIATION');
      setActionSuccess('Reconciliation session created. You may now upload your bank CSV statement.');
    } catch (err: any) {
      setError(err.message || 'Failed to initialize reconciliation');
    }
  };

  const handleUploadCsv = async () => {
    if (!activeReconciliation || !csvFile) return;
    setIsUploading(true);
    setError(null);
    try {
      const res = await uploadStatementCsv(activeReconciliation.id, csvFile);
      setActionSuccess(res.message);
      // Refresh recon detail
      const updated = await getBankReconciliationDetail(activeReconciliation.id);
      setActiveReconciliation(updated);
      setCsvFile(null);
      if (selectedAccountId) loadTransactions(selectedAccountId);
    } catch (err: any) {
      setError(err.message || 'Failed to parse CSV statement');
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualMatch = async (stmtLineId: number, txId: number) => {
    if (!activeReconciliation) return;
    try {
      await matchBankTx(activeReconciliation.id, stmtLineId, txId);
      const updated = await getBankReconciliationDetail(activeReconciliation.id);
      setActiveReconciliation(updated);
      setActionSuccess('Transaction matched successfully!');
      if (selectedAccountId) loadTransactions(selectedAccountId);
    } catch (err: any) {
      setError(err.message || 'Failed to match transaction');
    }
  };

  const handleCompleteReconciliation = async () => {
    if (!activeReconciliation) return;
    try {
      const completed = await completeBankReconciliation(activeReconciliation.id);
      setActiveReconciliation(completed);
      setActionSuccess('Bank Reconciliation completed and sealed! Audit trail recorded.');
      loadInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to complete reconciliation');
    }
  };

  const formatCurrency = (val: number | string | undefined) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: activeEntity?.base_currency || 'INR',
      maximumFractionDigits: 2
    }).format(num);
  };

  const activeAccount = bankAccounts.find(a => a.id === selectedAccountId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#390003] text-[#E6B676] rounded-xl shadow-sm border border-[#C58B3E]/30">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Banking & Reconciliation</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage bank accounts, internal liquidity transfers, and automated CSV statement reconciliation
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              loadInitialData();
              if (selectedAccountId) loadTransactions(selectedAccountId);
            }}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border border-slate-300"
          >
            <ArrowRightLeft className="w-4 h-4 text-slate-600" />
            <span>Internal Transfer</span>
          </button>
          <button
            onClick={() => setIsAddAccountModalOpen(true)}
            className="flex items-center space-x-2 bg-[#390003] hover:bg-[#55080E] text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer border border-[#C58B3E]/40"
          >
            <Plus className="w-4 h-4 text-[#E6B676]" />
            <span>Add Bank Account</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK ALERTS */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-800 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-medium uppercase tracking-wider">Total Liquid Cash</div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {formatCurrency(summary?.total_liquid_cash || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>Available cash & bank balances</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-medium uppercase tracking-wider">Active Bank Accounts</div>
          <div className="text-2xl font-bold text-[#390003] mt-2">
            {summary?.active_bank_accounts_count || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
            <Landmark className="w-3.5 h-3.5 text-[#C58B3E]" />
            <span>Linked to Chart of Accounts</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-medium uppercase tracking-wider">Unreconciled Transactions</div>
          <div className="text-2xl font-bold text-amber-600 mt-2">
            {summary?.unreconciled_transactions_count || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Pending statement verification</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-medium uppercase tracking-wider">Internal Transfers</div>
          <div className="text-2xl font-bold text-blue-600 mt-2">
            {transfers.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" />
            <span>Inter-account liquidity shifts</span>
          </div>
        </div>
      </div>

      {/* BANK ACCOUNT CARDS */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Company Bank Accounts
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bankAccounts.map((acc) => {
            const isSelected = acc.id === selectedAccountId;
            return (
              <div
                key={acc.id}
                onClick={() => setSelectedAccountId(acc.id)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'bg-gradient-to-br from-[#390003] to-[#200002] text-white border-[#C58B3E]/60 shadow-lg ring-2 ring-[#C58B3E]/30'
                    : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className={`text-xs font-medium uppercase tracking-wider ${isSelected ? 'text-[#E6B676]' : 'text-slate-500'}`}>
                      {acc.bank_name}
                    </div>
                    <div className="text-base font-bold mt-0.5">{acc.account_name}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    isSelected ? 'bg-white/10 text-white border border-white/20' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {acc.account_type}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className={`text-[10px] font-mono ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        A/C: •••• {acc.account_number.slice(-4)}
                      </div>
                      {acc.ifsc_code && (
                        <div className={`text-[10px] font-mono ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                          IFSC: {acc.ifsc_code}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`text-[10px] uppercase tracking-wider ${isSelected ? 'text-[#EEC68B]' : 'text-slate-400'}`}>
                        Book Balance
                      </div>
                      <div className={`text-lg font-bold font-mono ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {formatCurrency(acc.current_balance)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 flex items-center justify-between border-t border-white/10">
                  <span className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    GL: {acc.gl_account_name || '1100 Bank'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setReconFormData({ ...reconFormData, bank_account_id: acc.id });
                      setIsNewReconModalOpen(true);
                    }}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#C58B3E] hover:bg-[#D89B4E] text-[#200002]'
                        : 'bg-[#390003] hover:bg-[#55080E] text-white'
                    }`}
                  >
                    Reconcile
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('TRANSACTIONS')}
            className={`pb-3 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'TRANSACTIONS'
                ? 'border-[#390003] text-[#390003]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Bank Transactions ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('TRANSFERS')}
            className={`pb-3 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'TRANSFERS'
                ? 'border-[#390003] text-[#390003]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Internal Transfers ({transfers.length})
          </button>
          <button
            onClick={() => setActiveTab('RECONCILIATION')}
            className={`pb-3 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'RECONCILIATION'
                ? 'border-[#390003] text-[#390003]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Reconciliation Center {activeReconciliation ? '• In Progress' : ''}
          </button>
        </nav>
      </div>

      {/* TAB 1: BANK TRANSACTIONS LEDGER */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="font-semibold text-xs text-slate-800">
              Transactions for <span className="font-bold text-[#390003]">{activeAccount?.bank_name} - {activeAccount?.account_name}</span>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Balance: {formatCurrency(activeAccount?.current_balance)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Payee / Description</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4 text-right">Inflow (Deposit)</th>
                  <th className="py-3 px-4 text-right">Outflow (Withdrawal)</th>
                  <th className="py-3 px-4 text-right">Running Balance</th>
                  <th className="py-3 px-4 text-center">Recon Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No transactions recorded for this bank account yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-slate-600 font-mono">{tx.transaction_date}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {tx.transaction_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{tx.counterparty || '—'}</div>
                        <div className="text-[11px] text-slate-500">{tx.description || '—'}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">{tx.reference_number || '—'}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600">
                        {tx.is_credit ? `+${formatCurrency(tx.amount)}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-rose-600">
                        {!tx.is_credit ? `-${formatCurrency(tx.amount)}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-800">
                        {tx.running_balance ? formatCurrency(tx.running_balance) : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {tx.status === 'RECONCILED' ? (
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300">
                            Reconciled
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-300">
                            Unreconciled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: INTERNAL TRANSFERS HISTORY */}
      {activeTab === 'TRANSFERS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="font-semibold text-xs text-slate-800">
              Inter-Account Transfer Register
            </div>
            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="text-xs text-[#390003] font-semibold hover:underline cursor-pointer"
            >
              + Initiate Transfer
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Transfer #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">From Bank</th>
                  <th className="py-3 px-4">To Bank</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Fee</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-center">GL Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transfers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No internal bank transfers recorded yet.
                    </td>
                  </tr>
                ) : (
                  transfers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">{t.transfer_number}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono">{t.transfer_date}</td>
                      <td className="py-3 px-4 text-slate-800 font-medium">
                        {bankAccounts.find(a => a.id === t.from_bank_account_id)?.bank_name || 'Bank A'}
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-medium">
                        {bankAccounts.find(a => a.id === t.to_bank_account_id)?.bank_name || 'Bank B'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">{t.reference_number || '—'}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {formatCurrency(t.fee_amount)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{t.notes || '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300">
                          Posted GL
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BANK RECONCILIATION CENTER */}
      {activeTab === 'RECONCILIATION' && (
        <div className="space-y-6">
          {!activeReconciliation ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-lg mx-auto shadow-xs space-y-4">
              <div className="p-3 bg-[#390003]/10 text-[#390003] rounded-full w-14 h-14 mx-auto flex items-center justify-center">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Bank Statement Reconciliation</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Verify your General Ledger bank balances against your official bank statement CSV with automated transaction matching.
                </p>
              </div>
              <button
                onClick={() => setIsNewReconModalOpen(true)}
                className="px-5 py-2.5 bg-[#390003] hover:bg-[#55080E] text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer border border-[#C58B3E]/40"
              >
                Start Reconciliation Session
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* RECONCILIATION SESSION HEADER */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Active Session</div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Reconciling {bankAccounts.find(b => b.id === activeReconciliation.bank_account_id)?.bank_name} as of {activeReconciliation.statement_date}
                    </h2>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* CSV UPLOAD */}
                    <input
                      type="file"
                      id="csv-upload"
                      accept=".csv"
                      onChange={(e) => e.target.files && setCsvFile(e.target.files[0])}
                      className="hidden"
                    />
                    <label
                      htmlFor="csv-upload"
                      className="flex items-center space-x-2 px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-slate-500" />
                      <span>{csvFile ? csvFile.name : 'Select Bank Statement CSV'}</span>
                    </label>

                    {csvFile && (
                      <button
                        onClick={handleUploadCsv}
                        disabled={isUploading}
                        className="px-4 py-2 bg-[#390003] text-white rounded-lg text-xs font-semibold hover:bg-[#55080E] transition-colors cursor-pointer"
                      >
                        {isUploading ? 'Parsing...' : 'Upload & Auto-Match'}
                      </button>
                    )}

                    <button
                      onClick={handleCompleteReconciliation}
                      disabled={activeReconciliation.status === 'COMPLETED'}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer ${
                        activeReconciliation.status === 'COMPLETED'
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {activeReconciliation.status === 'COMPLETED' ? 'Reconciled & Sealed' : 'Complete & Seal'}
                    </button>
                  </div>
                </div>

                {/* RECON BALANCE BAR */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-500">Statement Ending Balance:</span>
                    <div className="font-bold text-base font-mono text-slate-900 mt-0.5">
                      {formatCurrency(activeReconciliation.statement_balance)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Book (GL) Balance:</span>
                    <div className="font-bold text-base font-mono text-slate-900 mt-0.5">
                      {formatCurrency(activeReconciliation.book_balance)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Reconciled Credits/Debits:</span>
                    <div className="font-bold text-base font-mono text-blue-600 mt-0.5">
                      {formatCurrency(activeReconciliation.reconciled_balance)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Difference:</span>
                    <div className={`font-bold text-base font-mono mt-0.5 ${
                      Number(activeReconciliation.difference) === 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {formatCurrency(activeReconciliation.difference)}
                    </div>
                  </div>
                </div>
              </div>

              {/* STATEMENT LINES LIST */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 font-semibold text-xs text-slate-800">
                  Bank Statement Lines from CSV ({activeReconciliation.statement_lines?.length || 0})
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Narration / Description</th>
                        <th className="py-3 px-4">Reference</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        <th className="py-3 px-4 text-center">Type</th>
                        <th className="py-3 px-4 text-center">Match Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {!activeReconciliation.statement_lines || activeReconciliation.statement_lines.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            No statement lines uploaded yet. Upload a CSV statement using the button above.
                          </td>
                        </tr>
                      ) : (
                        activeReconciliation.statement_lines.map((line) => (
                          <tr key={line.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 text-slate-600 font-mono">{line.transaction_date}</td>
                            <td className="py-3 px-4 text-slate-900 font-medium">{line.description}</td>
                            <td className="py-3 px-4 font-mono text-slate-500">{line.reference || '—'}</td>
                            <td className={`py-3 px-4 text-right font-mono font-bold ${line.is_credit ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {line.is_credit ? `+${formatCurrency(line.amount)}` : `-${formatCurrency(line.amount)}`}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                                {line.is_credit ? 'Deposit' : 'Withdrawal'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {line.is_matched ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Check className="w-3 h-3" />
                                  <span>Matched (Tx #{line.matched_transaction_id})</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  Unmatched
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {!line.is_matched && (
                                <select
                                  aria-label="Match with system transaction"
                                  onChange={(e) => {
                                    if (e.target.value) handleManualMatch(line.id, Number(e.target.value));
                                  }}
                                  className="px-2 py-1 text-[11px] border border-slate-300 rounded bg-white"
                                >
                                  <option value="">Manual Match...</option>
                                  {transactions.filter(t => t.status === 'UNRECONCILED').map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.transaction_date} - {formatCurrency(t.amount)} ({t.counterparty || t.description})
                                    </option>
                                  ))}
                                </select>
                              )}
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
        </div>
      )}

      {/* MODAL 1: ADD BANK ACCOUNT */}
      {isAddAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-[#390003] text-[#E6B676] rounded-lg">
                  <Landmark className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Add Bank Account</h3>
              </div>
              <button onClick={() => setIsAddAccountModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4 my-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bank Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC Bank, ICICI Bank"
                    value={accountFormData.bank_name}
                    onChange={(e) => setAccountFormData({ ...accountFormData, bank_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#390003]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Display Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Primary Operating Current"
                    value={accountFormData.account_name}
                    onChange={(e) => setAccountFormData({ ...accountFormData, account_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#390003]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 50200012345678"
                    value={accountFormData.account_number}
                    onChange={(e) => setAccountFormData({ ...accountFormData, account_number: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#390003]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Type</label>
                  <select
                    aria-label="Account Type"
                    value={accountFormData.account_type}
                    onChange={(e) => setAccountFormData({ ...accountFormData, account_type: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#390003]"
                  >
                    <option value="CHECKING">Checking / Current Account</option>
                    <option value="SAVINGS">Savings Account</option>
                    <option value="CREDIT_CARD">Corporate Credit Card</option>
                    <option value="MONEY_MARKET">Money Market</option>
                    <option value="OVERDRAFT">Bank Overdraft</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">IFSC / Branch Code</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC0001234"
                    value={accountFormData.ifsc_code}
                    onChange={(e) => setAccountFormData({ ...accountFormData, ifsc_code: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#390003]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Opening Balance</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={accountFormData.opening_balance || ''}
                    onChange={(e) => setAccountFormData({ ...accountFormData, opening_balance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#390003]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Linked General Ledger Asset Account *</label>
                <select
                  aria-label="Linked General Ledger Asset Account"
                  required
                  value={accountFormData.gl_account_id}
                  onChange={(e) => setAccountFormData({ ...accountFormData, gl_account_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#390003]"
                >
                  <option value="">Select Asset Account...</option>
                  {glAccounts.filter(a => a.account_type === 'ASSET').map((a) => (
                    <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddAccountModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#390003] hover:bg-[#55080E] text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer border border-[#C58B3E]/40"
                >
                  Save Bank Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INTERNAL TRANSFER */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-[#390003] text-[#E6B676] rounded-lg">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Internal Bank Transfer</h3>
              </div>
              <button onClick={() => setIsTransferModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-4 my-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">From Bank Account *</label>
                  <select
                    aria-label="From Bank Account"
                    required
                    value={transferFormData.from_bank_account_id}
                    onChange={(e) => setTransferFormData({ ...transferFormData, from_bank_account_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#390003]"
                  >
                    <option value="">Select Source Account...</option>
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>{b.bank_name} - {formatCurrency(b.current_balance)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">To Bank Account *</label>
                  <select
                    aria-label="To Bank Account"
                    required
                    value={transferFormData.to_bank_account_id}
                    onChange={(e) => setTransferFormData({ ...transferFormData, to_bank_account_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#390003]"
                  >
                    <option value="">Select Target Account...</option>
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>{b.bank_name} - {formatCurrency(b.current_balance)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Transfer Date *</label>
                  <input
                    type="date"
                    required
                    value={transferFormData.transfer_date}
                    onChange={(e) => setTransferFormData({ ...transferFormData, transfer_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#390003]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={transferFormData.amount || ''}
                    onChange={(e) => setTransferFormData({ ...transferFormData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#390003]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Transfer Fee (if any)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={transferFormData.fee_amount || ''}
                    onChange={(e) => setTransferFormData({ ...transferFormData, fee_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#390003]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reference / UTR #</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-TRANS-9901"
                    value={transferFormData.reference_number}
                    onChange={(e) => setTransferFormData({ ...transferFormData, reference_number: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#390003]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Notes / Purpose</label>
                  <input
                    type="text"
                    placeholder="e.g. Liquidity rebalancing"
                    value={transferFormData.notes}
                    onChange={(e) => setTransferFormData({ ...transferFormData, notes: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#390003]"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
                A balanced double-entry journal entry will be automatically posted: Debiting destination bank GL account, Crediting source bank GL account.
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#390003] hover:bg-[#55080E] text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer border border-[#C58B3E]/40"
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: START RECONCILIATION */}
      {isNewReconModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-[#390003] text-[#E6B676] rounded-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">New Reconciliation Session</h3>
              </div>
              <button onClick={() => setIsNewReconModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStartReconciliation} className="space-y-4 my-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bank Account *</label>
                <select
                  aria-label="Bank Account"
                  required
                  value={reconFormData.bank_account_id}
                  onChange={(e) => setReconFormData({ ...reconFormData, bank_account_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#390003]"
                >
                  <option value="">Select Account...</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>{b.bank_name} - {b.account_name} ({formatCurrency(b.current_balance)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Statement Ending Date *</label>
                <input
                  type="date"
                  required
                  value={reconFormData.statement_date}
                  onChange={(e) => setReconFormData({ ...reconFormData, statement_date: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#390003]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Statement Ending Balance *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 450000.00"
                  value={reconFormData.statement_balance || ''}
                  onChange={(e) => setReconFormData({ ...reconFormData, statement_balance: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#390003]"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  The closing balance printed on your official bank account statement.
                </span>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewReconModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#390003] hover:bg-[#55080E] text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer border border-[#C58B3E]/40"
                >
                  Start Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
