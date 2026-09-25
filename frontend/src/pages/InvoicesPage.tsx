import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  CreditCard, 
  Printer, 
  X, 
  Trash2, 
  ArrowRight, 
  RefreshCw,
  TrendingUp,
  Building2,
  Calendar,
  Scale,
  FolderKanban,
  Check,
  Sparkles,
  ArrowUpRight,
  QrCode,
  Copy,
  ExternalLink,
  Share2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getInvoices, 
  getCustomers, 
  getProducts, 
  createInvoice, 
  postInvoiceToLedger, 
  recordCustomerPayment,
  getInvoicePaymentLink,
  getEstimates,
  createEstimate,
  convertEstimateToInvoice,
  getSalesOrders,
  createSalesOrder,
  getCreditNotes,
  createCreditNote,
  getRecurringInvoices,
  createRecurringInvoice,
  Invoice, 
  Customer, 
  Product,
  InvoiceCreateData,
  Estimate,
  SalesOrder,
  CreditNote,
  RecurringInvoice
} from '../services/accountingApi';

export const InvoicesPage: React.FC = () => {
  const { activeEntity } = useAuth();
  const [activeTab, setActiveTab] = useState<'invoices' | 'estimates' | 'orders' | 'credit_notes' | 'recurring'>('invoices');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // New Invoice Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [supplyState, setSupplyState] = useState<string>('');
  const [notes, setNotes] = useState<string>('Thank you for your business. Payment is due within the stipulated terms.');
  const [terms, setTerms] = useState<string>('Interest @ 18% p.a. will be charged on all delayed payments.');
  const [lines, setLines] = useState<Array<{
    product_id?: number;
    description: string;
    hsn_sac: string;
    quantity: number;
    unit: string;
    unit_price: number;
    discount_pct: number;
    tax_rate: number;
  }>>([
    { description: '', hsn_sac: '', quantity: 1, unit: 'PCS', unit_price: 0, discount_pct: 0, tax_rate: 18 }
  ]);

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<string>('BANK_TRANSFER');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // Payment Link & UPI QR Modal State
  const [showLinkModal, setShowLinkModal] = useState<boolean>(false);
  const [paymentLinkData, setPaymentLinkData] = useState<{
    invoice_id: number;
    invoice_number: string;
    payment_token: string;
    payment_link: string;
    balance_amount: number;
    currency: string;
    upi_id?: string;
    upi_uri?: string;
    status: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const currencySymbol = activeEntity?.base_currency === 'USD' ? '$' : (activeEntity?.base_currency === 'EUR' ? '€' : (activeEntity?.base_currency === 'GBP' ? '£' : '₹'));

  const fetchData = async () => {
    if (!activeEntity) return;
    setIsLoading(true);
    setError(null);
    try {
      const [invData, custData, prodData, estData, ordData, cnData, recData] = await Promise.all([
        getInvoices(activeEntity.id),
        getCustomers(activeEntity.id),
        getProducts(activeEntity.id),
        getEstimates(activeEntity.id).catch(() => []),
        getSalesOrders(activeEntity.id).catch(() => []),
        getCreditNotes(activeEntity.id).catch(() => []),
        getRecurringInvoices(activeEntity.id).catch(() => [])
      ]);
      setInvoices(invData || []);
      setCustomers(custData || []);
      setProducts(prodData || []);
      setEstimates(estData || []);
      setOrders(ordData || []);
      setCreditNotes(cnData || []);
      setRecurringInvoices(recData || []);
    } catch (err: any) {
      console.error('Failed to load sales data:', err);
      setError(err.message || 'Error loading sales invoices');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeEntity?.id]);

  const handleCustomerChange = (custId: number) => {
    setSelectedCustomerId(custId);
    const cust = customers.find(c => c.id === custId);
    if (cust) {
      if (cust.state) setSupplyState(cust.state);
      const days = cust.payment_terms_days || 30;
      const d = new Date();
      d.setDate(d.getDate() + days);
      setDueDate(d.toISOString().split('T')[0]);
    }
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const updated = [...lines];
    (updated[index] as any)[field] = value;

    if (field === 'product_id' && value) {
      const prod = products.find(p => p.id === Number(value));
      if (prod) {
        updated[index].description = prod.name;
        updated[index].hsn_sac = prod.hsn_sac_code || '';
        updated[index].unit = prod.unit || 'PCS';
        updated[index].unit_price = Number(prod.selling_price) || 0;
        updated[index].tax_rate = Number(prod.tax_rate) || 18;
      }
    }
    setLines(updated);
  };

  const addLine = () => {
    setLines([
      ...lines,
      { description: '', hsn_sac: '', quantity: 1, unit: 'PCS', unit_price: 0, discount_pct: 0, tax_rate: 18 }
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  // Calculations for Create Modal
  const isIntraState = !supplyState || !activeEntity?.city || 
    (supplyState.trim().toLowerCase() === (activeEntity?.city || '').trim().toLowerCase()); // Or state comparison

  const calculateTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    let taxable = 0;
    let totalTax = 0;

    lines.forEach(l => {
      const qty = Number(l.quantity) || 0;
      const price = Number(l.unit_price) || 0;
      const discPct = Number(l.discount_pct) || 0;
      const taxRate = Number(l.tax_rate) || 0;

      const lineGross = qty * price;
      const lineDisc = (lineGross * discPct) / 100;
      const lineTaxable = lineGross - lineDisc;
      const lineTax = (lineTaxable * taxRate) / 100;

      subtotal += lineGross;
      totalDiscount += lineDisc;
      taxable += lineTaxable;
      totalTax += lineTax;
    });

    const grandTotal = taxable + totalTax;
    return {
      subtotal,
      totalDiscount,
      taxable,
      totalTax,
      grandTotal,
      cgst: isIntraState ? totalTax / 2 : 0,
      sgst: isIntraState ? totalTax / 2 : 0,
      igst: !isIntraState ? totalTax : 0
    };
  };

  const totals = calculateTotals();

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntity || !selectedCustomerId) {
      setError('Please select a customer');
      return;
    }

    if (lines.some(l => !l.description.trim() || Number(l.unit_price) <= 0)) {
      setError('Please provide valid descriptions and unit prices for all items');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const payload: InvoiceCreateData = {
        entity_id: activeEntity.id,
        customer_id: Number(selectedCustomerId),
        invoice_date: invoiceDate,
        due_date: dueDate,
        supply_state: supplyState || undefined,
        notes,
        terms,
        lines: lines.map(l => ({
          product_id: l.product_id ? Number(l.product_id) : undefined,
          description: l.description.trim(),
          hsn_sac: l.hsn_sac.trim() || undefined,
          quantity: Number(l.quantity),
          unit: l.unit,
          unit_price: Number(l.unit_price),
          discount_pct: Number(l.discount_pct),
          tax_rate: Number(l.tax_rate)
        }))
      };

      const newInv = await createInvoice(payload);
      setShowCreateModal(false);
      setSuccessMsg(`Invoice #${newInv.invoice_number} generated successfully!`);
      setTimeout(() => setSuccessMsg(null), 5000);
      await fetchData();
    } catch (err: any) {
      console.error('Invoice creation failed:', err);
      setError(err.message || 'Failed to create invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostToLedger = async (invId: number) => {
    if (!window.confirm('Post this invoice to General Ledger? This will lock the invoice and generate double-entry Journal Entries.')) {
      return;
    }
    setIsLoading(true);
    try {
      await postInvoiceToLedger(invId);
      setSuccessMsg('Invoice successfully posted to General Ledger and Accounts Receivable updated.');
      setTimeout(() => setSuccessMsg(null), 5000);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to post invoice to ledger');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvertEstimate = async (estId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      await convertEstimateToInvoice(estId);
      setSuccessMsg('Estimate successfully converted to Tax Invoice!');
      setTimeout(() => setSuccessMsg(null), 5000);
      await fetchData();
      setActiveTab('invoices');
    } catch (err: any) {
      setError(err.message || 'Failed to convert estimate');
    } finally {
      setIsLoading(false);
    }
  };

  const openPaymentModal = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setPaymentAmount(inv.balance_amount.toString());
    setPaymentRef('');
    setPaymentNotes('');
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntity || !selectedInvoice) return;

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0 || amt > selectedInvoice.balance_amount) {
      setError(`Payment amount must be between 0.01 and ${selectedInvoice.balance_amount}`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await recordCustomerPayment({
        entity_id: activeEntity.id,
        customer_id: selectedInvoice.customer_id,
        invoice_id: selectedInvoice.id,
        payment_date: paymentDate,
        amount: amt,
        payment_mode: paymentMode,
        reference_number: paymentRef || undefined,
        notes: paymentNotes || undefined
      });

      setShowPaymentModal(false);
      setSuccessMsg(`Payment of ${currencySymbol}${amt.toFixed(2)} recorded successfully.`);
      setTimeout(() => setSuccessMsg(null), 5000);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to record customer payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPaymentLinkModal = async (inv: Invoice) => {
    try {
      const data = await getInvoicePaymentLink(inv.id);
      setPaymentLinkData(data);
      setShowLinkModal(true);
      setCopiedLink(false);
    } catch (err: any) {
      setError(err.message || 'Failed to generate payment link');
    }
  };

  // Metrics summary
  const totalInvoiced = invoices.reduce((acc, i) => acc + Number(i.total_amount), 0);
  const totalCollected = invoices.reduce((acc, i) => acc + Number(i.paid_amount), 0);
  const totalOutstanding = invoices.reduce((acc, i) => acc + Number(i.balance_amount), 0);
  const overdueCount = invoices.filter(i => i.status === 'OVERDUE' || (new Date(i.due_date) < new Date() && Number(i.balance_amount) > 0)).length;

  // Filtered invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.customer_name && inv.customer_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-300">Draft</span>;
      case 'SENT':
      case 'POSTED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-300">Posted</span>;
      case 'PARTIALLY_PAID':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-300">Partial</span>;
      case 'PAID':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">Paid</span>;
      case 'OVERDUE':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 border border-rose-300">Overdue</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C58B3E]">Sales & Revenue</span>
            <span className="text-slate-400">•</span>
            <span className="text-xs text-slate-500">Accounts Receivable (AR)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Tax Invoices & Billing</h1>
          <p className="text-sm text-slate-600">
            Create GST compliant invoices, track customer receivables, and post directly to the General Ledger.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            title="Refresh Invoices"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-[#260002] hover:bg-[#390003] text-[#EEC68B] font-semibold text-sm rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Tax Invoice</span>
          </button>
        </div>
      </div>

      {/* Sales Lifecycle Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center space-x-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all shrink-0 ${
            activeTab === 'invoices'
              ? 'border-[#781019] text-[#781019]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Tax Invoices ({invoices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('estimates')}
          className={`flex items-center space-x-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all shrink-0 ${
            activeTab === 'estimates'
              ? 'border-[#781019] text-[#781019]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Estimates & Quotes ({estimates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center space-x-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all shrink-0 ${
            activeTab === 'orders'
              ? 'border-[#781019] text-[#781019]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          <span>Sales Orders ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('credit_notes')}
          className={`flex items-center space-x-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all shrink-0 ${
            activeTab === 'credit_notes'
              ? 'border-[#781019] text-[#781019]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Credit Notes ({creditNotes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('recurring')}
          className={`flex items-center space-x-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all shrink-0 ${
            activeTab === 'recurring'
              ? 'border-[#781019] text-[#781019]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Recurring Profiles ({recurringInvoices.length})</span>
        </button>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoiced</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {currencySymbol}{totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-xs text-slate-500">{invoices.length} invoices generated</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Collected</div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">
            {currencySymbol}{totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-xs text-emerald-600 font-medium">
            {totalInvoiced > 0 ? `${((totalCollected / totalInvoiced) * 100).toFixed(1)}% recovery` : '0%'}
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding AR</div>
          <div className="mt-2 text-2xl font-bold text-amber-600">
            {currencySymbol}{totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-xs text-slate-500">Unsettled customer receivables</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue Alerts</div>
          <div className="mt-2 text-2xl font-bold text-rose-600">
            {overdueCount}
          </div>
          <div className="mt-1 text-xs text-rose-600 font-medium">Invoices past payment terms</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search invoice # or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SENT">Posted</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-medium text-slate-700">No invoices found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {searchTerm || statusFilter !== 'ALL'
                          ? 'Try adjusting your search filters'
                          : 'Create your first invoice by clicking "+ New Tax Invoice"'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {inv.customer_name || 'Customer'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {inv.invoice_date}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {inv.due_date}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        {currencySymbol}{Number(inv.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        {Number(inv.balance_amount) > 0 ? (
                          <span className="text-amber-700">
                            {currencySymbol}{Number(inv.balance_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-emerald-700">Settled</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(inv.status)}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        {inv.status === 'DRAFT' && (
                          <button
                            onClick={() => handlePostToLedger(inv.id)}
                            className="px-2.5 py-1 text-xs bg-[#260002] hover:bg-[#390003] text-[#EEC68B] font-medium rounded transition-colors"
                            title="Post to General Ledger"
                          >
                            Post to GL
                          </button>
                        )}
                        {Number(inv.balance_amount) > 0 && inv.status !== 'DRAFT' && (
                          <button
                            onClick={() => openPaymentModal(inv)}
                            className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded transition-colors"
                            title="Record Customer Payment"
                          >
                            Pay
                          </button>
                        )}
                        <button
                          onClick={() => openPaymentLinkModal(inv)}
                          className="p-1 text-amber-600 hover:text-amber-800 rounded hover:bg-amber-50 transition-colors"
                          title="Share Payment Link & UPI QR"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setShowDetailModal(true);
                          }}
                          className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
                          title="View Invoice"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Estimates Table */}
      {activeTab === 'estimates' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Estimate #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4 text-right">Taxable</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {estimates.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-medium text-slate-700">No estimates found</p>
                      <p className="text-xs text-slate-400 mt-1">Quotations created for customers will appear here</p>
                    </td>
                  </tr>
                ) : (
                  estimates.map((est) => (
                    <tr key={est.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">{est.estimate_number}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{est.customer_name || `Customer #${est.customer_id}`}</td>
                      <td className="py-3 px-4 text-slate-600">{est.estimate_date}</td>
                      <td className="py-3 px-4 text-slate-600">{est.expiry_date}</td>
                      <td className="py-3 px-4 text-right font-mono">{currencySymbol}{Number(est.taxable_amount).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{currencySymbol}{Number(est.total_amount).toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          est.status === 'CONVERTED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                          est.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                          'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {est.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {est.status !== 'CONVERTED' ? (
                          <button
                            onClick={() => handleConvertEstimate(est.id)}
                            className="px-3 py-1 text-xs bg-[#390003] hover:bg-[#55080E] text-[#EEC68B] font-bold rounded shadow-xs transition-colors"
                          >
                            Convert to Invoice
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-700 font-semibold flex items-center justify-end space-x-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Converted</span>
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

      {/* Sales Orders Table */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4">Delivery Date</th>
                  <th className="py-3 px-4 text-right">Taxable</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-medium text-slate-700">No sales orders found</p>
                      <p className="text-xs text-slate-400 mt-1">Confirmed customer orders will appear here</p>
                    </td>
                  </tr>
                ) : (
                  orders.map((so) => (
                    <tr key={so.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">{so.so_number}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{so.customer_name || `Customer #${so.customer_id}`}</td>
                      <td className="py-3 px-4 text-slate-600">{so.order_date}</td>
                      <td className="py-3 px-4 text-slate-600">{so.delivery_date || '—'}</td>
                      <td className="py-3 px-4 text-right font-mono">{currencySymbol}{Number(so.taxable_amount).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{currencySymbol}{Number(so.total_amount).toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                          {so.status}
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

      {/* Credit Notes Table */}
      {activeTab === 'credit_notes' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Credit Note #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                  <th className="py-3 px-4 text-right">Tax Adjustment</th>
                  <th className="py-3 px-4 text-right">Total Credit</th>
                  <th className="py-3 px-4 text-center">GL Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {creditNotes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <Scale className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-medium text-slate-700">No credit notes found</p>
                      <p className="text-xs text-slate-400 mt-1">Customer returns and allowances will appear here</p>
                    </td>
                  </tr>
                ) : (
                  creditNotes.map((cn) => (
                    <tr key={cn.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">{cn.credit_note_number}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{cn.customer_name || `Customer #${cn.customer_id}`}</td>
                      <td className="py-3 px-4 text-slate-600">{cn.credit_note_date}</td>
                      <td className="py-3 px-4 text-slate-600">{cn.reason}</td>
                      <td className="py-3 px-4 text-right font-mono">{currencySymbol}{Number(cn.subtotal).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-rose-700 font-semibold">{currencySymbol}{Number(cn.tax_amount).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{currencySymbol}{Number(cn.total_amount).toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          POSTED TO GL
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

      {/* Recurring Invoices Table */}
      {activeTab === 'recurring' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Profile Name</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Frequency</th>
                  <th className="py-3 px-4">Start Date</th>
                  <th className="py-3 px-4">Next Run Date</th>
                  <th className="py-3 px-4 text-right">Amount / Cycle</th>
                  <th className="py-3 px-4 text-center">Auto-Send</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recurringInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-medium text-slate-700">No recurring invoice profiles</p>
                      <p className="text-xs text-slate-400 mt-1">Automated recurring subscription schedules will appear here</p>
                    </td>
                  </tr>
                ) : (
                  recurringInvoices.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">{rec.profile_name}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{rec.customer_name || `Customer #${rec.customer_id}`}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-xs">{rec.frequency}</td>
                      <td className="py-3 px-4 text-slate-600">{rec.start_date}</td>
                      <td className="py-3 px-4 text-slate-900 font-bold">{rec.next_run_date}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{currencySymbol}{Number(rec.total_amount).toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${rec.auto_send ? 'bg-blue-100 text-blue-800' : 'bg-stone-100 text-stone-600'}`}>
                          {rec.auto_send ? 'Enabled' : 'Draft Only'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Active
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

      {/* CREATE INVOICE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8 overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-200 bg-[#1E0002] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-[#EEC68B]" />
                <h3 className="font-bold text-lg">Generate Tax Invoice</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 space-y-6">
              {/* Customer & Header details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Customer *</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerChange(Number(e.target.value))}
                    required
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                  >
                    <option value="">Select Customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.gstin ? `(${c.gstin})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Invoice Date *</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    required
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Due Date *</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                  />
                </div>
              </div>

              {/* Supply State & Tax Mode Notice */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Place of Supply (State)</label>
                  <input
                    type="text"
                    placeholder="e.g. Maharashtra, Karnataka, Delhi"
                    value={supplyState}
                    onChange={(e) => setSupplyState(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                  />
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-700">Tax Determination:</span>
                    <span className="ml-1 text-slate-600">
                      {isIntraState ? 'Intra-State (CGST + SGST applied)' : 'Inter-State (IGST applied)'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EEC68B]/30 text-[#390003] border border-[#C58B3E]/40">
                    GST Ready
                  </span>
                </div>
              </div>

              {/* Dynamic Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Line Items</h4>
                  <button
                    type="button"
                    onClick={addLine}
                    className="text-xs text-[#C58B3E] hover:text-[#390003] font-semibold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                      <tr>
                        <th className="p-2 w-1/3">Item / Description *</th>
                        <th className="p-2 w-20">HSN/SAC</th>
                        <th className="p-2 w-16 text-right">Qty</th>
                        <th className="p-2 w-24 text-right">Rate *</th>
                        <th className="p-2 w-16 text-right">Disc %</th>
                        <th className="p-2 w-20 text-right">GST %</th>
                        <th className="p-2 w-24 text-right">Amount</th>
                        <th className="p-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {lines.map((line, idx) => {
                        const lineSub = (Number(line.quantity) || 0) * (Number(line.unit_price) || 0);
                        const lineDisc = (lineSub * (Number(line.discount_pct) || 0)) / 100;
                        const lineNet = lineSub - lineDisc;
                        const lineTax = (lineNet * (Number(line.tax_rate) || 0)) / 100;
                        const lineTot = lineNet + lineTax;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2">
                              {products.length > 0 && (
                                <select
                                  value={line.product_id || ''}
                                  onChange={(e) => handleLineChange(idx, 'product_id', e.target.value)}
                                  className="w-full text-xs border border-slate-300 rounded p-1 mb-1"
                                >
                                  <option value="">Select from catalog or enter below...</option>
                                  {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({currencySymbol}{p.selling_price})</option>
                                  ))}
                                </select>
                              )}
                              <input
                                type="text"
                                placeholder="Description of service / goods"
                                value={line.description}
                                onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                                required
                                className="w-full text-xs border border-slate-300 rounded p-1"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                placeholder="HSN/SAC"
                                value={line.hsn_sac}
                                onChange={(e) => handleLineChange(idx, 'hsn_sac', e.target.value)}
                                className="w-full text-xs border border-slate-300 rounded p-1 text-center font-mono"
                              />
                            </td>
                            <td className="p-2 text-right">
                              <input
                                type="number"
                                step="any"
                                min="0.01"
                                value={line.quantity}
                                onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                                required
                                className="w-full text-xs border border-slate-300 rounded p-1 text-right"
                              />
                            </td>
                            <td className="p-2 text-right">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={line.unit_price}
                                onChange={(e) => handleLineChange(idx, 'unit_price', e.target.value)}
                                required
                                className="w-full text-xs border border-slate-300 rounded p-1 text-right font-medium"
                              />
                            </td>
                            <td className="p-2 text-right">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                max="100"
                                value={line.discount_pct}
                                onChange={(e) => handleLineChange(idx, 'discount_pct', e.target.value)}
                                className="w-full text-xs border border-slate-300 rounded p-1 text-right"
                              />
                            </td>
                            <td className="p-2 text-right">
                              <select
                                value={line.tax_rate}
                                onChange={(e) => handleLineChange(idx, 'tax_rate', Number(e.target.value))}
                                className="w-full text-xs border border-slate-300 rounded p-1 text-right"
                              >
                                <option value={0}>0%</option>
                                <option value={5}>5%</option>
                                <option value={12}>12%</option>
                                <option value={18}>18%</option>
                                <option value={28}>28%</option>
                              </select>
                            </td>
                            <td className="p-2 text-right font-semibold text-slate-800">
                              {currencySymbol}{lineTot.toFixed(2)}
                            </td>
                            <td className="p-2 text-center">
                              {lines.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeLine(idx)}
                                  className="text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Breakdown & Totals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Notes to Customer</label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Terms & Conditions</label>
                    <textarea
                      rows={2}
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-medium">{currencySymbol}{totals.subtotal.toFixed(2)}</span>
                  </div>
                  {totals.totalDiscount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount:</span>
                      <span className="font-mono font-medium">-{currencySymbol}{totals.totalDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-700 font-medium pt-1 border-t border-slate-200">
                    <span>Taxable Value:</span>
                    <span className="font-mono">{currencySymbol}{totals.taxable.toFixed(2)}</span>
                  </div>
                  {isIntraState ? (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>CGST:</span>
                        <span className="font-mono">{currencySymbol}{totals.cgst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>SGST:</span>
                        <span className="font-mono">{currencySymbol}{totals.sgst.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-600">
                      <span>IGST:</span>
                      <span className="font-mono">{currencySymbol}{totals.igst.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-900 font-bold text-base pt-2 border-t-2 border-slate-300">
                    <span>Grand Total:</span>
                    <span className="font-mono text-[#390003]">{currencySymbol}{totals.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 text-sm font-semibold rounded-lg bg-[#260002] hover:bg-[#390003] text-[#EEC68B] shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Generating...' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-200 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <h3 className="font-bold text-base">Record Payment Receipt</h3>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-emerald-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice:</span>
                  <span className="font-bold font-mono text-slate-800">{selectedInvoice.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-medium text-slate-800">{selectedInvoice.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Invoice Amount:</span>
                  <span className="font-mono text-slate-800">{currencySymbol}{Number(selectedInvoice.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-700 font-semibold pt-1 border-t border-slate-200">
                  <span>Balance Outstanding:</span>
                  <span className="font-mono">{currencySymbol}{Number(selectedInvoice.balance_amount).toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Payment Amount *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">{currencySymbol}</span>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    max={selectedInvoice.balance_amount}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                    className="w-full text-sm font-semibold pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Payment Date *</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Mode *</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">UTR / Transaction Reference</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-88273619283"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Settlement notes..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording...' : 'Record Payment & Post GL'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW / PRINT INVOICE MODAL */}
      {showDetailModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full my-8 overflow-hidden border border-slate-200 print:m-0 print:border-none">
            <div className="p-4 border-b border-slate-200 bg-slate-100 flex items-center justify-between print:hidden">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Tax Invoice Preview</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-700 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / PDF</span>
                </button>
                <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tax Invoice Document Template */}
            <div className="p-8 space-y-6 text-slate-900 bg-white">
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-black tracking-tight text-[#260002]">Ricoz<span className="text-[#C58B3E]">Books</span></span>
                    <span className="text-[10px] uppercase font-bold text-[#C58B3E] px-1.5 py-0.5 rounded bg-slate-100">by ricoz</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-2">{activeEntity?.name}</h2>
                  <p className="text-xs text-slate-500">{activeEntity?.address || 'Corporate Tower, Financial District'}</p>
                  <p className="text-xs text-slate-500">{activeEntity?.city} - {activeEntity?.tax_identifier ? `GSTIN: ${activeEntity.tax_identifier}` : ''}</p>
                </div>

                <div className="text-right">
                  <div className="text-xl font-black uppercase text-slate-900 tracking-wider">TAX INVOICE</div>
                  <div className="font-mono text-sm font-bold text-[#390003] mt-1">#{selectedInvoice.invoice_number}</div>
                  <div className="text-xs text-slate-600 mt-1">Date: <span className="font-medium text-slate-900">{selectedInvoice.invoice_date}</span></div>
                  <div className="text-xs text-slate-600">Due: <span className="font-medium text-slate-900">{selectedInvoice.due_date}</span></div>
                  <div className="mt-2">{getStatusBadge(selectedInvoice.status)}</div>
                </div>
              </div>

              {/* Bill To */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
                <div>
                  <div className="font-bold uppercase tracking-wider text-slate-500 mb-1">Billed To</div>
                  <div className="font-bold text-sm text-slate-900">{selectedInvoice.customer_name}</div>
                  <div className="text-slate-600 mt-0.5">Place of Supply: {selectedInvoice.supply_state || 'Standard'}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold uppercase tracking-wider text-slate-500 mb-1">Payment Status</div>
                  <div className="font-mono text-sm font-bold text-slate-900">
                    Paid: {currencySymbol}{Number(selectedInvoice.paid_amount).toFixed(2)}
                  </div>
                  <div className="font-mono text-sm font-bold text-amber-700">
                    Balance: {currencySymbol}{Number(selectedInvoice.balance_amount).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 font-bold uppercase text-slate-700 bg-slate-100/50">
                    <th className="py-2 text-left">Description</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Rate</th>
                    <th className="py-2 text-right">Taxable</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedInvoice.lines && selectedInvoice.lines.length > 0 ? (
                    selectedInvoice.lines.map((l, i) => (
                      <tr key={i}>
                        <td className="py-2 font-medium">{l.description}</td>
                        <td className="py-2 text-right">{l.quantity} {l.unit}</td>
                        <td className="py-2 text-right font-mono">{currencySymbol}{Number(l.unit_price).toFixed(2)}</td>
                        <td className="py-2 text-right font-mono">{currencySymbol}{Number(l.taxable_amount).toFixed(2)}</td>
                        <td className="py-2 text-right font-mono font-bold">{currencySymbol}{Number(l.total_amount).toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-2 font-medium">Professional Enterprise Services</td>
                      <td className="py-2 text-right">1 LOT</td>
                      <td className="py-2 text-right font-mono">{currencySymbol}{Number(selectedInvoice.taxable_amount).toFixed(2)}</td>
                      <td className="py-2 text-right font-mono">{currencySymbol}{Number(selectedInvoice.taxable_amount).toFixed(2)}</td>
                      <td className="py-2 text-right font-mono font-bold">{currencySymbol}{Number(selectedInvoice.total_amount).toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Summary Totals */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1.5 text-xs border-t-2 border-slate-300 pt-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Amount:</span>
                    <span className="font-mono">{currencySymbol}{Number(selectedInvoice.taxable_amount).toFixed(2)}</span>
                  </div>
                  {Number(selectedInvoice.cgst_amount) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>CGST:</span>
                      <span className="font-mono">{currencySymbol}{Number(selectedInvoice.cgst_amount).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(selectedInvoice.sgst_amount) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>SGST:</span>
                      <span className="font-mono">{currencySymbol}{Number(selectedInvoice.sgst_amount).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(selectedInvoice.igst_amount) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>IGST:</span>
                      <span className="font-mono">{currencySymbol}{Number(selectedInvoice.igst_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-200">
                    <span>Grand Total:</span>
                    <span className="font-mono text-[#390003]">{currencySymbol}{Number(selectedInvoice.total_amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes & Footer */}
              <div className="border-t border-slate-200 pt-4 text-[11px] text-slate-500 space-y-1">
                <p><span className="font-semibold text-slate-700">Notes:</span> {selectedInvoice.notes || 'None'}</p>
                <p><span className="font-semibold text-slate-700">Terms:</span> {selectedInvoice.terms || 'Payment due per agreement.'}</p>
                <p className="text-[10px] text-slate-400 pt-2 text-center">This is a computer-generated tax invoice issued via RicozBooks Enterprise Accounting.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Link & UPI QR Modal */}
      {showLinkModal && paymentLinkData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-[#C58B3E]" />
                  <span>Customer Payment Link & QR</span>
                </h3>
                <p className="text-xs text-slate-500">Invoice #{paymentLinkData.invoice_number}</p>
              </div>
              <button
                onClick={() => setShowLinkModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* UPI QR Display */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm shrink-0">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                    paymentLinkData.upi_uri ||
                    `upi://pay?pa=${paymentLinkData.upi_id || 'ricozbooks@icici'}&pn=RicozBooks&am=${paymentLinkData.balance_amount}&cu=INR&tn=Invoice%20${paymentLinkData.invoice_number}`
                  )}`}
                  alt="UPI QR Code"
                  className="w-32 h-32 object-contain"
                />
              </div>
              <div className="space-y-1.5 text-center sm:text-left">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Scan via UPI App</span>
                <div className="text-xl font-bold text-slate-900">
                  {paymentLinkData.currency} {Number(paymentLinkData.balance_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-slate-500">
                  VPA: <span className="font-mono font-semibold text-slate-700">{paymentLinkData.upi_id || 'ricozbooks@icici'}</span>
                </p>
                <div className="text-[11px] text-emerald-600 font-medium">
                  Instant real-time GL reconciliation upon payment
                </div>
              </div>
            </div>

            {/* Shareable Link */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Customer Checkout URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}${paymentLinkData.payment_link}`}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-700 select-all"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}${paymentLinkData.payment_link}`);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 3000);
                  }}
                  className="px-3 py-2 bg-[#260002] hover:bg-[#390003] text-[#EEC68B] text-xs font-bold rounded-lg shrink-0 flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <a
                href={`${paymentLinkData.payment_link}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#C58B3E] hover:underline"
              >
                <span>Preview Customer Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex items-center space-x-2">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `Hello, here is your payment link for Invoice #${paymentLinkData.invoice_number} (Amount: ${paymentLinkData.currency} ${paymentLinkData.balance_amount}): ${window.location.origin}${paymentLinkData.payment_link}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1"
                >
                  <span>Share WhatsApp</span>
                </a>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
export default InvoicesPage;

