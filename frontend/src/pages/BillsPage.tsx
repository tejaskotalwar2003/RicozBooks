import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
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
  TrendingDown,
  Building2,
  Calendar,
  FolderKanban,
  Scale
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Pagination } from '../components/common/Pagination';
import { 
  getBills, 
  getBillsPaginated,
  getVendors, 
  getProducts, 
  createBill, 
  postBillToLedger, 
  recordVendorPayment,
  getPurchaseOrders,
  convertPoToBill,
  getDebitNotes,
  Bill, 
  Vendor, 
  Product,
  BillCreateData,
  PurchaseOrder,
  DebitNote
} from '../services/accountingApi';

export const BillsPage: React.FC = () => {
  const { activeEntity } = useAuth();
  const [activeTab, setActiveTab] = useState<'bills' | 'orders' | 'debit_notes'>('bills');
  const [bills, setBills] = useState<Bill[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [debitNotes, setDebitNotes] = useState<DebitNote[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [allBillsSummary, setAllBillsSummary] = useState<Bill[]>([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // New Bill Form State
  const [selectedVendorId, setSelectedVendorId] = useState<number | ''>('');
  const [vendorInvoiceRef, setVendorInvoiceRef] = useState<string>('');
  const [billDate, setBillDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [supplyState, setSupplyState] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [terms, setTerms] = useState<string>('');
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

  const currencySymbol = activeEntity?.base_currency === 'USD' ? '$' : (activeEntity?.base_currency === 'EUR' ? '€' : (activeEntity?.base_currency === 'GBP' ? '£' : '₹'));

  const fetchData = async (page: number = currentPage, size: number = pageSize) => {
    if (!activeEntity) return;
    setIsLoading(true);
    setError(null);
    try {
      const [allB, pagB, vendorsData, prodsData, poData, dnData] = await Promise.all([
        getBills(activeEntity.id),
        getBillsPaginated(
          activeEntity.id,
          undefined,
          statusFilter !== 'ALL' ? statusFilter : undefined,
          searchTerm.trim() || undefined,
          page,
          size
        ),
        getVendors(activeEntity.id),
        getProducts(activeEntity.id),
        getPurchaseOrders(activeEntity.id).catch(() => []),
        getDebitNotes(activeEntity.id).catch(() => [])
      ]);
      setAllBillsSummary(allB || []);
      setBills(pagB.items || []);
      setTotalRecords(pagB.total);
      setTotalPages(pagB.total_pages);
      setVendors(vendorsData || []);
      setProducts(prodsData || []);
      setPurchaseOrders(poData || []);
      setDebitNotes(dnData || []);
    } catch (err: any) {
      console.error('Failed to load procurement data:', err);
      setError(err.message || 'Error loading procurement data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchData(1, pageSize);
  }, [activeEntity?.id, searchTerm, statusFilter]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchData(newPage, pageSize);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
    fetchData(1, newSize);
  };

  const handleConvertPoToBill = async (poId: number) => {
    if (!window.confirm('Convert this Purchase Order into a Vendor Bill?')) return;
    setIsLoading(true);
    try {
      const newBill = await convertPoToBill(poId);
      setSuccessMsg(`Purchase Order converted to Vendor Bill #${newBill.bill_number} successfully!`);
      setTimeout(() => setSuccessMsg(null), 5000);
      setActiveTab('bills');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to convert Purchase Order');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVendorChange = (venId: number) => {
    setSelectedVendorId(venId);
    const ven = vendors.find(v => v.id === venId);
    if (ven) {
      if (ven.state) setSupplyState(ven.state);
      const days = ven.payment_terms_days || 30;
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
        updated[index].unit_price = Number(prod.purchase_price || prod.selling_price) || 0;
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

  // Intra-state determination
  const isIntraState = !supplyState || !activeEntity?.city || 
    (supplyState.trim().toLowerCase() === (activeEntity?.city || '').trim().toLowerCase());

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

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntity || !selectedVendorId) {
      setError('Please select a vendor');
      return;
    }

    if (lines.some(l => !l.description.trim() || Number(l.unit_price) <= 0)) {
      setError('Please provide valid descriptions and unit prices for all items');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const payload: BillCreateData = {
        entity_id: activeEntity.id,
        vendor_id: Number(selectedVendorId),
        vendor_invoice_ref: vendorInvoiceRef.trim() || undefined,
        bill_date: billDate,
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

      const newBill = await createBill(payload);
      setShowCreateModal(false);
      setSuccessMsg(`Vendor Bill #${newBill.bill_number} entered successfully!`);
      setTimeout(() => setSuccessMsg(null), 5000);
      await fetchData();
    } catch (err: any) {
      console.error('Bill creation failed:', err);
      setError(err.message || 'Failed to create vendor bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostToLedger = async (billId: number) => {
    if (!window.confirm('Post this bill to General Ledger? This will recognize the expense, record GST Input Tax Credit (ITC), and credit Accounts Payable.')) {
      return;
    }
    setIsLoading(true);
    try {
      await postBillToLedger(billId);
      setSuccessMsg('Bill successfully posted to General Ledger and Accounts Payable updated.');
      setTimeout(() => setSuccessMsg(null), 5000);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to post bill to ledger');
    } finally {
      setIsLoading(false);
    }
  };

  const openPaymentModal = (bill: Bill) => {
    setSelectedBill(bill);
    setPaymentAmount(bill.balance_amount.toString());
    setPaymentRef('');
    setPaymentNotes('');
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntity || !selectedBill) return;

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0 || amt > selectedBill.balance_amount) {
      setError(`Payment amount must be between 0.01 and ${selectedBill.balance_amount}`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await recordVendorPayment({
        entity_id: activeEntity.id,
        vendor_id: selectedBill.vendor_id,
        bill_id: selectedBill.id,
        payment_date: paymentDate,
        amount: amt,
        payment_mode: paymentMode,
        reference_number: paymentRef || undefined,
        notes: paymentNotes || undefined
      });

      setShowPaymentModal(false);
      setSuccessMsg(`Disbursement of ${currencySymbol}${amt.toFixed(2)} recorded successfully.`);
      setTimeout(() => setSuccessMsg(null), 5000);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to record vendor payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics summary
  const totalBilled = allBillsSummary.reduce((acc, b) => acc + Number(b.total_amount), 0);
  const totalPaid = allBillsSummary.reduce((acc, b) => acc + Number(b.paid_amount), 0);
  const totalOutstanding = allBillsSummary.reduce((acc, b) => acc + Number(b.balance_amount), 0);
  const overdueCount = allBillsSummary.filter(b => b.status === 'OVERDUE' || (new Date(b.due_date) < new Date() && Number(b.balance_amount) > 0)).length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-300">Draft</span>;
      case 'POSTED':
      case 'RECEIVED':
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
            <span className="text-xs font-bold uppercase tracking-wider text-[#C58B3E]">Purchases & Procurement</span>
            <span className="text-slate-400">•</span>
            <span className="text-xs text-slate-500">Accounts Payable (AP)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Vendor Bills & Expenses</h1>
          <p className="text-sm text-slate-600">
            Record vendor invoices, track Input Tax Credit (ITC), manage payables, and disburse settlements.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchData()}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            title="Refresh Bills"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-[#260002] hover:bg-[#390003] text-[#EEC68B] font-semibold text-sm rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Enter Vendor Bill</span>
          </button>
        </div>
      </div>

      {/* Sub-Module Navigation Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-200 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('bills')}
          className={`flex items-center space-x-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all shrink-0 ${
            activeTab === 'bills'
              ? 'border-[#781019] text-[#781019]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Vendor Bills ({allBillsSummary.length})</span>
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
          <span>Purchase Orders ({purchaseOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('debit_notes')}
          className={`flex items-center space-x-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all shrink-0 ${
            activeTab === 'debit_notes'
              ? 'border-[#781019] text-[#781019]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Debit Notes ({debitNotes.length})</span>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Purchases</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {currencySymbol}{totalBilled.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-xs text-slate-500">{allBillsSummary.length} vendor bills recorded</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Disbursed</div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">
            {currencySymbol}{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-xs text-emerald-600 font-medium">
            {totalBilled > 0 ? `${((totalPaid / totalBilled) * 100).toFixed(1)}% settled` : '0%'}
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding AP</div>
          <div className="mt-2 text-2xl font-bold text-amber-600">
            {currencySymbol}{totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-xs text-slate-500">Unsettled vendor payables</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue Alerts</div>
          <div className="mt-2 text-2xl font-bold text-rose-600">
            {overdueCount}
          </div>
          <div className="mt-1 text-xs text-rose-600 font-medium">Bills past payment terms</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search bill #, vendor, or invoice ref..."
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
            <option value="POSTED">Posted</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </div>
      </div>

      {/* Bills Table */}
      {activeTab === 'bills' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Bill #</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Vendor Ref</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {bills.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-medium text-slate-700">No vendor bills found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {searchTerm || statusFilter !== 'ALL'
                          ? 'Try adjusting your search filters'
                          : 'Record your first purchase bill by clicking "+ Enter Vendor Bill"'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  bills.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {b.bill_number}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {b.vendor_name || 'Vendor'}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-600">
                        {b.vendor_invoice_ref || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {b.bill_date}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {b.due_date}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        {currencySymbol}{Number(b.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        {Number(b.balance_amount) > 0 ? (
                          <span className="text-amber-700">
                            {currencySymbol}{Number(b.balance_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-emerald-700">Settled</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(b.status)}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        {b.status === 'DRAFT' && (
                          <button
                            onClick={() => handlePostToLedger(b.id)}
                            className="px-2.5 py-1 text-xs bg-[#260002] hover:bg-[#390003] text-[#EEC68B] font-medium rounded transition-colors"
                            title="Post to General Ledger"
                          >
                            Post to GL
                          </button>
                        )}
                        {Number(b.balance_amount) > 0 && b.status !== 'DRAFT' && (
                          <button
                            onClick={() => openPaymentModal(b)}
                            className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded transition-colors"
                            title="Disburse Payment"
                          >
                            Pay
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedBill(b);
                            setShowDetailModal(true);
                          }}
                          className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
                          title="View Bill Details"
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
          <Pagination
            page={currentPage}
            pageSize={pageSize}
            totalRecords={totalRecords}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}

      {/* Purchase Orders Table */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">PO #</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4">Delivery Date</th>
                  <th className="py-3 px-4 text-right">Taxable</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-medium text-slate-700">No purchase orders found</p>
                      <p className="text-xs text-slate-400 mt-1">Purchase orders issued to vendors will appear here</p>
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">{po.po_number}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{po.vendor_name || `Vendor #${po.vendor_id}`}</td>
                      <td className="py-3 px-4 text-slate-600">{po.order_date}</td>
                      <td className="py-3 px-4 text-slate-600">{po.delivery_date || '—'}</td>
                      <td className="py-3 px-4 text-right font-mono">{currencySymbol}{Number(po.taxable_amount).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{currencySymbol}{Number(po.total_amount).toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          po.status === 'CONVERTED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                          po.status === 'ISSUED' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                          'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {po.status !== 'CONVERTED' ? (
                          <button
                            onClick={() => handleConvertPoToBill(po.id)}
                            className="px-3 py-1 text-xs bg-[#390003] hover:bg-[#55080E] text-[#EEC68B] font-bold rounded shadow-xs transition-colors"
                          >
                            Convert to Bill
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-700 font-semibold flex items-center justify-end space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
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

      {/* Debit Notes Table */}
      {activeTab === 'debit_notes' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Debit Note #</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Vendor Bill Ref</th>
                  <th className="py-3 px-4">Note Date</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 text-right">Debit Adjustment</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {debitNotes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <Scale className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-medium text-slate-700">No debit notes recorded</p>
                      <p className="text-xs text-slate-400 mt-1">Debit notes issued against vendor bills or purchase returns will show here</p>
                    </td>
                  </tr>
                ) : (
                  debitNotes.map((dn) => (
                    <tr key={dn.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">{dn.note_number}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{dn.vendor_name || `Vendor #${dn.vendor_id}`}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">{dn.bill_number ? `#${dn.bill_number}` : '—'}</td>
                      <td className="py-3 px-4 text-slate-600">{dn.note_date}</td>
                      <td className="py-3 px-4 text-slate-700">{dn.reason}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                        -{currencySymbol}{Number(dn.amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          POSTED TO AP
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

      {/* ENTER VENDOR BILL MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8 overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-200 bg-[#1E0002] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-[#EEC68B]" />
                <h3 className="font-bold text-lg">Enter Vendor Bill</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBill} className="p-6 space-y-6">
              {/* Vendor & Header Details */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Vendor *</label>
                  <select
                    value={selectedVendorId}
                    onChange={(e) => handleVendorChange(Number(e.target.value))}
                    required
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                  >
                    <option value="">Select Vendor...</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} {v.gstin ? `(${v.gstin})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Vendor Ref / Invoice #</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-991823"
                    value={vendorInvoiceRef}
                    onChange={(e) => setVendorInvoiceRef(e.target.value)}
                    className="w-full text-sm font-mono border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Bill Date *</label>
                  <input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
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

              {/* Supply State & Input Tax Credit Note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Vendor State (Place of Supply)</label>
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
                    <span className="font-semibold text-slate-700">Input Tax Credit (ITC):</span>
                    <span className="ml-1 text-slate-600">
                      {isIntraState ? 'Intra-State (Input CGST + Input SGST Credit)' : 'Inter-State (Input IGST Credit)'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Eligible ITC
                  </span>
                </div>
              </div>

              {/* Dynamic Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Purchase Items & Expenses</h4>
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
                                  <option value="">Select item from catalog or type below...</option>
                                  {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                              )}
                              <input
                                type="text"
                                placeholder="Description of goods or service"
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
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Internal Notes</label>
                    <textarea
                      rows={2}
                      placeholder="Purchase order or delivery notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Payment Terms</label>
                    <textarea
                      rows={2}
                      placeholder="Vendor payment conditions..."
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
                    <span>Taxable Expense Value:</span>
                    <span className="font-mono">{currencySymbol}{totals.taxable.toFixed(2)}</span>
                  </div>
                  {isIntraState ? (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>Input CGST Credit:</span>
                        <span className="font-mono text-emerald-700">+{currencySymbol}{totals.cgst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Input SGST Credit:</span>
                        <span className="font-mono text-emerald-700">+{currencySymbol}{totals.sgst.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-600">
                      <span>Input IGST Credit:</span>
                      <span className="font-mono text-emerald-700">+{currencySymbol}{totals.igst.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-900 font-bold text-base pt-2 border-t-2 border-slate-300">
                    <span>Total Bill Payable:</span>
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
                  {isSubmitting ? 'Recording...' : 'Enter Vendor Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT / DISBURSEMENT MODAL */}
      {showPaymentModal && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-200 bg-[#260002] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-[#EEC68B]" />
                <h3 className="font-bold text-base">Disburse Vendor Settlement</h3>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Bill #:</span>
                  <span className="font-bold font-mono text-slate-800">{selectedBill.bill_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payable To:</span>
                  <span className="font-medium text-slate-800">{selectedBill.vendor_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Bill Amount:</span>
                  <span className="font-mono text-slate-800">{currencySymbol}{Number(selectedBill.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-700 font-semibold pt-1 border-t border-slate-200">
                  <span>Balance Payable:</span>
                  <span className="font-mono">{currencySymbol}{Number(selectedBill.balance_amount).toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Disbursement Amount *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">{currencySymbol}</span>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    max={selectedBill.balance_amount}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                    className="w-full text-sm font-semibold pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
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
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Payment Mode *</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CHEQUE">Corporate Cheque</option>
                    <option value="CASH">Cash</option>
                    <option value="CREDIT_CARD">Corporate Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">UTR / Cheque Reference #</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-99182736412"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Settlement Notes</label>
                <textarea
                  rows={2}
                  placeholder="Payment confirmation notes..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
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
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#260002] hover:bg-[#390003] text-[#EEC68B] shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording...' : 'Disburse & Settle Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW BILL DETAILS MODAL */}
      {showDetailModal && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full my-8 overflow-hidden border border-slate-200 print:m-0 print:border-none">
            <div className="p-4 border-b border-slate-200 bg-slate-100 flex items-center justify-between print:hidden">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Vendor Bill Preview</span>
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

            <div className="p-8 space-y-6 text-slate-900 bg-white">
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-black tracking-tight text-[#260002]">Ricoz<span className="text-[#C58B3E]">Books</span></span>
                    <span className="text-[10px] uppercase font-bold text-[#C58B3E] px-1.5 py-0.5 rounded bg-slate-100">by ricoz</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-2">{activeEntity?.name}</h2>
                  <p className="text-xs text-slate-500">{activeEntity?.city} - {activeEntity?.tax_identifier ? `GSTIN: ${activeEntity.tax_identifier}` : ''}</p>
                </div>

                <div className="text-right">
                  <div className="text-xl font-black uppercase text-slate-900 tracking-wider">VENDOR BILL</div>
                  <div className="font-mono text-sm font-bold text-[#390003] mt-1">#{selectedBill.bill_number}</div>
                  {selectedBill.vendor_invoice_ref && (
                    <div className="text-xs text-slate-600 mt-0.5 font-mono">Ref: {selectedBill.vendor_invoice_ref}</div>
                  )}
                  <div className="text-xs text-slate-600 mt-1">Date: <span className="font-medium text-slate-900">{selectedBill.bill_date}</span></div>
                  <div className="text-xs text-slate-600">Due: <span className="font-medium text-slate-900">{selectedBill.due_date}</span></div>
                  <div className="mt-2">{getStatusBadge(selectedBill.status)}</div>
                </div>
              </div>

              {/* Vendor & AP info */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
                <div>
                  <div className="font-bold uppercase tracking-wider text-slate-500 mb-1">Vendor Details</div>
                  <div className="font-bold text-sm text-slate-900">{selectedBill.vendor_name}</div>
                  <div className="text-slate-600 mt-0.5">Supply State: {selectedBill.supply_state || 'Standard'}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold uppercase tracking-wider text-slate-500 mb-1">Payable Summary</div>
                  <div className="font-mono text-sm font-bold text-slate-900">
                    Paid: {currencySymbol}{Number(selectedBill.paid_amount).toFixed(2)}
                  </div>
                  <div className="font-mono text-sm font-bold text-amber-700">
                    Balance: {currencySymbol}{Number(selectedBill.balance_amount).toFixed(2)}
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
                  {selectedBill.lines && selectedBill.lines.length > 0 ? (
                    selectedBill.lines.map((l, i) => (
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
                      <td className="py-2 font-medium">Procurement Goods & Services</td>
                      <td className="py-2 text-right">1 LOT</td>
                      <td className="py-2 text-right font-mono">{currencySymbol}{Number(selectedBill.taxable_amount).toFixed(2)}</td>
                      <td className="py-2 text-right font-mono">{currencySymbol}{Number(selectedBill.taxable_amount).toFixed(2)}</td>
                      <td className="py-2 text-right font-mono font-bold">{currencySymbol}{Number(selectedBill.total_amount).toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Totals Summary */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1.5 text-xs border-t-2 border-slate-300 pt-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Amount:</span>
                    <span className="font-mono">{currencySymbol}{Number(selectedBill.taxable_amount).toFixed(2)}</span>
                  </div>
                  {Number(selectedBill.cgst_amount) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Input CGST Credit:</span>
                      <span className="font-mono text-emerald-700">+{currencySymbol}{Number(selectedBill.cgst_amount).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(selectedBill.sgst_amount) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Input SGST Credit:</span>
                      <span className="font-mono text-emerald-700">+{currencySymbol}{Number(selectedBill.sgst_amount).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(selectedBill.igst_amount) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Input IGST Credit:</span>
                      <span className="font-mono text-emerald-700">+{currencySymbol}{Number(selectedBill.igst_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-200">
                    <span>Total Amount Payable:</span>
                    <span className="font-mono text-[#390003]">{currencySymbol}{Number(selectedBill.total_amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-200 pt-4 text-[11px] text-slate-500 space-y-1">
                <p><span className="font-semibold text-slate-700">Internal Notes:</span> {selectedBill.notes || 'None'}</p>
                <p className="text-[10px] text-slate-400 pt-2 text-center">Recorded in RicozBooks Enterprise Accounts Payable.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default BillsPage;
