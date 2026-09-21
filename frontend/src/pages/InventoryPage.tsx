import React, { useState, useEffect } from 'react';
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
  
  const [valuationData, setValuationData] = useState<InventoryValuationSummary | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'valuation' | 'movements' | 'adjustments'>('valuation');

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

  const currency = activeEntity?.base_currency || 'USD';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#390003] rounded-xl border border-[#C58B3E]/30 text-[#E6B676]">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Inventory & Stock Management
              </h1>
              <p className="text-xs text-slate-400">
                Continuous real-time FIFO/Average perpetual inventory valuation, movements & automated double-entry GL ledger adjustments
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="p-2 text-slate-400 hover:text-white hover:bg-[#390003] rounded-lg border border-[#55080E] transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={() => handleOpenAdjustmentModal()}
            className="flex items-center space-x-2 bg-gradient-to-r from-[#C58B3E] to-[#E6B676] hover:from-[#b57d33] hover:to-[#d8a867] text-[#260002] font-semibold px-4 py-2 rounded-lg text-sm transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Stock Adjustment</span>
          </button>
        </div>
      </div>

      {/* SUCCESS / ERROR ALERTS */}
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

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1E0002] border border-[#390003] rounded-xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Asset Valuation</span>
            <div className="p-2 bg-[#390003] rounded-lg text-[#E6B676]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">
              {currency} {Number(valuationData?.total_asset_valuation || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
              <span>Perpetual GL Asset (Acc 1300)</span>
            </div>
          </div>
        </div>

        <div className="bg-[#1E0002] border border-[#390003] rounded-xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Catalog SKUs</span>
            <div className="p-2 bg-[#390003] rounded-lg text-emerald-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">
              {valuationData?.total_products_count || 0}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{valuationData?.in_stock_count || 0} In Stock Available</span>
            </div>
          </div>
        </div>

        <div className="bg-[#1E0002] border border-[#390003] rounded-xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Low Stock Alerts</span>
            <div className="p-2 bg-[#390003] rounded-lg text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-300 tracking-tight">
              {valuationData?.low_stock_count || 0}
            </div>
            <div className="text-[11px] text-amber-400 mt-1">
              At or below minimum safety threshold
            </div>
          </div>
        </div>

        <div className="bg-[#1E0002] border border-[#390003] rounded-xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Out of Stock</span>
            <div className="p-2 bg-[#390003] rounded-lg text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-300 tracking-tight">
              {valuationData?.out_of_stock_count || 0}
            </div>
            <div className="text-[11px] text-rose-400 mt-1">
              Replenishment PO needed
            </div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-[#390003]">
        <button
          onClick={() => setActiveTab('valuation')}
          className={`flex items-center space-x-2 py-3 px-5 font-semibold text-sm border-b-2 transition-colors cursor-pointer ${
            activeTab === 'valuation'
              ? 'border-[#E6B676] text-[#E6B676] bg-[#390003]/30'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Stock Valuation & Catalog</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-[#390003] text-slate-300 border border-[#55080E]">
            {valuationData?.products.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          className={`flex items-center space-x-2 py-3 px-5 font-semibold text-sm border-b-2 transition-colors cursor-pointer ${
            activeTab === 'movements'
              ? 'border-[#E6B676] text-[#E6B676] bg-[#390003]/30'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Movements Register</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-[#390003] text-slate-300 border border-[#55080E]">
            {movements.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('adjustments')}
          className={`flex items-center space-x-2 py-3 px-5 font-semibold text-sm border-b-2 transition-colors cursor-pointer ${
            activeTab === 'adjustments'
              ? 'border-[#E6B676] text-[#E6B676] bg-[#390003]/30'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Adjustments & Shrinkage</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-[#390003] text-slate-300 border border-[#55080E]">
            {adjustments.length}
          </span>
        </button>
      </div>

      {/* TAB CONTENT 1: VALUATION & PRODUCTS */}
      {activeTab === 'valuation' && (
        <div className="space-y-4">
          {/* SEARCH & FILTERS */}
          <div className="bg-[#1E0002] border border-[#390003] rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search SKU, product name, category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#260002] border border-[#390003] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C58B3E]"
              />
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#260002] border border-[#390003] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C58B3E] cursor-pointer"
              >
                <option value="ALL">All Stock Statuses</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="LOW_STOCK">Low Stock Alert</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            </div>
          </div>

          {/* PRODUCTS TABLE */}
          <div className="bg-[#1E0002] border border-[#390003] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#390003] bg-[#260002]/80 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Product & SKU</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">HSN / SAC</th>
                    <th className="py-3.5 px-4 text-right">Available Qty</th>
                    <th className="py-3.5 px-4 text-right">Min Alert</th>
                    <th className="py-3.5 px-4 text-right">Cost Price</th>
                    <th className="py-3.5 px-4 text-right">Asset Valuation</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#390003]/60">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        <Package className="w-8 h-8 mx-auto mb-2 text-slate-600" />
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
                        <tr key={p.id} className="hover:bg-[#260002]/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">{p.name}</div>
                            <div className="text-[10px] text-[#EEC68B] font-mono">{p.sku}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {p.product_type || 'Goods'}
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                            {p.hsn_sac_code || '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-white">
                            {qty} <span className="text-[10px] font-normal text-slate-400">{p.unit || 'Units'}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-400">
                            {minAlert}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-300">
                            {currency} {cost.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-[#E6B676]">
                            {currency} {valuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {p.stock_status === 'IN_STOCK' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
                                In Stock
                              </span>
                            )}
                            {p.stock_status === 'LOW_STOCK' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/40">
                                Low Stock
                              </span>
                            )}
                            {p.stock_status === 'OUT_OF_STOCK' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/40">
                                Out of Stock
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleOpenAdjustmentModal(p)}
                              className="text-xs px-2.5 py-1 rounded bg-[#390003] hover:bg-[#55080E] text-[#E6B676] font-semibold border border-[#C58B3E]/30 transition-colors cursor-pointer"
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
        <div className="bg-[#1E0002] border border-[#390003] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#390003] flex justify-between items-center bg-[#260002]/50">
            <div>
              <h3 className="font-semibold text-white text-sm">Inventory Movement Register</h3>
              <p className="text-xs text-slate-400">Complete immutable audit trail of goods receipts, deliveries, and adjustments</p>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Total Recorded: {movements.length}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#390003] bg-[#260002]/80 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4">Movement Type</th>
                  <th className="py-3.5 px-4 text-right">Quantity</th>
                  <th className="py-3.5 px-4 text-right">Unit Cost</th>
                  <th className="py-3.5 px-4 text-right">Total Cost</th>
                  <th className="py-3.5 px-4">Reference</th>
                  <th className="py-3.5 px-4">Warehouse</th>
                  <th className="py-3.5 px-4 text-center">GL Journal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#390003]/60">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                      <span>No inventory movements recorded yet.</span>
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => {
                    const isPositive = Number(m.quantity) > 0;
                    return (
                      <tr key={m.id} className="hover:bg-[#260002]/60 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {m.movement_date}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          {m.product_name || `Product #${m.product_id}`}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#390003] text-slate-300 border border-[#55080E]">
                            {m.movement_type}
                          </span>
                        </td>
                        <td className={`py-3 px-4 text-right font-mono font-bold ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {isPositive ? `+${m.quantity}` : m.quantity}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                          {currency} {Number(m.unit_cost).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          {currency} {Number(m.total_cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {m.reference_type ? `${m.reference_type} #${m.reference_id || ''}` : 'Direct Adjustment'}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {m.warehouse_location || 'Main Warehouse'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {m.journal_entry_id ? (
                            <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/30 font-mono">
                              JE #{m.journal_entry_id}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
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
        <div className="bg-[#1E0002] border border-[#390003] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#390003] flex justify-between items-center bg-[#260002]/50">
            <div>
              <h3 className="font-semibold text-white text-sm">Stock Adjustments & Write-Offs</h3>
              <p className="text-xs text-slate-400">Formal adjustments posted to inventory shrinkage or gain accounts with balanced GL entries</p>
            </div>
            <button
              onClick={() => handleOpenAdjustmentModal()}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#390003] hover:bg-[#55080E] text-[#E6B676] font-semibold border border-[#C58B3E]/30 transition-colors"
            >
              + Create Adjustment
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#390003] bg-[#260002]/80 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Adj #</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4 text-right">Quantity</th>
                  <th className="py-3.5 px-4 text-right">Total Impact</th>
                  <th className="py-3.5 px-4">Reason / Notes</th>
                  <th className="py-3.5 px-4">Warehouse</th>
                  <th className="py-3.5 px-4 text-center">Posted Journal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#390003]/60">
                {adjustments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      <History className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                      <span>No stock adjustments posted yet.</span>
                    </td>
                  </tr>
                ) : (
                  adjustments.map((a) => (
                    <tr key={a.id} className="hover:bg-[#260002]/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#E6B676]">
                        {a.adjustment_number}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {a.adjustment_date}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {a.product_name || `Product #${a.product_id}`}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                          a.adjustment_type === 'INCREASE'
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40'
                            : 'bg-rose-950/80 text-rose-300 border border-rose-800/40'
                        }`}>
                          {a.adjustment_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        {a.adjustment_type === 'INCREASE' ? `+${a.quantity}` : `-${a.quantity}`}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${
                        a.adjustment_type === 'INCREASE' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {currency} {Number(a.total_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {a.reason}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {a.warehouse_location || 'Main Warehouse'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {a.journal_entry_id ? (
                          <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/30 font-mono">
                            JE #{a.journal_entry_id}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
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
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#1E0002] border border-[#390003] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[#390003] flex items-center justify-between bg-[#260002]/80">
              <div className="flex items-center space-x-2.5">
                <Boxes className="w-5 h-5 text-[#E6B676]" />
                <h2 className="text-base font-bold text-white">Record Stock Adjustment</h2>
              </div>
              <button
                onClick={() => setIsAdjustmentModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdjustment} className="p-5 space-y-4">
              {/* Product selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Product Item *
                </label>
                <select
                  value={adjProductId}
                  onChange={(e) => handleProductSelectForAdj(Number(e.target.value))}
                  required
                  className="w-full bg-[#260002] border border-[#390003] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C58B3E]"
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Adjustment Type *
                  </label>
                  <select
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value as 'INCREASE' | 'DECREASE')}
                    className="w-full bg-[#260002] border border-[#390003] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C58B3E]"
                  >
                    <option value="INCREASE">Stock Increase (Gain)</option>
                    <option value="DECREASE">Stock Decrease (Shrinkage/Damage)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={adjQuantity}
                    onChange={(e) => setAdjQuantity(Math.max(1, Number(e.target.value)))}
                    required
                    className="w-full bg-[#260002] border border-[#390003] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#C58B3E]"
                  />
                </div>
              </div>

              {/* Unit Cost & Total Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Unit Cost ({currency}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={adjUnitCost}
                    onChange={(e) => setAdjUnitCost(Number(e.target.value))}
                    required
                    className="w-full bg-[#260002] border border-[#390003] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#C58B3E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Calculated Total Value
                  </label>
                  <div className="bg-[#260002] border border-[#390003] rounded-lg px-3 py-2 text-xs font-mono font-bold text-[#E6B676]">
                    {currency} {(adjQuantity * adjUnitCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Reason & Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Adjustment Reason *
                  </label>
                  <select
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    className="w-full bg-[#260002] border border-[#390003] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C58B3E]"
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Warehouse Location
                  </label>
                  <input
                    type="text"
                    value={adjLocation}
                    onChange={(e) => setAdjLocation(e.target.value)}
                    placeholder="e.g. Main Warehouse"
                    className="w-full bg-[#260002] border border-[#390003] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C58B3E]"
                  />
                </div>
              </div>

              {/* Double-Entry Preview Banner */}
              <div className="p-3 bg-[#390003]/60 rounded-xl border border-[#C58B3E]/20 text-[11px] text-slate-300 space-y-1">
                <div className="font-semibold text-[#E6B676] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Automated Double-Entry GL Posting</span>
                </div>
                {adjType === 'INCREASE' ? (
                  <p className="font-mono text-slate-400">
                    Dr 1300 Inventory Asset: {currency} {(adjQuantity * adjUnitCost).toFixed(2)} <br />
                    Cr 5850 Inventory Gain / Variance: {currency} {(adjQuantity * adjUnitCost).toFixed(2)}
                  </p>
                ) : (
                  <p className="font-mono text-slate-400">
                    Dr 5800 Inventory Shrinkage & Loss: {currency} {(adjQuantity * adjUnitCost).toFixed(2)} <br />
                    Cr 1300 Inventory Asset: {currency} {(adjQuantity * adjUnitCost).toFixed(2)}
                  </p>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#390003]">
                <button
                  type="button"
                  onClick={() => setIsAdjustmentModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !adjProductId}
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#C58B3E] to-[#E6B676] text-[#260002] hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
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
