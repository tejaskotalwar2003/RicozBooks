import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  CreditCard, 
  Printer, 
  X, 
  TrendingDown, 
  RefreshCw, 
  FileText, 
  ArrowRight,
  Send,
  UserCheck,
  Building2,
  DollarSign,
  Tag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getExpenses, 
  getExpenseCategories, 
  createExpense, 
  actionExpense, 
  postExpense, 
  reimburseExpense, 
  getExpenseSummary, 
  getBankAccounts,
  getAccounts,
  Expense, 
  ExpenseCategory, 
  ExpenseCreateData, 
  ExpenseSummary,
  BankAccount,
  Account
} from '../services/accountingApi';

export const ExpensesPage: React.FC = () => {
  const { activeEntity } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [glAccounts, setGlAccounts] = useState<Account[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [reimbursableOnly, setReimbursableOnly] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isReimburseModalOpen, setIsReimburseModalOpen] = useState<boolean>(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // New Expense Form State
  const [formData, setFormData] = useState<{
    title: string;
    category_id: number | '';
    expense_date: string;
    expense_account_id: number | '';
    payment_account_id: number | '';
    bank_account_id: number | '';
    payment_method: string;
    subtotal: number;
    tax_amount: number;
    merchant_name: string;
    reference_number: string;
    description: string;
    is_reimbursable: boolean;
    auto_post: boolean;
  }>({
    title: '',
    category_id: '',
    expense_date: new Date().toISOString().split('T')[0],
    expense_account_id: '',
    payment_account_id: '',
    bank_account_id: '',
    payment_method: 'BANK_TRANSFER',
    subtotal: 0,
    tax_amount: 0,
    merchant_name: '',
    reference_number: '',
    description: '',
    is_reimbursable: false,
    auto_post: false,
  });

  // Reimbursement Modal Form State
  const [reimbBankId, setReimbBankId] = useState<number | ''>('');
  const [reimbRef, setReimbRef] = useState<string>('');

  const loadData = async () => {
    if (!activeEntity?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [expData, catData, bankData, sumData, accData] = await Promise.all([
        getExpenses(activeEntity.id, {
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          category_id: selectedCategory === 'ALL' ? undefined : Number(selectedCategory),
          is_reimbursable: reimbursableOnly ? true : undefined,
          search: searchTerm || undefined
        }),
        getExpenseCategories(activeEntity.id),
        getBankAccounts(activeEntity.id),
        getExpenseSummary(activeEntity.id),
        getAccounts(activeEntity.id)
      ]);
      setExpenses(expData);
      setCategories(catData);
      setBankAccounts(bankData);
      setSummary(sumData);
      setGlAccounts(accData);
    } catch (err: any) {
      setError(err.message || 'Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeEntity?.id, statusFilter, selectedCategory, reimbursableOnly]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntity?.id) return;
    setError(null);

    // Validate
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!formData.expense_account_id) {
      setError('Please select an Expense GL Account');
      return;
    }
    if (formData.subtotal <= 0) {
      setError('Expense subtotal must be greater than 0');
      return;
    }

    try {
      const payload: ExpenseCreateData = {
        entity_id: activeEntity.id,
        title: formData.title,
        category_id: formData.category_id ? Number(formData.category_id) : undefined,
        expense_date: formData.expense_date,
        expense_account_id: Number(formData.expense_account_id),
        payment_account_id: formData.payment_account_id ? Number(formData.payment_account_id) : undefined,
        bank_account_id: formData.bank_account_id ? Number(formData.bank_account_id) : undefined,
        payment_method: formData.payment_method,
        subtotal: formData.subtotal,
        tax_amount: formData.tax_amount,
        merchant_name: formData.merchant_name || undefined,
        reference_number: formData.reference_number || undefined,
        description: formData.description || undefined,
        is_reimbursable: formData.is_reimbursable,
      };

      await createExpense(payload, formData.auto_post);
      setIsCreateModalOpen(false);
      setActionSuccess('Expense recorded successfully!');
      // Reset form
      setFormData({
        title: '',
        category_id: '',
        expense_date: new Date().toISOString().split('T')[0],
        expense_account_id: '',
        payment_account_id: '',
        bank_account_id: '',
        payment_method: 'BANK_TRANSFER',
        subtotal: 0,
        tax_amount: 0,
        merchant_name: '',
        reference_number: '',
        description: '',
        is_reimbursable: false,
        auto_post: false,
      });
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to record expense');
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await actionExpense(id, 'APPROVE');
      setActionSuccess('Expense approved successfully!');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Approval failed');
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Please enter rejection reason:');
    if (reason === null) return;
    try {
      await actionExpense(id, 'REJECT', reason);
      setActionSuccess('Expense rejected.');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Rejection failed');
    }
  };

  const handlePost = async (id: number) => {
    try {
      await postExpense(id);
      setActionSuccess('Expense posted to General Ledger with balanced journal entries!');
      loadData();
    } catch (err: any) {
      setError(err.message || 'GL posting failed');
    }
  };

  const handleReimburseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense || !reimbBankId) return;
    try {
      const selectedBank = bankAccounts.find(b => b.id === Number(reimbBankId));
      await reimburseExpense(selectedExpense.id, {
        payment_account_id: selectedBank?.gl_account_id || 2,
        bank_account_id: Number(reimbBankId),
        reference_number: reimbRef
      });
      setIsReimburseModalOpen(false);
      setSelectedExpense(null);
      setActionSuccess('Reimbursement disbursed and recorded!');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Reimbursement failed');
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-300">Draft</span>;
      case 'SUBMITTED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-300">Submitted</span>;
      case 'APPROVED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-300">Approved</span>;
      case 'POSTED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-300">Posted GL</span>;
      case 'PAID':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300">Reimbursed / Paid</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-300">Rejected</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#390003] text-[#E6B676] rounded-xl shadow-sm border border-[#C58B3E]/30">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Expenses & Claims</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage business operating expenses, GST input tax claims, and maker-checker employee reimbursements
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadData()}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-2 bg-[#390003] hover:bg-[#55080E] text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer border border-[#C58B3E]/40"
          >
            <Plus className="w-4 h-4 text-[#E6B676]" />
            <span>Record Expense</span>
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
          <div className="text-slate-500 text-xs font-medium uppercase tracking-wider">Total Expenses (Month)</div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {formatCurrency(summary?.total_expenses_month || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
            <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
            <span>Operating outflow</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-medium uppercase tracking-wider">Pending Approvals</div>
          <div className="text-2xl font-bold text-amber-600 mt-2">
            {summary?.pending_approvals_count || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Awaiting reviewer sign-off</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-medium uppercase tracking-wider">Reimbursable Outstanding</div>
          <div className="text-2xl font-bold text-blue-600 mt-2">
            {formatCurrency(summary?.reimbursable_claims_total || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
            <UserCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>Payable to employees</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-medium uppercase tracking-wider">Posted to GL</div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">
            {formatCurrency(summary?.posted_expenses_total || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Balanced in General Ledger</span>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search expenses by title, merchant, or expense number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadData()}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#390003]"
            />
          </div>

          <div className="flex items-center space-x-2">
            <select
              aria-label="Category Filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#390003]"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <label className="flex items-center space-x-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={reimbursableOnly}
                onChange={(e) => setReimbursableOnly(e.target.checked)}
                className="rounded border-slate-300 text-[#390003] focus:ring-[#390003]"
              />
              <span>Claims Only</span>
            </label>
          </div>
        </div>

        {/* STATUS TABS */}
        <div className="flex items-center space-x-1 border-t border-slate-100 pt-3 overflow-x-auto">
          {['ALL', 'SUBMITTED', 'APPROVED', 'POSTED', 'PAID', 'DRAFT', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#390003] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st === 'ALL' ? 'All Statuses' : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* EXPENSES TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Expense #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Title & Category</th>
                <th className="py-3 px-4">Merchant</th>
                <th className="py-3 px-4">Submitter</th>
                <th className="py-3 px-4 text-right">Subtotal</th>
                <th className="py-3 px-4 text-right">Tax</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    Loading expenses...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    No expense records found matching criteria.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      {exp.expense_number}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {exp.expense_date}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{exp.title}</div>
                      <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                        <Tag className="w-3 h-3 text-slate-400" />
                        <span>{exp.category_name || 'General Expense'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {exp.merchant_name || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {exp.submitter_name || 'System User'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {formatCurrency(exp.subtotal)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {formatCurrency(exp.tax_amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(exp.total_amount)}
                    </td>
                    <td className="py-3 px-4">
                      {exp.is_reimbursable ? (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-purple-50 text-purple-700 border border-purple-200">
                          Claim
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-600">
                          Direct
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(exp.status)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* APPROVAL BUTTONS */}
                        {exp.status === 'SUBMITTED' && (
                          <>
                            <button
                              onClick={() => handleApprove(exp.id)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-medium transition-colors cursor-pointer"
                              title="Approve claim"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(exp.id)}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-medium transition-colors cursor-pointer"
                              title="Reject claim"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {/* POST TO GL */}
                        {exp.status === 'APPROVED' && (
                          <button
                            onClick={() => handlePost(exp.id)}
                            className="px-2.5 py-1 bg-[#390003] hover:bg-[#55080E] text-[#EEC68B] rounded text-[11px] font-medium transition-colors cursor-pointer border border-[#C58B3E]/30"
                            title="Post to General Ledger"
                          >
                            Post GL
                          </button>
                        )}

                        {/* REIMBURSE DISBURSEMENT */}
                        {exp.status === 'POSTED' && exp.is_reimbursable && (
                          <button
                            onClick={() => {
                              setSelectedExpense(exp);
                              if (bankAccounts.length > 0) setReimbBankId(bankAccounts[0].id);
                              setIsReimburseModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-medium transition-colors cursor-pointer"
                            title="Disburse Reimbursement"
                          >
                            Disburse
                          </button>
                        )}

                        {/* DETAIL MODAL BUTTON */}
                        <button
                          onClick={() => {
                            setSelectedExpense(exp);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                          title="View Accounting Breakdown"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: RECORD NEW EXPENSE */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-[#390003] text-[#E6B676] rounded-lg">
                  <Receipt className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Record Business Expense</h2>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Title / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AWS Cloud Server Hosting September 2026"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#390003]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    aria-label="Expense Category"
                    value={formData.category_id}
                    onChange={(e) => {
                      const catId = Number(e.target.value);
                      const cat = categories.find(c => c.id === catId);
                      setFormData({ 
                        ...formData, 
                        category_id: catId,
                        expense_account_id: cat?.default_account_id || formData.expense_account_id
                      });
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#390003]"
                  >
                    <option value="">Select Category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#390003]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expense GL Account *</label>
                  <select
                    aria-label="Expense GL Account"
                    required
                    value={formData.expense_account_id}
                    onChange={(e) => setFormData({ ...formData, expense_account_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#390003]"
                  >
                    <option value="">Select Expense Account...</option>
                    {glAccounts.filter(a => a.account_type === 'EXPENSE').map((a) => (
                      <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Merchant / Supplier</label>
                  <input
                    type="text"
                    placeholder="e.g. Amazon Web Services, Uber"
                    value={formData.merchant_name}
                    onChange={(e) => setFormData({ ...formData, merchant_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#390003]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subtotal Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formData.subtotal || ''}
                    onChange={(e) => setFormData({ ...formData, subtotal: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#390003]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tax / GST Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.tax_amount || ''}
                    onChange={(e) => setFormData({ ...formData, tax_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#390003]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total (Computed)</label>
                  <div className="w-full px-3 py-2 text-xs font-bold font-mono bg-slate-100 border border-slate-200 rounded-lg text-slate-900">
                    {formatCurrency(Number(formData.subtotal || 0) + Number(formData.tax_amount || 0))}
                  </div>
                </div>
              </div>

              {/* PAYMENT SOURCE & REIMBURSEMENT */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_reimbursable}
                    onChange={(e) => setFormData({ ...formData, is_reimbursable: e.target.checked })}
                    className="rounded border-slate-300 text-[#390003] focus:ring-[#390003]"
                  />
                  <span>Reimbursable Employee Claim (Paid with personal funds)</span>
                </label>

                {!formData.is_reimbursable && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Paid From Bank Account</label>
                      <select
                        aria-label="Paid From Bank Account"
                        value={formData.bank_account_id}
                        onChange={(e) => {
                          const bId = Number(e.target.value);
                          const b = bankAccounts.find(x => x.id === bId);
                          setFormData({ 
                            ...formData, 
                            bank_account_id: bId,
                            payment_account_id: b?.gl_account_id || formData.payment_account_id
                          });
                        }}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#390003]"
                      >
                        <option value="">Select Company Bank Account...</option>
                        {bankAccounts.map((b) => (
                          <option key={b.id} value={b.id}>{b.bank_name} - {b.account_name} ({b.account_number.slice(-4)})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Reference / UTR / Chq #</label>
                      <input
                        type="text"
                        placeholder="e.g. UTR-998124"
                        value={formData.reference_number}
                        onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#390003]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {!formData.is_reimbursable && (
                <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.auto_post}
                    onChange={(e) => setFormData({ ...formData, auto_post: e.target.checked })}
                    className="rounded border-slate-300 text-[#390003] focus:ring-[#390003]"
                  />
                  <span>Post directly to General Ledger upon creation</span>
                </label>
              )}

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#390003] hover:bg-[#55080E] text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer border border-[#C58B3E]/40"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EXPENSE DETAIL & GL BREAKDOWN */}
      {isDetailModalOpen && selectedExpense && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs text-slate-500">{selectedExpense.expense_number}</span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">{selectedExpense.title}</h3>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 my-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg">
                <div>
                  <span className="text-slate-500">Date:</span>
                  <div className="font-medium text-slate-900">{selectedExpense.expense_date}</div>
                </div>
                <div>
                  <span className="text-slate-500">Status:</span>
                  <div className="mt-0.5">{getStatusBadge(selectedExpense.status)}</div>
                </div>
                <div>
                  <span className="text-slate-500">Category:</span>
                  <div className="font-medium text-slate-900">{selectedExpense.category_name || 'General'}</div>
                </div>
                <div>
                  <span className="text-slate-500">Merchant:</span>
                  <div className="font-medium text-slate-900">{selectedExpense.merchant_name || '—'}</div>
                </div>
              </div>

              {/* ACCOUNTING DOUBLE-ENTRY BREAKDOWN */}
              <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                <div className="font-semibold text-slate-800 uppercase tracking-wider text-[10px]">
                  Double-Entry Ledger Posting
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Dr {selectedExpense.expense_account_name || 'Expense Account'}:</span>
                  <span className="font-mono font-medium text-slate-900">{formatCurrency(selectedExpense.subtotal)}</span>
                </div>
                {Number(selectedExpense.tax_amount) > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Dr Input Tax Credit (1400):</span>
                    <span className="font-mono font-medium text-slate-900">{formatCurrency(selectedExpense.tax_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 font-semibold text-slate-900">
                  <span>Cr {selectedExpense.is_reimbursable ? 'Employee Reimbursements Payable (2050)' : (selectedExpense.payment_account_name || 'Bank/Cash Account')}:</span>
                  <span className="font-mono">{formatCurrency(selectedExpense.total_amount)}</span>
                </div>
              </div>

              {selectedExpense.journal_entry_id && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center justify-between text-[11px]">
                  <span>Linked General Ledger Entry ID: #{selectedExpense.journal_entry_id}</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REIMBURSEMENT DISBURSEMENT */}
      {isReimburseModalOpen && selectedExpense && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Disburse Reimbursement</h3>
              <button onClick={() => setIsReimburseModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReimburseSubmit} className="space-y-4 my-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg space-y-1">
                <div className="text-slate-500">Claim to Settle:</div>
                <div className="font-bold text-slate-900">{selectedExpense.title}</div>
                <div className="text-base font-bold text-emerald-700 font-mono">
                  {formatCurrency(selectedExpense.total_amount)}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Disburse From Bank Account *</label>
                <select
                  aria-label="Disburse From Bank Account"
                  required
                  value={reimbBankId}
                  onChange={(e) => setReimbBankId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#390003]"
                >
                  <option value="">Select Bank...</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>{b.bank_name} - {b.account_name} ({formatCurrency(b.current_balance)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Reference / UTR #</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-IMPS-88912"
                  value={reimbRef}
                  onChange={(e) => setReimbRef(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#390003]"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReimburseModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  Confirm Disbursement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
