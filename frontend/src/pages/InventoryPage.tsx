import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Boxes, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  ArrowRightLeft, 
  History, 
  RefreshCw, 
  Building2, 
  FileText, 
  X,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getInventoryValuation, 
  getInventoryMovements, 
  getStockAdjustments, 
  createStockAdjustment, 
  InventoryValuationSummary, 
  ProductInventoryDetail, 
  InventoryMovement, 
  StockAdjustment 
} from '../services/accountingApi';

export const InventoryPage: React.FC = () => {
  const { activeEntity } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [valuationData, setValuationData] = useState<InventoryValuationSummary | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const initialTab = searchParams.get('tab');
  const validTab = (initialTab === 'movements' || initialTab === 'adjustments' || initialTab === 'valuation') ? initialTab : 'valuation';
  const [activeTab, setActiveTab] = useState<'valuation' | 'movements' | 'adjustments'>(validTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'movements' || tabParam === 'adjustments' || tabParam === 'valuation') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'valuation' | 'movements' | 'adjustments') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal states
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // New Adjustment Form State
  const [adjProductId, setAdjProductId] = useState<number | ''>('');
  const [adjType, setAdjType] = useState<'INCREASE' | 'DECREASE'>('INCREASE');
  const [adjQuantity, setAdjQuantity] = useState<number>(1);
  const [adjUnitCost, setAdjUnitCost] = useState<number>(0);
  const [adjReason, setAdjReason] = useState<string>('Physical Count Variance');
  const [adjLocation, setAdjLocation] = useState<string>('Main Warehouse');

  useEffect(() => {
    if (activeEntity?.id) {
      loadData();
    }
  }, [activeEntity?.id]);

  const loadData = async () => {
    if (!activeEntity?.id) return;
    setIsLoading(true);
    setActionError(null);
    try {
      const [valRes, movRes, adjRes] = await Promise.all([
        getInventoryValuation(activeEntity.id),
        getInventoryMovements(activeEntity.id),
        getStockAdjustments(activeEntity.id)
      ]);
      setValuationData(valRes);
      setMovements(movRes);
      setAdjustments(adjRes);
    } catch (err: any) {
      console.error('Error fetching inventory data:', err);
      setActionError(err.message || 'Failed to load inventory valuation data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductSelectForAdj = (productId: number) => {
    setAdjProductId(productId);
    const prod = valuationData?.products.find(p => p.id === productId);
    if (prod) {
      setAdjUnitCost(Number(prod.purchase_price) || 0);
    }
  };

  const handleOpenAdjustmentModal = (preselectedProduct?: ProductInventoryDetail) => {
    if (preselectedProduct) {
      setAdjProductId(preselectedProduct.id);
      setAdjUnitCost(Number(preselectedProduct.purchase_price) || 0);
    } else if (valuationData?.products.length) {
      setAdjProductId(valuationData.products[0].id);
      setAdjUnitCost(Number(valuationData.products[0].purchase_price) || 0);
    }
    setAdjQuantity(1);
    setAdjType('INCREASE');
    setAdjReason('Physical Count Variance');
    setAdjLocation('Main Warehouse');
    setActionSuccess(null);
    setActionError(null);
    setIsAdjustmentModalOpen(true);
  };

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntity?.id || !adjProductId) return;

    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const adjustment = await createStockAdjustment({
        entity_id: activeEntity.id,
        product_id: Number(adjProductId),
        adjustment_type: adjType,
        quantity: Number(adjQuantity),
        unit_cost: Number(adjUnitCost),
        reason: adjReason,
        warehouse_location: adjLocation
      });

      setActionSuccess(`Stock adjustment ${adjustment.adjustment_number} created successfully with double-entry journal posting!`);
      setIsAdjustmentModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('Stock adjustment failed:', err);
      setActionError(err.message || 'Failed to record stock adjustment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = (valuationData?.products || []).filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (Boolean(product.sku) && product.sku!.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (Boolean(product.product_type) && product.product_type.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'ALL' || product.stock_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const currency = activeEntity?.base_currency || 'INR';
  const currencySymbol = currency === 'USD' ? '$' : (currency === 'EUR' ? '€' : (currency === 'GBP' ? '£' : '₹'));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C58B3E]">Taxes & Inventory</span>
            <span className="text-slate-400">•</span>
            <span className="text-xs text-slate-500">Perpetual FIFO Valuation</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            Inventory & Stock Management
          </h1>
          <p className="text-sm text-slate-600">
            Continuous real-time FIFO/Average perpetual inventory valuation, movements & automated double-entry GL ledger adjustments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={() => handleOpenAdjustmentModal()}
            className="flex items-center space-x-2 px-4 py-2 bg-[#260002] hover:bg-[#390003] text-[#EEC68B] font-semibold text-sm rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Stock Adjustment</span>
          </button>
        </div>
      </div>

      {/* SUCCESS / ERROR ALERTS */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-sm">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800 text-sm">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-500 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Asset Valuation</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {currencySymbol}{Number(valuationData?.total_asset_valuation || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
              <span>Perpetual GL Asset (Acc 1300)</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Catalog SKUs</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {valuationData?.total_products_count || 0}
            </div>
            <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{valuationData?.in_stock_count || 0} In Stock Available</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Low Stock Alerts</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-600 tracking-tight">
              {valuationData?.low_stock_count || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              At or below minimum safety threshold
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Out of Stock</span>
            <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-600 tracking-tight">
              {valuationData?.out_of_stock_count || 0}
            </div>
            <div className="text-[11px] text-rose-600 mt-1 font-medium">
              Replenishment PO needed
            </div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center space-x-2 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          onClick={() => handleTabChange('valuation')}
          className={`flex items-center space-x-2 py-2.5 px-4 font-bold text-xs border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === 'valuation'
              ? 'border-[#781019] text-[#781019]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Stock Valuation & Catalog</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">
            {valuationData?.products.length || 0}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('movements')}
          className={`flex items-center space-x-2 py-2.5 px-4 font-bold text-xs border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === 'movements'
              ? 'border-[#781019] text-[#781019]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Movements Register</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">
            {movements.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('adjustments')}
          className={`flex items-center space-x-2 py-2.5 px-4 font-bold text-xs border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === 'adjustments'
              ? 'border-[#781019] text-[#781019]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Adjustments & Shrinkage</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">
            {adjustments.length}
          </span>
        </button>
      </div>

      {/* TAB CONTENT 1: VALUATION & PRODUCTS */}
      {activeTab === 'valuation' && (
        <div className="space-y-4">
          {/* SEARCH & FILTERS */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search SKU, product name, category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
              />
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#C58B3E] cursor-pointer"
              >
                <option value="ALL">All Stock Statuses</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="LOW_STOCK">Low Stock Alert</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            </div>
          </div>

          {/* PRODUCTS TABLE */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Product & SKU</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">HSN / SAC</th>
                    <th className="py-3 px-4 text-right">Available Qty</th>
                    <th className="py-3 px-4 text-right">Min Alert</th>
                    <th className="py-3 px-4 text-right">Cost Price</th>
                    <th className="py-3 px-4 text-right">Asset Valuation</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        <Package className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                        <span>No products found matching the criteria.</span>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const qty = Number(p.current_stock);
                      const minAlert = Number(p.min_stock_alert);
                      const valuation = Number(p.total_valuation);
                      const cost = Number(p.purchase_price);

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{p.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{p.sku}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {p.product_type || 'Goods'}
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            {p.hsn_sac_code || '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {qty} <span className="text-[10px] font-normal text-slate-500">{p.unit || 'Units'}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-500">
                            {minAlert}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">
                            {currencySymbol}{cost.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {currencySymbol}{valuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {p.stock_status === 'IN_STOCK' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                In Stock
                              </span>
                            )}
                            {p.stock_status === 'LOW_STOCK' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                                Low Stock
                              </span>
                            )}
                            {p.stock_status === 'OUT_OF_STOCK' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                                Out of Stock
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleOpenAdjustmentModal(p)}
                              className="text-xs px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300 transition-colors cursor-pointer"
                            >
                              Adjust
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: MOVEMENTS REGISTER */}
      {activeTab === 'movements' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Inventory Movement Register</h3>
              <p className="text-xs text-slate-500">Complete immutable audit trail of goods receipts, deliveries, and adjustments</p>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Total Recorded: {movements.length}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right">Unit Cost</th>
                  <th className="py-3 px-4 text-right">Total Cost</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Warehouse</th>
                  <th className="py-3 px-4 text-center">GL Journal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                      <span>No inventory movements recorded yet.</span>
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => {
                    const isPositive = Number(m.quantity) > 0;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {m.movement_date}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {m.product_name || `Product #${m.product_id}`}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {m.movement_type}
                          </span>
                        </td>
                        <td className={`py-3 px-4 text-right font-mono font-bold ${
                          isPositive ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {isPositive ? `+${m.quantity}` : m.quantity}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          {currencySymbol}{Number(m.unit_cost).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {currencySymbol}{Number(m.total_cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {m.reference_type ? `${m.reference_type} #${m.reference_id || ''}` : 'Direct Adjustment'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {m.warehouse_location || 'Main Warehouse'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {m.journal_entry_id ? (
                            <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
                              JE #{m.journal_entry_id}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
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
      )}

      {/* TAB CONTENT 3: ADJUSTMENTS & SHRINKAGE */}
      {activeTab === 'adjustments' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Stock Adjustments & Write-Offs</h3>
              <p className="text-xs text-slate-500">Formal adjustments posted to inventory shrinkage or gain accounts with balanced GL entries</p>
            </div>
            <button
              onClick={() => handleOpenAdjustmentModal()}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#260002] hover:bg-[#390003] text-[#EEC68B] font-semibold transition-colors"
            >
              + Create Adjustment
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Adj #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right">Total Impact</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4">Warehouse</th>
                  <th className="py-3 px-4 text-center">Posted Journal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adjustments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      <History className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                      <span>No stock adjustments posted yet.</span>
                    </td>
                  </tr>
                ) : (
                  adjustments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#781019]">
                        {a.adjustment_number}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {a.adjustment_date}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {a.product_name || `Product #${a.product_id}`}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                          a.adjustment_type === 'INCREASE'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          {a.adjustment_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {a.adjustment_type === 'INCREASE' ? `+${a.quantity}` : `-${a.quantity}`}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${
                        a.adjustment_type === 'INCREASE' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {currencySymbol}{Number(a.total_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {a.reason}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {a.warehouse_location || 'Main Warehouse'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {a.journal_entry_id ? (
                          <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
                            JE #{a.journal_entry_id}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
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

      {/* NEW STOCK ADJUSTMENT MODAL */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <Boxes className="w-5 h-5 text-[#C58B3E]" />
                <h2 className="text-base font-bold text-slate-900">Record Stock Adjustment</h2>
              </div>
              <button
                onClick={() => setIsAdjustmentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdjustment} className="p-5 space-y-4">
              {/* Product selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Item *
                </label>
                <select
                  value={adjProductId}
                  onChange={(e) => handleProductSelectForAdj(Number(e.target.value))}
                  required
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                >
                  <option value="">Select inventory product...</option>
                  {(valuationData?.products || []).map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} ({prod.sku}) — Available: {prod.current_stock}
                    </option>
                  ))}
                </select>
              </div>

              {/* Adjustment Type & Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Adjustment Type *
                  </label>
                  <select
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value as 'INCREASE' | 'DECREASE')}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                  >
                    <option value="INCREASE">Stock Increase (Gain)</option>
                    <option value="DECREASE">Stock Decrease (Shrinkage/Damage)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={adjQuantity}
                    onChange={(e) => setAdjQuantity(Math.max(1, Number(e.target.value)))}
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                  />
                </div>
              </div>

              {/* Unit Cost & Total Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit Cost ({currency}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={adjUnitCost}
                    onChange={(e) => setAdjUnitCost(Number(e.target.value))}
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Calculated Total Value
                  </label>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900">
                    {currencySymbol} {(adjQuantity * adjUnitCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Reason & Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Adjustment Reason *
                  </label>
                  <select
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                  >
                    <option value="Physical Count Variance">Physical Count Variance</option>
                    <option value="Shrinkage / Unaccounted Loss">Shrinkage / Theft</option>
                    <option value="Damaged / Spoiled Goods">Damaged / Spoiled Goods</option>
                    <option value="Expired Inventory">Expired Inventory</option>
                    <option value="Internal Conversion / Testing">Internal Conversion</option>
                    <option value="Opening Balance Adjustment">Opening Balance Setup</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Warehouse Location
                  </label>
                  <input
                    type="text"
                    value={adjLocation}
                    onChange={(e) => setAdjLocation(e.target.value)}
                    placeholder="e.g. Main Warehouse"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#C58B3E]"
                  />
                </div>
              </div>

              {/* Double-Entry Preview Banner */}
              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-[11px] text-slate-700 space-y-1">
                <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Automated Double-Entry GL Posting</span>
                </div>
                {adjType === 'INCREASE' ? (
                  <p className="font-mono text-slate-600">
                    Dr 1300 Inventory Asset: {currencySymbol} {(adjQuantity * adjUnitCost).toFixed(2)} <br />
                    Cr 5850 Inventory Gain / Variance: {currencySymbol} {(adjQuantity * adjUnitCost).toFixed(2)}
                  </p>
                ) : (
                  <p className="font-mono text-slate-600">
                    Dr 5800 Inventory Shrinkage & Loss: {currencySymbol} {(adjQuantity * adjUnitCost).toFixed(2)} <br />
                    Cr 1300 Inventory Asset: {currencySymbol} {(adjQuantity * adjUnitCost).toFixed(2)}
                  </p>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustmentModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !adjProductId}
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-[#260002] hover:bg-[#390003] text-[#EEC68B] transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? 'Posting Journal...' : 'Confirm & Post Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default InventoryPage;
