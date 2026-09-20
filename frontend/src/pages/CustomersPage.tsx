import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  CreditCard, 
  Receipt, 
  Printer, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getCustomers, 
  createCustomer, 
  getCustomerStatement, 
  Customer, 
  CustomerCreateData, 
  CustomerStatement 
} from '../services/accountingApi';

export const CustomersPage: React.FC = () => {
  const { activeEntity } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showStatementModal, setShowStatementModal] = useState<boolean>(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [statement, setStatement] = useState<CustomerStatement | null>(null);
  const [isStatementLoading, setIsStatementLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form State
  const [name, setName] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [gstin, setGstin] = useState<string>('');
  const [pan, setPan] = useState<string>('');
  const [billingAddress, setBillingAddress] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [postalCode, setPostalCode] = useState<string>('');
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(30);
  const [openingBalance, setOpeningBalance] = useState<number>(0);

  const currencySymbol = activeEntity?.base_currency === 'USD' ? '$' : (activeEntity?.base_currency === 'EUR' ? '€' : (activeEntity?.base_currency === 'GBP' ? '£' : '₹'));

  const fetchCustomersList = async () => {
    if (!activeEntity) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCustomers(activeEntity.id, searchTerm);
      setCustomers(data);
    } catch (err: any) {
      console.error('Failed to load customers:', err);
      setError(err.message || 'Failed to load customer directory');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomersList();
  }, [activeEntity?.id, searchTerm]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntity) return;

    if (!name.trim()) {
      setError('Customer name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const payload: CustomerCreateData = {
        entity_id: activeEntity.id,
        name: name.trim(),
        company_name: companyName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        gstin: gstin.trim().toUpperCase() || undefined,
        pan: pan.trim().toUpperCase() || undefined,
        billing_address: billingAddress.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        postal_code: postalCode.trim() || undefined,
        payment_terms_days: Number(paymentTermsDays) || 30,
        opening_balance: Number(openingBalance) || 0,
        currency: activeEntity.base_currency || 'INR'
      };

      await createCustomer(payload);
      setShowAddModal(false);
      // Reset form
      setName('');
      setCompanyName('');
      setEmail('');
      setPhone('');
      setGstin('');
      setPan('');
      setBillingAddress('');
      setCity('');
      setState('');
      setPostalCode('');
      setOpeningBalance(0);

      setSuccessMsg(`Customer "${payload.name}" registered successfully!`);
      setTimeout(() => setSuccessMsg(null), 5000);
      await fetchCustomersList();
    } catch (err: any) {
      setError(err.message || 'Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewStatement = async (cust: Customer) => {
    setSelectedCustomer(cust);
    setShowStatementModal(true);
    setIsStatementLoading(true);
    setStatement(null);
    try {
      const stmt = await getCustomerStatement(cust.id);
      setStatement(stmt);
    } catch (err: any) {
      console.error('Failed to load customer statement:', err);
      setError('Failed to fetch customer account statement');
    } finally {
      setIsStatementLoading(false);
    }
  };

  // Metrics
  const totalReceivables = customers.reduce((acc, c) => acc + Number(c.current_balance || 0), 0);
  const activeCount = customers.filter(c => c.is_active).length;
  const highBalanceCount = customers.filter(c => Number(c.current_balance || 0) > 0).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C58B3E]">Sales & CRM</span>
            <span className="text-slate-400">•</span>
            <span className="text-xs text-slate-500">Customer Directory & Ledgers</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Customer Accounts (AR)</h1>
          <p className="text-sm text-slate-600">
            Maintain customer masters, tax identifiers (GSTIN/PAN), credit terms, and subledger balances.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchCustomersList}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-[#260002] hover:bg-[#390003] text-[#EEC68B] font-semibold text-sm rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Feedback Messages */}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Customers</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{customers.length}</div>
          <div className="mt-1 text-xs text-slate-500">{activeCount} active corporate profiles</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total AR Outstanding</div>
          <div className="mt-2 text-2xl font-bold text-amber-600">
            {currencySymbol}{totalReceivables.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-xs text-slate-500">Net customer balance owing</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Accounts with Balances</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{highBalanceCount}</div>
          <div className="mt-1 text-xs text-slate-500">Customers with pending receipts</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, company, email, or GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Tax / GSTIN</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-center">Terms</th>
                <th className="py-3 px-4 text-right">Current Balance</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No customers found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchTerm ? 'Try a different search query' : 'Click "+ Add Customer" to create your first customer profile.'}
                    </p>
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      {c.company_name && (
                        <div className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{c.company_name}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {c.email && (
                        <div className="flex items-center space-x-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{c.email}</span>
                        </div>
                      )}
                      {c.phone && (
                        <div className="flex items-center space-x-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{c.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono">
                      {c.gstin ? (
                        <span className="font-semibold text-slate-800">{c.gstin}</span>
                      ) : (
                        <span className="text-slate-400 font-sans italic">Unregistered</span>
                      )}
                      {c.pan && <div className="text-[10px] text-slate-500">PAN: {c.pan}</div>}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{c.city || '—'}, {c.state || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-700">
                        {c.payment_terms_days} days
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {Number(c.current_balance) > 0 ? (
                        <span className="text-amber-700 font-mono">
                          {currencySymbol}{Number(c.current_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-mono">
                          {currencySymbol}0.00
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleViewStatement(c)}
                        className="px-3 py-1.5 text-xs bg-[#260002] hover:bg-[#390003] text-[#EEC68B] font-medium rounded-lg transition-colors flex items-center space-x-1.5 ml-auto"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Statement</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD CUSTOMER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-200 bg-[#1E0002] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-[#EEC68B]" />
                <h3 className="font-bold text-lg">Add Customer Profile</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tata Consultancy Services"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Company / Legal Name</label>
                  <input
                    type="text"
                    placeholder="e.g. TCS Global Solutions Ltd"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="accounts@client.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">GSTIN</label>
                  <input
                    type="text"
                    placeholder="27AAACT2727Q1ZB"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    className="w-full text-sm font-mono border border-slate-300 rounded-lg p-2.5 uppercase focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">PAN Number</label>
                  <input
                    type="text"
                    placeholder="AAACT2727Q"
                    value={pan}
                    onChange={(e) => setPan(e.target.value)}
                    className="w-full text-sm font-mono border border-slate-300 rounded-lg p-2.5 uppercase focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Billing Address</label>
                <input
                  type="text"
                  placeholder="Plot 24, Tech Park Phase 2"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">City</label>
                  <input
                    type="text"
                    placeholder="Pune"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">State</label>
                  <input
                    type="text"
                    placeholder="Maharashtra"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">PIN Code</label>
                  <input
                    type="text"
                    placeholder="411057"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Payment Terms (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={paymentTermsDays}
                    onChange={(e) => setPaymentTermsDays(Number(e.target.value))}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Opening Balance</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold">{currencySymbol}</span>
                    <input
                      type="number"
                      step="any"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(Number(e.target.value))}
                      className="w-full text-sm font-semibold pl-8 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 text-sm font-semibold rounded-lg bg-[#260002] hover:bg-[#390003] text-[#EEC68B] shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER STATEMENT / LEDGER MODAL */}
      {showStatementModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8 overflow-hidden border border-slate-200 print:m-0 print:border-none">
            <div className="p-4 border-b border-slate-200 bg-slate-100 flex items-center justify-between print:hidden">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Customer Statement of Account</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-700 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Statement</span>
                </button>
                <button onClick={() => setShowStatementModal(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6 text-slate-900 bg-white">
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-black tracking-tight text-[#260002]">Ricoz<span className="text-[#C58B3E]">Books</span></span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-2">{activeEntity?.name}</h2>
                  <p className="text-xs text-slate-500">{activeEntity?.city} {activeEntity?.tax_identifier ? `• GSTIN: ${activeEntity.tax_identifier}` : ''}</p>
                </div>

                <div className="text-right">
                  <div className="text-xl font-black uppercase text-slate-900 tracking-wider">STATEMENT OF ACCOUNT</div>
                  <div className="text-xs text-slate-600 mt-1">Generated: {new Date().toLocaleDateString()}</div>
                </div>
              </div>

              {/* Customer summary */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
                <div>
                  <div className="font-bold uppercase tracking-wider text-slate-500 mb-1">Account Of</div>
                  <div className="font-bold text-sm text-slate-900">{selectedCustomer.name}</div>
                  {selectedCustomer.company_name && <div className="text-slate-600">{selectedCustomer.company_name}</div>}
                  {selectedCustomer.gstin && <div className="font-mono text-slate-600">GSTIN: {selectedCustomer.gstin}</div>}
                </div>
                <div className="text-right space-y-1">
                  <div>
                    <span className="text-slate-500 mr-2">Opening Balance:</span>
                    <span className="font-mono font-medium">{currencySymbol}{statement ? Number(statement.opening_balance).toFixed(2) : '0.00'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 mr-2">Total Invoiced:</span>
                    <span className="font-mono font-medium">{currencySymbol}{statement ? Number(statement.total_invoiced).toFixed(2) : '0.00'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 mr-2">Total Paid:</span>
                    <span className="font-mono font-medium text-emerald-600">-{currencySymbol}{statement ? Number(statement.total_paid).toFixed(2) : '0.00'}</span>
                  </div>
                  <div className="pt-1 border-t border-slate-300 font-bold text-sm">
                    <span className="text-slate-800 mr-2">Outstanding Balance:</span>
                    <span className="font-mono text-amber-700">{currencySymbol}{statement ? Number(statement.current_balance).toFixed(2) : '0.00'}</span>
                  </div>
                </div>
              </div>

              {/* Transactions list */}
              {isStatementLoading ? (
                <div className="py-12 text-center text-slate-500">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#C58B3E] mb-2" />
                  <p>Loading chronological subledger entries...</p>
                </div>
              ) : statement && statement.entries && statement.entries.length > 0 ? (
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-300 font-bold uppercase text-slate-700 bg-slate-100/50">
                      <th className="py-2.5 px-2 text-left">Date</th>
                      <th className="py-2.5 px-2 text-left">Type</th>
                      <th className="py-2.5 px-2 text-left">Reference #</th>
                      <th className="py-2.5 px-2 text-left">Description</th>
                      <th className="py-2.5 px-2 text-right">Debit (Inv)</th>
                      <th className="py-2.5 px-2 text-right">Credit (Paid)</th>
                      <th className="py-2.5 px-2 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {statement.entries.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-2 text-slate-600">{item.date}</td>
                        <td className="py-2 px-2 font-semibold text-slate-700">{item.type}</td>
                        <td className="py-2 px-2 font-mono text-slate-800">{item.reference}</td>
                        <td className="py-2 px-2 text-slate-600">{item.description}</td>
                        <td className="py-2 px-2 text-right font-mono font-medium">
                          {Number(item.debit) > 0 ? `${currencySymbol}${Number(item.debit).toFixed(2)}` : '—'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-medium text-emerald-600">
                          {Number(item.credit) > 0 ? `${currencySymbol}${Number(item.credit).toFixed(2)}` : '—'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                          {currencySymbol}{Number(item.running_balance).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-slate-500 border border-dashed border-slate-300 rounded-lg">
                  <p className="font-medium">No recorded transactions for this customer yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Generate a tax invoice to create subledger receivable entries.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CustomersPage;

