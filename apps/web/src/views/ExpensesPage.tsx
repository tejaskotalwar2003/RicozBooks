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
  Tag,
  Paperclip,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Pagination } from '../components/common/Pagination';
import { 
  getExpenses, 
  getExpensesPaginated,
  getExpenseCategories, 
  createExpense, 
  submitExpense,
  approveExpense,
  rejectExpense,
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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [reimbursableOnly, setReimbursableOnly] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isReimburseModalOpen, setIsReimburseModalOpen] = useState<boolean>(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // New Expense Form State
  const [formData, setFormData] = useState<{
    title: string;
    category_id: string;
    expense_date: string;
    expense_account_id: string;
    payment_account_id: string;
    bank_account_id: string;
    payment_method: string;
    subtotal: number | '';
    gst_rate: number;
    tax_amount: number | '';
    merchant_name: string;
    reference_number: string;
    description: string;
    notes: string;
    receipt_url: string;
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
    subtotal: '',
    gst_rate: 18,
    tax_amount: '',
    merchant_name: '',
    reference_number: '',
    description: '',
    notes: '',
    receipt_url: '',
    is_reimbursable: false,
    auto_post: false,
  });

  // Reimbursement Modal Form State
  const [reimbBankId, setReimbBankId] = useState<string>('');
  const [reimbRef, setReimbRef] = useState<string>('');

  const loadData = async (page: number = currentPage, size: number = pageSize) => {
    if (!activeEntity?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [expData, catData, bankData, sumData, accData] = await Promise.all([
        getExpensesPaginated(activeEntity.id, {
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          category_id: selectedCategory === 'ALL' ? undefined : selectedCategory,
          is_reimbursable: reimbursableOnly ? true : undefined,
          search: searchTerm.trim() || undefined
        }, page, size),
        getExpenseCategories(activeEntity.id),
        getBankAccounts(activeEntity.id as any),
        getExpenseSummary(activeEntity.id),
        getAccounts(activeEntity.id as any)
      ]);

      const itemsList = expData?.items ? expData.items : (Array.isArray(expData) ? expData : []);
      setExpenses(itemsList);
      setTotalRecords(expData?.total ?? itemsList.length);
      setTotalPages(expData?.total_pages ?? (Math.ceil(itemsList.length / size) || 1));
      setCategories(catData || []);
      setBankAccounts(bankData || []);
      setSummary(sumData || null);
      setGlAccounts(accData || []);
    } catch (err: any) {
      console.error('Failed to load expenses data:', err);
      setError(err.message || 'Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    loadData(1, pageSize);
  }, [activeEntity?.id, statusFilter, selectedCategory, reimbursableOnly, searchTerm]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    loadData(newPage, pageSize);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
    loadData(1, newSize);
  };

  // Dynamic calculation of tax and total
  const handleSubtotalChange = (val: number | '') => {
    const sub = val === '' ? '' : Math.max(0, val);
    const tax = sub === '' ? '' : Math.round((Number(sub) * (formData.gst_rate / 100)) * 100) / 100;
    setFormData(prev => ({
      ...prev,
      subtotal: sub,
      tax_amount: tax
    }));
  };

  const handleGstRateChange = (rate: number) => {
    const tax = formData.subtotal === '' ? '' : Math.round((Number(formData.subtotal) * (rate / 100)) * 100) / 100;
    setFormData(prev => ({
      ...prev,
      gst_rate: rate,
      tax_amount: tax
    }));
  };

  const handleCategorySelect = (catId: string) => {
    const cat = categories.find(c => String(c.id || (c as any)._id) === catId);
    let defaultAccId = formData.expense_account_id;
    let rate = formData.gst_rate;

    if (cat) {
      if (cat.default_account_id) {
        defaultAccId = String(cat.default_account_id);
      }
      if (cat.tax_rate_percent !== undefined) {
        rate = Number(cat.tax_rate_percent);
      }
    }

    const tax = formData.subtotal === '' ? '' : Math.round((Number(formData.subtotal) * (rate / 100)) * 100) / 100;
    setFormData(prev => ({
      ...prev,
      category_id: catId,
      expense_account_id: defaultAccId,
      gst_rate: rate,
      tax_amount: tax
    }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntity?.id) return;
    setError(null);

    // Validate
    if (!formData.title.trim()) {
      setError('Expense Title / Description is required');
      return;
    }
    if (!formData.expense_account_id) {
      setError('Please select an Expense GL Account');
      return;
    }
    const subtotalNum = Number(formData.subtotal || 0);
    if (subtotalNum <= 0) {
      setError('Expense subtotal must be greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const taxAmountNum = Number(formData.tax_amount || 0);
      const payload: ExpenseCreateData = {
        entity_id: activeEntity.id,
        title: formData.title.trim(),
        category_id: formData.category_id || undefined,
        expense_date: formData.expense_date,
        expense_account_id: formData.expense_account_id,
        payment_account_id: formData.payment_account_id || undefined,
        bank_account_id: formData.bank_account_id || undefined,
        payment_method: formData.payment_method,
        subtotal: subtotalNum,
        tax_amount: taxAmountNum,
        gst_rate: formData.gst_rate,
        currency: activeEntity.base_currency || 'INR',
        merchant_name: formData.merchant_name.trim() || undefined,
        reference_number: formData.reference_number.trim() || undefined,
        description: formData.description.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        receipt_url: formData.receipt_url.trim() || undefined,
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
        subtotal: '',
        gst_rate: 18,
        tax_amount: '',
        merchant_name: '',
        reference_number: '',
        description: '',
        notes: '',
        receipt_url: '',
        is_reimbursable: false,
        auto_post: false,
      });
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to record expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitDraft = async (id: number | string) => {
    try {
      await submitExpense(id);
      setActionSuccess('Expense claim submitted for review!');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit expense');
    }
  };

  const handleApprove = async (id: number | string) => {
    try {
      await approveExpense(id);
      setActionSuccess('Expense approved successfully!');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Approval failed');
    }
  };

  const handleReject = async (id: number | string) => {
    const reason = prompt('Please enter rejection reason:');
    if (reason === null) return;
    try {
      await rejectExpense(id, reason);
      setActionSuccess('Expense rejected.');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Rejection failed');
    }
  };

  const handlePost = async (id: number | string) => {
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
      const selectedBank = bankAccounts.find(b => String(b.id || (b as any)._id) === reimbBankId);
      await reimburseExpense(selectedExpense.id || (selectedExpense as any)._id, {
        payment_account_id: (selectedBank?.gl_account_id ? String(selectedBank.gl_account_id) : '') || reimbBankId,
        bank_account_id: reimbBankId,
        reference_number: reimbRef
      });
      setIsReimburseModalOpen(false);
      setSelectedExpense(null);
      setActionSuccess('Reimbursement disbursed and recorded in General Ledger!');
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

  const computedTotal = Number(formData.subtotal || 0) + Number(formData.tax_amount || 0);

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
                Manage business operating expenses, GST input tax credits, and maker-checker employee reimbursements
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
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setError(null);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center space-x-2 bg-[#390003] hover:bg-[#55080E] text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer border border-[#C58B3E]/40"
          >
            <Plus className="w-4 h-4 text-[#E6B676]" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK ALERTS */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-800 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
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
            {summary?.pending_approvals_count ?? 0}
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
                <option key={String(c.id || (c as any)._id)} value={String(c.id || (c as any)._id)}>
                  {c.name}
                </option>
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
                <th className="py-3 px-4 text-right">Tax (GST)</th>
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
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">No expense records found</p>
                    <p className="text-[11px] text-slate-400 mt-1">Click &quot;Record Expense&quot; above to create your first business expense or claim.</p>
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => {
                  const expId = String(exp.id || (exp as any)._id);
                  return (
                    <tr key={expId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">
                        {exp.expense_number}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {exp.expense_date ? String(exp.expense_date).split('T')[0] : '—'}
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
                          {/* SUBMIT DRAFT */}
                          {exp.status === 'DRAFT' && (
                            <button
                              onClick={() => handleSubmitDraft(expId)}
                              className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-medium transition-colors cursor-pointer"
                              title="Submit for Approval"
                            >
                              Submit
                            </button>
                          )}

                          {/* APPROVAL BUTTONS */}
                          {exp.status === 'SUBMITTED' && (
                            <>
                              <button
                                onClick={() => handleApprove(expId)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-medium transition-colors cursor-pointer"
                                title="Approve claim"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(expId)}
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
                              onClick={() => handlePost(expId)}
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
                                if (bankAccounts.length > 0) {
                                  setReimbBankId(String(bankAccounts[0].id || (bankAccounts[0] as any)._id));
                                }
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={currentPage}
          pageSize={pageSize}
          total={totalRecords}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          isLoading={isLoading}
        />
      </div>

      {/* MODAL 1: RECORD NEW EXPENSE */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-[#390003] text-[#E6B676] rounded-lg">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Record Business Expense</h2>
                  <p className="text-[11px] text-slate-500">Record operating cost, calculate GST, and post to General Ledger</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100"
              >
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Category</label>
                  <select
                    aria-label="Expense Category"
                    value={formData.category_id}
                    onChange={(e) => handleCategorySelect(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#390003]"
                  >
                    <option value="">Select Category...</option>
                    {categories.map((c) => {
                      const catId = String(c.id || (c as any)._id);
                      return (
                        <option key={catId} value={catId}>{c.name}</option>
                      );
                    })}
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
                    onChange={(e) => setFormData({ ...formData, expense_account_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#390003]"
                  >
                    <option value="">Select Expense Account...</option>
                    {glAccounts.filter(a => a.account_type === 'EXPENSE').map((a) => {
                      const accId = String(a.id || (a as any)._id);
                      return (
                        <option key={accId} value={accId}>{a.code} - {a.name}</option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Merchant / Supplier</label>
                  <input
                    type="text"
                    placeholder="e.g. Amazon Web Services, Uber, TCS"
                    value={formData.merchant_name}
                    onChange={(e) => setFormData({ ...formData, merchant_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#390003]"
                  />
                </div>
              </div>

              {/* FINANCIAL AMOUNTS & GST */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="font-semibold text-slate-800 text-xs">Financial Details & GST Tax Calculation</div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Subtotal Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={formData.subtotal}
                      onChange={(e) => handleSubtotalChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#390003] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">GST Rate (%)</label>
                    <select
                      value={formData.gst_rate}
                      onChange={(e) => handleGstRateChange(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#390003]"
                    >
                      <option value={0}>0% (Exempt / Nil)</option>
                      <option value={5}>5% (Concessional)</option>
                      <option value={12}>12% (Standard Lower)</option>
                      <option value={18}>18% (Standard Services)</option>
                      <option value={28}>28% (Luxury / Higher)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Tax Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.tax_amount}
                      onChange={(e) => setFormData({ ...formData, tax_amount: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#390003] font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 text-xs">
                  <div className="text-slate-500">
                    {Number(formData.tax_amount || 0) > 0 ? (
                      <span>CGST: {formatCurrency(Number(formData.tax_amount || 0) / 2)} • SGST: {formatCurrency(Number(formData.tax_amount || 0) / 2)}</span>
                    ) : (
                      <span>Zero Tax / Exempt</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-600 font-semibold">Total Payable:</span>
                    <span className="font-mono font-bold text-sm text-[#390003]">
                      {formatCurrency(computedTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* PAYMENT SOURCE & REIMBURSEMENT */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_reimbursable}
                    onChange={(e) => setFormData({ ...formData, is_reimbursable: e.target.checked })}
                    className="rounded border-slate-300 text-[#390003] focus:ring-[#390003]"
                  />
                  <span>Reimbursable Employee Claim (Paid with personal funds)</span>
                </label>

                {!formData.is_reimbursable ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Paid From Bank Account</label>
                      <select
                        aria-label="Paid From Bank Account"
                        value={formData.bank_account_id}
                        onChange={(e) => {
                          const bId = e.target.value;
                          const b = bankAccounts.find(x => String(x.id || (x as any)._id) === bId);
                          const glId = (b?.gl_account_id ? String(b.gl_account_id) : '') || formData.payment_account_id;
                          setFormData({ 
                            ...formData, 
                            bank_account_id: bId,
                            payment_account_id: glId
                          });
                        }}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#390003]"
                      >
                        <option value="">Select Company Bank Account...</option>
                        {bankAccounts.map((b) => {
                          const bId = String(b.id || (b as any)._id);
                          const last4 = b.account_number ? String(b.account_number).slice(-4) : 'N/A';
                          return (
                            <option key={bId} value={bId}>{b.bank_name} - {b.account_name} ({last4})</option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Reference / UTR / Chq #</label>
                      <input
                        type="text"
                        placeholder="e.g. UTR-998124 or INV-4402"
                        value={formData.reference_number}
                        onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#390003]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-purple-700 bg-purple-50 p-2.5 rounded-lg border border-purple-200">
                    ℹ️ This claim will be routed for Maker-Checker approval and credited to <strong>Employee Reimbursements Payable (2150)</strong> upon review.
                  </div>
                )}
              </div>

              {/* ADDITIONAL NOTES & RECEIPT URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Internal Remarks</label>
                  <input
                    type="text"
                    placeholder="e.g. Approved by Project Manager"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#390003]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Attachment URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData.receipt_url}
                    onChange={(e) => setFormData({ ...formData, receipt_url: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#390003]"
                  />
                </div>
              </div>

              {!formData.is_reimbursable && (
                <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formData.auto_post}
                    onChange={(e) => setFormData({ ...formData, auto_post: e.target.checked })}
                    className="rounded border-slate-300 text-[#390003] focus:ring-[#390003]"
                  />
                  <span>Post directly to General Ledger upon creation (Dr Expense, Cr Bank)</span>
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
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#390003] hover:bg-[#55080E] disabled:bg-slate-400 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer border border-[#C58B3E]/40 flex items-center space-x-1.5"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmitting ? 'Saving...' : 'Save Expense'}</span>
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
                  <div className="font-medium text-slate-900">
                    {selectedExpense.expense_date ? String(selectedExpense.expense_date).split('T')[0] : '—'}
                  </div>
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
                <div>
                  <span className="text-slate-500">Reference:</span>
                  <div className="font-medium text-slate-900">{selectedExpense.reference_number || '—'}</div>
                </div>
                <div>
                  <span className="text-slate-500">Submitter:</span>
                  <div className="font-medium text-slate-900">{selectedExpense.submitter_name || 'System User'}</div>
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
                  <span>Cr {selectedExpense.is_reimbursable ? 'Employee Reimbursements Payable (2150)' : (selectedExpense.payment_account_name || 'Operating Bank / Cash Account')}:</span>
                  <span className="font-mono">{formatCurrency(selectedExpense.total_amount)}</span>
                </div>
              </div>

              {selectedExpense.journal_entry_id && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center justify-between text-[11px]">
                  <span>Linked General Ledger Entry ID: #{String(selectedExpense.journal_entry_id)}</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
              )}

              {selectedExpense.reimbursement_journal_id && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 flex items-center justify-between text-[11px]">
                  <span>Disbursement Settlement Journal ID: #{String(selectedExpense.reimbursement_journal_id)}</span>
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
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
                  onChange={(e) => setReimbBankId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#390003]"
                >
                  <option value="">Select Bank...</option>
                  {bankAccounts.map((b) => {
                    const bId = String(b.id || (b as any)._id);
                    return (
                      <option key={bId} value={bId}>
                        {b.bank_name} - {b.account_name} ({formatCurrency(b.current_balance)})
                      </option>
                    );
                  })}
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
