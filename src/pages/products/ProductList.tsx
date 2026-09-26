import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Package,
  Plus,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ShieldCheck,
  Copy,
  Check,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import {
  fetchProducts,
  fetchCategories,
  fetchWarehouses,
  fetchLocations,
  updateProduct,
  deleteProduct,
  createCategory,
} from '../../services/productService';
import type { Product, Category, Warehouse, Location } from '../../types';
import { cn } from '../../utils/cn';

export const ProductList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters from URL or default
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [skuSearch, setSkuSearch] = useState(searchParams.get('sku') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [selectedWarehouse, setSelectedWarehouse] = useState(searchParams.get('warehouse') || 'all');
  const [selectedLocation, setSelectedLocation] = useState(searchParams.get('location') || 'all');
  const [stockStatus, setStockStatus] = useState<any>(searchParams.get('status') || 'all');

  // Sorting
  const [sortBy, setSortBy] = useState<any>(searchParams.get('sortBy') || 'name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('sortOrder') as any) || 'asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Edit Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editUnit, setEditUnit] = useState('Units');
  const [editCostPrice, setEditCostPrice] = useState('0');
  const [editSalePrice, setEditSalePrice] = useState('0');
  const [editReorderLevel, setEditReorderLevel] = useState('10');
  const [editReorderQty, setEditReorderQty] = useState('0');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editDescription, setEditDescription] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Dialog State
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Copied SKU feedback
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  // Category quick-add state
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatCode, setNewCatCode] = useState('');
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  // Load initial dropdown metadata
  useEffect(() => {
    async function loadMeta() {
      try {
        const [cats, whs, locs] = await Promise.all([
          fetchCategories(),
          fetchWarehouses(),
          fetchLocations(),
        ]);
        setCategories(cats);
        setWarehouses(whs);
        setLocations(locs);
      } catch (err) {
        console.error('Failed to load filter metadata:', err);
      }
    }
    loadMeta();
  }, []);

  // Filter locations if warehouse changes
  const availableLocations = selectedWarehouse !== 'all'
    ? locations.filter((l) => l.warehouse_id === selectedWarehouse)
    : locations;

  // Load products whenever filters/sort/page change
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchProducts({
        search,
        sku: skuSearch,
        categoryId: selectedCategory,
        warehouseId: selectedWarehouse,
        locationId: selectedLocation,
        stockStatus,
        sortBy,
        sortOrder,
        page: currentPage,
        pageSize,
      });

      setProducts(res.products);
      setTotalRecords(res.totalCount);
      setTotalPages(res.totalPages);

      // Sync with URL query params
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (skuSearch) params.set('sku', skuSearch);
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (selectedWarehouse !== 'all') params.set('warehouse', selectedWarehouse);
      if (selectedLocation !== 'all') params.set('location', selectedLocation);
      if (stockStatus !== 'all') params.set('status', stockStatus);
      if (sortBy !== 'name') params.set('sortBy', sortBy);
      if (sortOrder !== 'asc') params.set('sortOrder', sortOrder);
      if (currentPage > 1) params.set('page', String(currentPage));
      setSearchParams(params, { replace: true });
    } catch (err: any) {
      showToast('Failed to load products', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [
    search,
    skuSearch,
    selectedCategory,
    selectedWarehouse,
    selectedLocation,
    stockStatus,
    sortBy,
    sortOrder,
    currentPage,
    pageSize,
  ]);

  // Handle Sort Click
  const handleSort = (field: any) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setSkuSearch('');
    setSelectedCategory('all');
    setSelectedWarehouse('all');
    setSelectedLocation('all');
    setStockStatus('all');
    setSortBy('name');
    setSortOrder('asc');
    setCurrentPage(1);
  };

  // Copy SKU to clipboard
  const handleCopySku = (sku: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  // Open Edit Modal
  const openEditModal = (p: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProduct(p);
    setEditName(p.name);
    setEditSku(p.sku);
    setEditCategoryId(p.category_id || '');
    setEditUnit(p.unit_of_measure || 'Units');
    setEditCostPrice(String(p.cost_price || 0));
    setEditSalePrice(String(p.sale_price || 0));
    setEditReorderLevel(String(p.reorder_level || 10));
    setEditReorderQty(String(p.reorder_quantity || 0));
    setEditIsActive(p.is_active);
    setEditDescription(p.description || '');
    setEditError('');
  };

  // Submit Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editName.trim()) {
      setEditError('Product name is required');
      return;
    }
    if (!editSku.trim()) {
      setEditError('SKU is required');
      return;
    }

    setIsUpdating(true);
    setEditError('');
    try {
      await updateProduct(editingProduct.id, {
        name: editName,
        sku: editSku,
        category_id: editCategoryId || undefined,
        unit_of_measure: editUnit,
        cost_price: Number(editCostPrice) || 0,
        sale_price: Number(editSalePrice) || 0,
        reorder_level: Number(editReorderLevel) || 0,
        reorder_quantity: Number(editReorderQty) || 0,
        is_active: editIsActive,
        description: editDescription,
      });

      showToast('Product updated', `Product "${editName}" was successfully updated.`, 'success');
      setEditingProduct(null);
      loadData();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update product');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      await deleteProduct(deletingProduct.id);
      showToast('Product deleted', `Product ${deletingProduct.name} removed.`, 'success');
      setDeletingProduct(null);
      loadData();
    } catch (err: any) {
      showToast('Delete failed', err.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle quick category creation
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setIsCreatingCat(true);
    try {
      const newCat = await createCategory({
        name: newCatName,
        code: newCatCode || undefined,
      });
      setCategories((prev) => [...prev, newCat]);
      setEditCategoryId(newCat.id);
      setShowCatModal(false);
      setNewCatName('');
      setNewCatCode('');
      showToast('Category created', `Category "${newCat.name}" added.`, 'success');
    } catch (err: any) {
      showToast('Failed to create category', err.message, 'error');
    } finally {
      setIsCreatingCat(false);
    }
  };

  // KPIs calculation from loaded items
  const inStockCount = products.filter((p) => (p.on_hand || 0) > (p.reorder_level || 0)).length;
  const lowStockCount = products.filter(
    (p) => (p.on_hand || 0) > 0 && (p.on_hand || 0) <= (p.reorder_level || 0)
  ).length;
  const outOfStockCount = products.filter((p) => (p.on_hand || 0) <= 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Product Management"
        description="Enterprise master catalog, dynamic multi-facility stock visibility, and replenishment points."
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/products/new')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              New Product
            </Button>
          </div>
        }
      />

      {/* KPI Stat Ribbons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Catalog</div>
            <div className="text-xl font-bold text-white font-mono">{totalRecords}</div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Adequate Stock</div>
            <div className="text-xl font-bold text-emerald-400 font-mono">{inStockCount}</div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Low Stock Alert</div>
            <div className="text-xl font-bold text-amber-400 font-mono">{lowStockCount}</div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Out of Stock</div>
            <div className="text-xl font-bold text-red-400 font-mono">{outOfStockCount}</div>
          </div>
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 space-y-3.5 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Main Search & Dedicated SKU Search */}
          <div className="flex flex-1 flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search products, description, category..."
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="relative w-full sm:w-48">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 px-1 py-0.5 rounded border border-blue-500/20">
                SKU
              </span>
              <input
                type="text"
                value={skuSearch}
                onChange={(e) => {
                  setSkuSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Exact SKU..."
                className="w-full h-9 pl-12 pr-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Status Segmented Buttons */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs overflow-x-auto">
            {[
              { id: 'all', label: 'All' },
              { id: 'in_stock', label: 'In Stock' },
              { id: 'low_stock', label: 'Low Stock' },
              { id: 'out_of_stock', label: 'Out of Stock' },
              { id: 'active', label: 'Active' },
              { id: 'inactive', label: 'Inactive' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => {
                  setStockStatus(st.id);
                  setCurrentPage(1);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-md font-medium transition-all whitespace-nowrap',
                  stockStatus === st.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                )}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/60">
          {/* Category Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-8 px-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.code ? `(${c.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Warehouse Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Warehouse
            </label>
            <select
              value={selectedWarehouse}
              onChange={(e) => {
                setSelectedWarehouse(e.target.value);
                setSelectedLocation('all');
                setCurrentPage(1);
              }}
              className="w-full h-8 px-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} [{w.code}]
                </option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Location / Bin
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => {
                setSelectedLocation(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-8 px-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Locations</option>
              {availableLocations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} [{l.code}]
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Action */}
          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="w-full h-8 text-xs text-slate-400 hover:text-white"
            >
              Reset All Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Main Products Data Table */}
      <div className="w-full rounded-xl border border-slate-800 bg-slate-900/70 shadow-lg overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400 select-none">
                <th
                  onClick={() => handleSort('name')}
                  className="px-4 py-3.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Product</span>
                    {sortBy === 'name' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('sku')}
                  className="px-4 py-3.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>SKU</span>
                    {sortBy === 'sku' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('category')}
                  className="px-4 py-3.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Category</span>
                    {sortBy === 'category' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3.5">Unit</th>
                <th
                  onClick={() => handleSort('on_hand')}
                  className="px-4 py-3.5 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>On Hand</span>
                    {sortBy === 'on_hand' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('reserved')}
                  className="px-4 py-3.5 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Reserved</span>
                    {sortBy === 'reserved' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('free_to_use')}
                  className="px-4 py-3.5 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Free To Use</span>
                    {sortBy === 'free_to_use' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3.5">Warehouse</th>
                <th className="px-4 py-3.5">Location</th>
                <th
                  onClick={() => handleSort('status')}
                  className="px-4 py-3.5 text-center cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Reorder Status</span>
                    {sortBy === 'status' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                      <span className="text-xs font-medium">Querying Supabase real-time stock balances...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                        <Package className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-bold text-white">No products found</h4>
                      <p className="text-xs text-slate-400">
                        Try adjusting your filters or create a new product to populate your inventory catalog.
                      </p>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate('/products/new')}
                        className="mt-2"
                      >
                        <Plus className="w-4 h-4 mr-1.5" /> Create Product
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((prod) => {
                  const onHand = Number(prod.on_hand || 0);
                  const reserved = Number(prod.reserved || 0);
                  const freeToUse = Number(prod.free_to_use || 0);
                  const reorderLevel = Number(prod.reorder_level || 0);

                  return (
                    <tr
                      key={prod.id}
                      onClick={() => navigate(`/products/${prod.id}`)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      {/* Product Name & Description */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold shrink-0">
                            {prod.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 max-w-[200px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                                {prod.name}
                              </span>
                              {!prod.is_active && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
                                  Inactive
                                </span>
                              )}
                            </div>
                            {prod.description && (
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                {prod.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                            {prod.sku}
                          </span>
                          <button
                            onClick={(e) => handleCopySku(prod.sku, e)}
                            title="Copy SKU"
                            className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                          >
                            {copiedSku === prod.sku ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3">
                        {prod.category?.name ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            {prod.category.name}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Uncategorized</span>
                        )}
                      </td>

                      {/* Unit */}
                      <td className="px-4 py-3 text-slate-300 font-mono text-[11px]">
                        {prod.unit_of_measure}
                      </td>

                      {/* On Hand */}
                      <td className="px-4 py-3 text-right font-mono font-bold text-white">
                        {onHand.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </td>

                      {/* Reserved */}
                      <td className="px-4 py-3 text-right font-mono text-amber-400/90">
                        {reserved > 0 ? (
                          <span>{reserved.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                        ) : (
                          <span className="text-slate-600">0</span>
                        )}
                      </td>

                      {/* Free To Use */}
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                        {freeToUse.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </td>

                      {/* Warehouse */}
                      <td className="px-4 py-3 text-slate-300 truncate max-w-[130px]">
                        <span className="text-xs">{prod.warehouse_name}</span>
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px] truncate max-w-[110px]">
                        {prod.location_name}
                      </td>

                      {/* Reorder Status */}
                      <td className="px-4 py-3 text-center">
                        {onHand <= 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            Out of Stock
                          </span>
                        ) : onHand <= reorderLevel ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Low Stock (≤{reorderLevel})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            In Stock
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => navigate(`/products/${prod.id}`)}
                            title="View Product Details"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => openEditModal(prod, e)}
                            title="Edit Product"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingProduct(prod)}
                            title="Delete Product"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Table Footer with Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-900/90 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-white">{products.length}</strong> of{' '}
              <strong className="text-white">{totalRecords}</strong> products
            </span>
            <div className="flex items-center gap-1.5 pl-3 border-l border-slate-800">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-white"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="h-8 px-2.5"
            >
              Previous
            </Button>
            <span className="px-2 font-mono text-slate-300">
              Page {currentPage} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages || loading}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="h-8 px-2.5"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <Modal
          isOpen={true}
          onClose={() => setEditingProduct(null)}
          title={`Edit Product: ${editingProduct.sku}`}
          subtitle="Update catalog details, pricing, and reordering thresholds."
          maxWidth="lg"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {editError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            {/* Read-only stock notice */}
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Stock Integrity Protected:</span> On Hand, Reserved, and
                Free-To-Use quantities are calculated strictly from inventory transactions and cannot be edited
                directly.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Product Name" required>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </FormField>

              <FormField label="SKU Code" required helperText="Unique master identifier">
                <input
                  type="text"
                  value={editSku}
                  onChange={(e) => setEditSku(e.target.value.toUpperCase())}
                  className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Category">
                <div className="flex gap-2">
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCatModal(true)}
                    className="h-9 px-2"
                  >
                    +
                  </Button>
                </div>
              </FormField>

              <FormField label="Unit of Measure" required>
                <input
                  type="text"
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  placeholder="Units, kg, Pcs, Box..."
                  className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <FormField label="Cost Price ($)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editCostPrice}
                  onChange={(e) => setEditCostPrice(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </FormField>

              <FormField label="Sale Price ($)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editSalePrice}
                  onChange={(e) => setEditSalePrice(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </FormField>

              <FormField label="Reorder Point" helperText="Low stock alert trigger">
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={editReorderLevel}
                  onChange={(e) => setEditReorderLevel(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </FormField>

              <FormField label="Reorder Quantity" helperText="Target replenishment size">
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={editReorderQty}
                  onChange={(e) => setEditReorderQty(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </FormField>
            </div>

            <FormField label="Description / Specification Notes">
              <textarea
                rows={2}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Product attributes, dimensions, barcodes..."
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </FormField>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="editActive"
                checked={editIsActive}
                onChange={(e) => setEditIsActive(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="editActive" className="text-xs font-semibold text-slate-300 cursor-pointer">
                Product is active for operations (receiving, deliveries, internal transfers)
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingProduct(null)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isUpdating}>
                {isUpdating ? 'Saving Changes...' : 'Save Product Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm Dialog */}
      {deletingProduct && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeletingProduct(null)}
          onConfirm={handleConfirmDelete}
          title="Delete Product"
          message={`Are you sure you want to delete "${deletingProduct.name}" (${deletingProduct.sku})? This will permanently remove the product and its associated historical stock references.`}
          confirmLabel="Delete Product"
          loading={isDeleting}
        />
      )}

      {/* Quick Category Add Modal */}
      {showCatModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowCatModal(false)}
          title="Create New Category"
          subtitle="Quickly add a product category"
          maxWidth="sm"
        >
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <FormField label="Category Name" required>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Raw Materials, Finished Goods..."
                className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                required
              />
            </FormField>
            <FormField label="Category Code (Optional)">
              <input
                type="text"
                value={newCatCode}
                onChange={(e) => setNewCatCode(e.target.value.toUpperCase())}
                placeholder="e.g. RAW, FG, ELEC"
                className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              />
            </FormField>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCatModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isCreatingCat}>
                {isCreatingCat ? 'Creating...' : 'Create Category'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
