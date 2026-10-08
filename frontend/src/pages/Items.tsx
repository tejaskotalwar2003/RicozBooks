import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  RotateCcw, 
  Eye, 
  Edit2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Boxes, 
  FileText, 
  Layers, 
  Tag, 
  Landmark, 
  TrendingDown, 
  X, 
  Check, 
  AlertCircle,
  Building2,
  DollarSign,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Pagination } from '../components/common/Pagination';
import { 
  getItems, 
  getItemSummary, 
  getItemCategories, 
  createItem, 
  updateItem, 
  toggleItemStatus, 
  accountingApi,
  Product as Item, 
  ItemSummary,
  Account
} from '../services/accountingApi';

export const Items: React.FC = () => {
  const { activeEntity } = useAuth();

  // Data states
  const [items, setItems] = useState<Item[]>([]);
  const [summary, setSummary] = useState<ItemSummary | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Tab State: 'ALL' | 'PRODUCTS' | 'SERVICES' | 'ACTIVE' | 'INACTIVE'
  const [activeTab, setActiveTab] = useState<'ALL' | 'PRODUCTS' | 'SERVICES' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Filter States
  const [nameSearch, setNameSearch] = useState<string>('');
  const [skuSearch, setSkuSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Modal / Drawer States
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [viewingItem, setViewingItem] = useState<Item | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    product_type: 'PRODUCT' as 'PRODUCT' | 'SERVICE',
    category: '',
    unit: 'PCS',
    hsn_sac_code: '',
    description: '',
    selling_price: 0,
    sales_account_id: undefined as number | undefined,
    tax_rate: 18.0,
    purchase_price: 0,
    purchase_account_id: undefined as number | undefined,
    track_inventory: true,
    opening_stock: 0,
    opening_stock_rate: 0,
    reorder_level: 0,
    inventory_account_id: undefined as number | undefined,
    warehouse_location: 'Main Warehouse'
  });

  const currencySymbol = activeEntity?.base_currency === 'USD' ? '$' : (activeEntity?.base_currency === 'EUR' ? '€' : '₹');

  // Load summary and accounts once when entity changes
  useEffect(() => {
    if (activeEntity?.id) {
      loadSummaryAndMetadata();
    }
  }, [activeEntity?.id]);

  // Load items whenever filters or page changes
  useEffect(() => {
    if (activeEntity?.id) {
      loadItems();
    }
  }, [activeEntity?.id, currentPage, pageSize, nameSearch, skuSearch, typeFilter, statusFilter, categoryFilter, activeTab]);

  const loadSummaryAndMetadata = async () => {
    if (!activeEntity?.id) return;
    try {
      const [sumRes, catsRes, accsRes] = await Promise.all([
        getItemSummary(activeEntity.id),
        getItemCategories(activeEntity.id),
        accountingApi.getAccounts({ entity_id: activeEntity.id, is_active: true })
      ]);
      setSummary(sumRes);
      setCategories(catsRes || []);
      setAccounts(accsRes || []);
    } catch (err) {
      console.error('Failed to load item summary metadata:', err);
    }
  };

  const loadItems = async () => {
    if (!activeEntity?.id) return;
    setIsLoading(true);
    setActionError(null);
    try {
      // Determine effective type & status based on activeTab
      let effectiveType = typeFilter;
      let effectiveStatus = statusFilter;

      if (activeTab === 'PRODUCTS') effectiveType = 'PRODUCT';
      else if (activeTab === 'SERVICES') effectiveType = 'SERVICE';
      else if (activeTab === 'ACTIVE') effectiveStatus = 'ACTIVE';
      else if (activeTab === 'INACTIVE') effectiveStatus = 'INACTIVE';

      const res = await getItems({
        entity_id: activeEntity.id,
        name_search: nameSearch.trim() || undefined,
        sku_search: skuSearch.trim() || undefined,
        type: effectiveType !== 'ALL' ? effectiveType : undefined,
        status: effectiveStatus !== 'ALL' ? effectiveStatus : undefined,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        page: currentPage,
        page_size: pageSize,
        paginate: true
      });

      setItems(res.items || []);
      setTotalRecords(res.total);
      setTotalPages(res.total_pages);
    } catch (err: any) {
      console.error('Failed to load items:', err);
      setActionError(err.message || 'Failed to fetch items list.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab: 'ALL' | 'PRODUCTS' | 'SERVICES' | 'ACTIVE' | 'INACTIVE') => {
    setActiveTab(tab);
    setCurrentPage(1);
    if (tab === 'PRODUCTS') setTypeFilter('PRODUCT');
    else if (tab === 'SERVICES') setTypeFilter('SERVICE');
    else if (tab === 'ACTIVE') setStatusFilter('ACTIVE');
    else if (tab === 'INACTIVE') setStatusFilter('INACTIVE');
    else {
      setTypeFilter('ALL');
      setStatusFilter('ALL');
    }
  };

  const handleResetFilters = () => {
    setNameSearch('');
    setSkuSearch('');
    setTypeFilter('ALL');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setActiveTab('ALL');
    setCurrentPage(1);
  };

  // Categorize Chart of Accounts to enforce GAAP/standard mappings
  const isCogsOrPurchaseAccount = (a: any) => {
    if (a.account_type !== 'EXPENSE') return false;
    const nameLower = (a.name || '').toLowerCase();
    const code = (a.code || '').trim();
    const disallowedKeywords = [
      'salary', 'payroll', 'rent', 'lease', 'travel', 'lodging',
      'marketing', 'advertising', 'legal', 'professional',
      'utilities', 'office supplies', 'meals', 'entertainment'
    ];
    if (disallowedKeywords.some((kw: string) => nameLower.includes(kw))) {
      return false;
    }
    const allowedKeywords = [
      'cogs', 'cost of goods', 'cost of sales', 'direct cost', 
      'direct purchase', 'merchandise', 'purchase', 'trading'
    ];
    return code.startsWith('57') || code === '5050' || allowedKeywords.some((kw: string) => nameLower.includes(kw));
  };

  const revenueAccounts = accounts.filter(a => a.account_type === 'REVENUE');
  const expenseAccounts = accounts.filter(a => a.account_type === 'EXPENSE');
  const cogsAccounts = expenseAccounts.filter(isCogsOrPurchaseAccount);
  const assetAccounts = accounts.filter(a => a.account_type === 'ASSET');

  const openCreateModal = () => {
    setEditingItem(null);
    const defaultCogs = cogsAccounts.find(a => a.code === '5700') || cogsAccounts[0];
    const defaultRevenue = revenueAccounts.find(a => a.code === '4000') || revenueAccounts[0];
    const defaultInventory = assetAccounts.find(a => a.code === '1300' || a.name.toLowerCase().includes('inventory')) || assetAccounts[0];

    setFormData({
      name: '',
      sku: '',
      product_type: 'PRODUCT',
      category: '',
      unit: 'PCS',
      hsn_sac_code: '',
      description: '',
      selling_price: 0,
      sales_account_id: defaultRevenue?.id,
      tax_rate: 18.0,
      purchase_price: 0,
      purchase_account_id: defaultCogs?.id,
      track_inventory: true,
      opening_stock: 0,
      opening_stock_rate: 0,
      reorder_level: 0,
      inventory_account_id: defaultInventory?.id,
      warehouse_location: 'Main Warehouse'
    });
    setActionError(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      sku: item.sku || '',
      product_type: item.product_type === 'SERVICE' ? 'SERVICE' : 'PRODUCT',
      category: item.category || '',
      unit: item.unit || 'PCS',
      hsn_sac_code: item.hsn_sac_code || '',
      description: item.description || '',
      selling_price: Number(item.selling_price) || 0,
      sales_account_id: item.income_account_id,
      tax_rate: Number(item.tax_rate) || 18.0,
      purchase_price: Number(item.purchase_price) || 0,
      purchase_account_id: item.expense_account_id,
      track_inventory: item.product_type === 'SERVICE' ? false : Boolean(item.track_inventory),
      opening_stock: Number(item.opening_stock) || 0,
      opening_stock_rate: Number(item.opening_stock_rate) || 0,
      reorder_level: Number(item.reorder_level) || 0,
      inventory_account_id: item.inventory_account_id,
      warehouse_location: item.warehouse_location || 'Main Warehouse'
    });
    setActionError(null);
    setIsFormModalOpen(true);
  };

  const openViewModal = (item: Item) => {
    setViewingItem(item);
    setIsViewModalOpen(true);
  };

  const handleToggleStatus = async (item: Item) => {
    try {
      const updated = await toggleItemStatus(item.id, !item.is_active);
      setActionSuccess(`Item '${item.name}' ${updated.is_active ? 'activated' : 'deactivated'} successfully.`);
      setTimeout(() => setActionSuccess(null), 3500);
      loadItems();
      loadSummaryAndMetadata();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update item status.');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntity?.id) return;
    if (!formData.name.trim()) {
      setActionError('Item Name is required.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      const payload = {
        entity_id: activeEntity.id,
        name: formData.name.trim(),
        sku: formData.sku.trim() || undefined,
        product_type: formData.product_type,
        category: formData.category.trim() || undefined,
        unit: formData.unit.trim().toUpperCase(),
        description: formData.description.trim() || undefined,
        selling_price: Number(formData.selling_price) || 0,
        sales_account_id: formData.sales_account_id,
        tax_rate: Number(formData.tax_rate) || 0,
        purchase_price: Number(formData.purchase_price) || 0,
        purchase_account_id: formData.purchase_account_id,
        hsn_sac_code: formData.hsn_sac_code.trim() || undefined,
        track_inventory: formData.product_type === 'SERVICE' ? false : formData.track_inventory,
        opening_stock: formData.product_type === 'SERVICE' || !formData.track_inventory ? 0 : Number(formData.opening_stock),
        opening_stock_rate: formData.product_type === 'SERVICE' || !formData.track_inventory ? 0 : Number(formData.opening_stock_rate),
        reorder_level: formData.product_type === 'SERVICE' || !formData.track_inventory ? 0 : Number(formData.reorder_level),
        inventory_account_id: formData.product_type === 'SERVICE' || !formData.track_inventory ? undefined : formData.inventory_account_id,
        warehouse_location: formData.product_type === 'SERVICE' || !formData.track_inventory ? undefined : formData.warehouse_location
      };

      if (editingItem) {
        await updateItem(editingItem.id, payload);
        setActionSuccess(`Item '${formData.name}' updated successfully.`);
      } else {
        await createItem(payload);
        setActionSuccess(`Item '${formData.name}' created successfully.`);
      }

      setIsFormModalOpen(false);
      setTimeout(() => setActionSuccess(null), 4000);
      loadItems();
      loadSummaryAndMetadata();
    } catch (err: any) {
      console.error('Error saving item:', err);
      setActionError(err.message || 'Failed to save item. Check SKU uniqueness or field values.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#781019]/10 text-[#781019] rounded-xl border border-[#781019]/20">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Items & Products
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Manage your products and services. Use these items in sales invoices, purchase bills, and inventory.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 px-4 py-2.5 bg-[#781019] text-white hover:bg-[#600d14] rounded-lg font-semibold text-sm shadow-sm transition-all duration-150 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Item</span>
          </button>
        </div>
      </div>

      {/* TOAST NOTIFICATIONS */}
      {actionSuccess && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl shadow-sm text-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl shadow-sm text-sm">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-700 hover:text-rose-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4 SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Items */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Items</span>
            <div className="p-2 bg-[#781019]/10 rounded-lg text-[#781019]">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {summary?.total_items ?? 0}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center space-x-1.5 font-medium">
              <span>{summary?.products_count ?? 0} Products</span>
              <span>•</span>
              <span>{summary?.services_count ?? 0} Services</span>
            </div>
          </div>
        </div>

        {/* Card 2: Inventory Tracked */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inventory Tracked</span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-blue-700 tracking-tight">
              {summary?.inventory_tracked ?? 0}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">
              Products with live stock count
            </div>
          </div>
        </div>

        {/* Card 3: Active Items */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Items</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-700 tracking-tight">
              {summary?.active_items ?? 0}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">
              Available for invoicing & billing
            </div>
          </div>
        </div>

        {/* Card 4: Low Stock Items */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Low Stock Items</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-600 tracking-tight">
              {summary?.low_stock_items ?? 0}
            </div>
            <div className="text-xs text-amber-700 mt-1 font-medium">
              Stock ≤ Reorder threshold
            </div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center space-x-2 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          onClick={() => handleTabChange('ALL')}
          className={`flex items-center space-x-2 py-2.5 px-4 font-bold text-xs border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === 'ALL'
              ? 'border-[#781019] text-[#781019]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>All Items</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">
            {summary?.total_items ?? 0}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('PRODUCTS')}
          className={`flex items-center space-x-2 py-2.5 px-4 font-bold text-xs border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === 'PRODUCTS'
              ? 'border-[#781019] text-[#781019]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Products</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">
            {summary?.products_count ?? 0}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('SERVICES')}
          className={`flex items-center space-x-2 py-2.5 px-4 font-bold text-xs border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === 'SERVICES'
              ? 'border-[#781019] text-[#781019]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Services</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">
            {summary?.services_count ?? 0}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('ACTIVE')}
          className={`flex items-center space-x-2 py-2.5 px-4 font-bold text-xs border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === 'ACTIVE'
              ? 'border-[#781019] text-[#781019]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Active</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
            {summary?.active_items ?? 0}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('INACTIVE')}
          className={`flex items-center space-x-2 py-2.5 px-4 font-bold text-xs border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === 'INACTIVE'
              ? 'border-[#781019] text-[#781019]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Inactive</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700">
            {summary?.inactive_items ?? 0}
          </span>
        </button>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search by Item Name */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by Item Name..."
              value={nameSearch}
              onChange={(e) => {
                setNameSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#781019] focus:border-[#781019]"
            />
          </div>

          {/* Search by SKU */}
          <div className="relative">
            <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by SKU..."
              value={skuSearch}
              onChange={(e) => {
                setSkuSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#781019] focus:border-[#781019]"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#781019] focus:border-[#781019] bg-white"
            >
              <option value="ALL">All Types</option>
              <option value="PRODUCT">Product</option>
              <option value="SERVICE">Service</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#781019] focus:border-[#781019] bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-2">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#781019] focus:border-[#781019] bg-white"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Reset Button */}
            <button
              onClick={handleResetFilters}
              title="Reset all filters"
              className="p-2 border border-slate-300 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ITEMS TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">HSN/SAC</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-right">Purchase Price</th>
                <th className="py-3 px-3 text-center">GST %</th>
                <th className="py-3 px-4 text-right">Stock</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-[#781019]"></div>
                    <p className="mt-2 text-xs">Loading items & products...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">No items found matching criteria</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try adjusting your search terms or create a new item.
                    </p>
                    <button
                      onClick={openCreateModal}
                      className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#781019] text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add New Item</span>
                    </button>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isService = item.product_type === 'SERVICE';
                  const isTracked = !isService && item.track_inventory;
                  const currentStockNum = Number(item.current_stock || 0);
                  const reorderNum = Number(item.reorder_level || item.min_stock_alert || 0);
                  const isLowStock = isTracked && item.is_active && currentStockNum <= reorderNum;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Name & Description preview */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        {item.description && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">
                            {item.description}
                          </div>
                        )}
                      </td>

                      {/* SKU */}
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {item.sku || <span className="text-slate-300">-</span>}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-3">
                        {isService ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            Service
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Product
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3 text-slate-600">
                        {item.category || <span className="text-slate-300">-</span>}
                      </td>

                      {/* HSN/SAC */}
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {item.hsn_sac_code || <span className="text-slate-300">-</span>}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        {currencySymbol}{Number(item.selling_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Purchase Price */}
                      <td className="py-3 px-4 text-right text-slate-600">
                        {currencySymbol}{Number(item.purchase_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* GST % */}
                      <td className="py-3 px-3 text-center text-slate-700 font-mono">
                        {Number(item.tax_rate || 0)}%
                      </td>

                      {/* Stock */}
                      <td className="py-3 px-4 text-right">
                        {isService || !isTracked ? (
                          <span className="text-slate-400">-</span>
                        ) : (
                          <div className="flex items-center justify-end space-x-1.5">
                            <span className={`font-mono font-semibold ${isLowStock ? 'text-amber-600' : 'text-slate-800'}`}>
                              {currentStockNum.toLocaleString('en-IN')} {item.unit || 'PCS'}
                            </span>
                            {isLowStock && (
                              <span title={`Low stock alert (≤ ${reorderNum})`} className="inline-block p-0.5 rounded bg-amber-100 text-amber-700">
                                <AlertTriangle className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        {item.is_active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => openViewModal(item)}
                            title="View Item Details"
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditModal(item)}
                            title="Edit Item"
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(item)}
                            title={item.is_active ? 'Deactivate Item' : 'Activate Item'}
                            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                              item.is_active
                                ? 'text-rose-600 hover:text-rose-800 hover:bg-rose-50'
                                : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                            }`}
                          >
                            {item.is_active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
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

        {/* PAGINATION */}
        <div className="border-t border-slate-200 p-4">
          <Pagination
            page={currentPage}
            pageSize={pageSize}
            totalRecords={totalRecords}
            totalPages={totalPages}
            onPageChange={(p) => setCurrentPage(p)}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* CREATE / EDIT ITEM MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl my-8 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-[#1E0002] text-white">
              <div className="flex items-center space-x-2.5">
                <Package className="w-5 h-5 text-[#E6B676]" />
                <h3 className="font-bold text-base">
                  {editingItem ? 'Edit Item' : 'Create New Item'}
                </h3>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* BASIC INFORMATION SECTION */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-[#781019] uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center space-x-2">
                  <span>Basic Information</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Item Name */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Item Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dell XPS 15 Laptop or Cloud Architecture Consulting"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#781019] focus:border-[#781019]"
                    />
                  </div>

                  {/* SKU */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      SKU (Stock Keeping Unit)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. LAPTOP-XPS-001"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#781019] focus:border-[#781019] font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Must be unique within current company</p>
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.product_type}
                      onChange={(e) => {
                        const newType = e.target.value as 'PRODUCT' | 'SERVICE';
                        let newPurAccId = formData.purchase_account_id;
                        if (newType === 'PRODUCT') {
                          const curAcc = accounts.find(a => a.id === formData.purchase_account_id);
                          if (!curAcc || !isCogsOrPurchaseAccount(curAcc)) {
                            const defaultCogs = cogsAccounts.find(a => a.code === '5700') || cogsAccounts[0];
                            newPurAccId = defaultCogs?.id;
                          }
                        }
                        setFormData({
                          ...formData,
                          product_type: newType,
                          purchase_account_id: newPurAccId,
                          track_inventory: newType === 'SERVICE' ? false : formData.track_inventory
                        });
                      }}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#781019] focus:border-[#781019] bg-white font-semibold"
                    >
                      <option value="PRODUCT">Product (Goods)</option>
                      <option value="SERVICE">Service</option>
                    </select>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      list="category-suggestions"
                      placeholder="e.g. Hardware, Consulting, Software"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#781019] focus:border-[#781019]"
                    />
                    <datalist id="category-suggestions">
                      {categories.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>

                  {/* Unit */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Unit
                    </label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#781019] focus:border-[#781019] bg-white"
                    >
                      <option value="PCS">PCS (Pieces)</option>
                      <option value="NOS">NOS (Numbers)</option>
                      <option value="BOX">BOX (Boxes)</option>
                      <option value="KG">KG (Kilograms)</option>
                      <option value="GM">GM (Grams)</option>
                      <option value="MTR">MTR (Meters)</option>
                      <option value="SET">SET (Sets)</option>
                      <option value="HOURS">HOURS</option>
                      <option value="DAYS">DAYS</option>
                      <option value="MONTHS">MONTHS</option>
                    </select>
                  </div>

                  {/* HSN / SAC */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      HSN / SAC Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 84713010 or 998315"
                      value={formData.hsn_sac_code}
                      onChange={(e) => setFormData({ ...formData, hsn_sac_code: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#781019] focus:border-[#781019] font-mono"
                    />
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Detailed item description used in invoices and purchase bills..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#781019] focus:border-[#781019]"
                    />
                  </div>
                </div>
              </div>

              {/* SALES INFORMATION SECTION */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-[#781019] uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center space-x-2">
                  <span>Sales Information</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Selling Price */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Selling Price ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.selling_price}
                      onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#781019] focus:border-[#781019] font-mono"
                    />
                  </div>

                  {/* Sales Account */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Sales Account (Income)
                    </label>
                    <select
                      value={formData.sales_account_id || ''}
                      onChange={(e) => setFormData({ ...formData, sales_account_id: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#781019] focus:border-[#781019] bg-white font-medium"
                    >
                      <option value="">Select Account...</option>
                      {revenueAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} - {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* GST Rate */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      GST / Tax Rate (%)
                    </label>
                    <select
                      value={formData.tax_rate}
                      onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#781019] focus:border-[#781019] bg-white font-mono"
                    >
                      <option value={0}>0% (Exempt / Nil)</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18% (Standard)</option>
                      <option value={28}>28%</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* PURCHASE INFORMATION SECTION */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-[#781019] uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center space-x-2">
                  <span>Purchase Information</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Purchase Price */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Purchase Price ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.purchase_price}
                      onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#781019] focus:border-[#781019] font-mono"
                    />
                  </div>

                  {/* Purchase Account */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Purchase Account (Expense / COGS)
                    </label>
                    <select
                      value={formData.purchase_account_id || ''}
                      onChange={(e) => setFormData({ ...formData, purchase_account_id: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#781019] focus:border-[#781019] bg-white font-medium"
                    >
                      <option value="">Select Account...</option>
                      {formData.product_type === 'PRODUCT' ? (
                        <>
                          {cogsAccounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.code} - {a.name}
                            </option>
                          ))}
                          {formData.purchase_account_id && !cogsAccounts.some(a => a.id === formData.purchase_account_id) && (() => {
                            const legacyAcc = accounts.find(a => a.id === formData.purchase_account_id);
                            return legacyAcc ? (
                              <option key={legacyAcc.id} value={legacyAcc.id}>
                                {legacyAcc.code} - {legacyAcc.name} (Legacy Account)
                              </option>
                            ) : null;
                          })()}
                        </>
                      ) : (
                        expenseAccounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} - {a.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* INVENTORY SECTION */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                  <h4 className="text-xs font-bold text-[#781019] uppercase tracking-wider">
                    Inventory & Stock Tracking
                  </h4>

                  {/* Track Inventory toggle */}
                  {formData.product_type !== 'SERVICE' && (
                    <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.track_inventory}
                        onChange={(e) => setFormData({ ...formData, track_inventory: e.target.checked })}
                        className="rounded text-[#781019] focus:ring-[#781019] h-4 w-4"
                      />
                      <span>Track Inventory for this Product</span>
                    </label>
                  )}
                </div>

                {formData.product_type === 'SERVICE' ? (
                  <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-lg text-purple-700 text-xs flex items-center space-x-2">
                    <HelpCircle className="w-4 h-4 shrink-0" />
                    <span>Inventory tracking is automatically disabled for services. Services cannot have opening or physical stock.</span>
                  </div>
                ) : !formData.track_inventory ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-xs">
                    Inventory tracking is turned off. Stock levels will not be maintained for this product.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/60 p-4 rounded-xl border border-slate-200">
                    {/* Opening Stock */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Opening Stock
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.opening_stock}
                        onChange={(e) => setFormData({ ...formData, opening_stock: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#781019] focus:border-[#781019] font-mono bg-white"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Initial physical quantity on hand</p>
                    </div>

                    {/* Opening Stock Rate */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Opening Stock Rate ({currencySymbol})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.opening_stock_rate}
                        onChange={(e) => setFormData({ ...formData, opening_stock_rate: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#781019] focus:border-[#781019] font-mono bg-white"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Cost per unit at entry</p>
                    </div>

                    {/* Reorder / Minimum Level */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Reorder / Minimum Level
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.reorder_level}
                        onChange={(e) => setFormData({ ...formData, reorder_level: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#781019] focus:border-[#781019] font-mono bg-white"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Triggers low stock alert when ≤ this level</p>
                    </div>

                    {/* Inventory Asset Account */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Inventory Account (Asset)
                      </label>
                      <select
                        value={formData.inventory_account_id || ''}
                        onChange={(e) => setFormData({ ...formData, inventory_account_id: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#781019] focus:border-[#781019] bg-white font-medium"
                      >
                        <option value="">Select Account...</option>
                        {assetAccounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} - {a.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Warehouse Location */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Warehouse / Storage Location
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Main Warehouse, Shelf B-12"
                        value={formData.warehouse_location}
                        onChange={(e) => setFormData({ ...formData, warehouse_location: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#781019] focus:border-[#781019] bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* MODAL ACTIONS */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#781019] text-white hover:bg-[#600d14] rounded-lg font-semibold text-xs shadow-sm cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingItem ? 'Save Changes' : 'Create Item'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW ITEM DETAILS MODAL */}
      {isViewModalOpen && viewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-[#1E0002] text-white">
              <div className="flex items-center space-x-2.5">
                <Package className="w-5 h-5 text-[#E6B676]" />
                <div>
                  <h3 className="font-bold text-base leading-tight">{viewingItem.name}</h3>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className="text-xs font-mono text-[#E6B676]">{viewingItem.sku || 'No SKU'}</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300">
                      {viewingItem.product_type}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Grid */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Selling Price</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5">
                    {currencySymbol}{Number(viewingItem.selling_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Purchase Price</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5">
                    {currencySymbol}{Number(viewingItem.purchase_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Current Stock</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5">
                    {viewingItem.product_type === 'SERVICE' || !viewingItem.track_inventory
                      ? '-'
                      : `${Number(viewingItem.current_stock || 0).toLocaleString('en-IN')} ${viewingItem.unit || 'PCS'}`}
                  </p>
                </div>
              </div>

              {/* Basic Information */}
              <div>
                <h4 className="font-bold text-[#781019] uppercase tracking-wider border-b border-slate-200 pb-1 mb-3">
                  Basic Attributes
                </h4>
                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
                  <div>
                    <span className="text-slate-500">Category:</span>
                    <span className="ml-2 font-semibold text-slate-800">{viewingItem.category || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Unit:</span>
                    <span className="ml-2 font-semibold text-slate-800">{viewingItem.unit || 'PCS'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">HSN/SAC Code:</span>
                    <span className="ml-2 font-mono font-semibold text-slate-800">{viewingItem.hsn_sac_code || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Status:</span>
                    <span className="ml-2 font-semibold">
                      {viewingItem.is_active ? (
                        <span className="text-emerald-700">Active</span>
                      ) : (
                        <span className="text-slate-500">Inactive</span>
                      )}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500">Description:</span>
                    <p className="mt-1 p-2 bg-slate-50 rounded-lg text-slate-700 border border-slate-200">
                      {viewingItem.description || 'No description provided.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Financial & Accounting Accounts */}
              <div>
                <h4 className="font-bold text-[#781019] uppercase tracking-wider border-b border-slate-200 pb-1 mb-3">
                  Financial & Accounting Mapping
                </h4>
                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
                  <div>
                    <span className="text-slate-500">GST / Tax Rate:</span>
                    <span className="ml-2 font-mono font-semibold text-slate-800">{Number(viewingItem.tax_rate || 0)}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Sales Account:</span>
                    <span className="ml-2 font-semibold text-slate-800">{viewingItem.income_account_name || 'Not mapped'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Purchase Account:</span>
                    <span className="ml-2 font-semibold text-slate-800">{viewingItem.expense_account_name || 'Not mapped'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Inventory Account:</span>
                    <span className="ml-2 font-semibold text-slate-800">{viewingItem.inventory_account_name || 'Not mapped'}</span>
                  </div>
                </div>
              </div>

              {/* Inventory Details (if physical product) */}
              {viewingItem.product_type !== 'SERVICE' && (
                <div>
                  <h4 className="font-bold text-[#781019] uppercase tracking-wider border-b border-slate-200 pb-1 mb-3">
                    Inventory Parameters
                  </h4>
                  <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
                    <div>
                      <span className="text-slate-500">Track Inventory:</span>
                      <span className="ml-2 font-semibold text-slate-800">{viewingItem.track_inventory ? 'Yes' : 'No'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Warehouse Location:</span>
                      <span className="ml-2 font-semibold text-slate-800">{viewingItem.warehouse_location || 'Main Warehouse'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Opening Stock:</span>
                      <span className="ml-2 font-mono font-semibold text-slate-800">
                        {Number(viewingItem.opening_stock || 0)} {viewingItem.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Opening Stock Rate:</span>
                      <span className="ml-2 font-mono font-semibold text-slate-800">
                        {currencySymbol}{Number(viewingItem.opening_stock_rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Reorder Threshold:</span>
                      <span className="ml-2 font-mono font-semibold text-slate-800">
                        {Number(viewingItem.reorder_level || viewingItem.min_stock_alert || 0)} {viewingItem.unit}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setIsViewModalOpen(false);
                  openEditModal(viewingItem);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold cursor-pointer hover:bg-blue-700"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Item</span>
              </button>

              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

