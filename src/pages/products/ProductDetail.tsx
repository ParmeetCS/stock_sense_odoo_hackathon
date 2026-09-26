import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Layers,
  History,
  Building2,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  ArrowDownLeft,
  Sliders,
  ShieldCheck,
  Tag,
  Info,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import {
  fetchProductById,
  updateProduct,
  deleteProduct,
  fetchCategories,
  createCategory,
} from '../../services/productService';
import type { Product, Stock, StockLedger, Category } from '../../types';
import { cn } from '../../utils/cn';

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [ledger, setLedger] = useState<StockLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stocks' | 'ledger' | 'specs'>('stocks');
  const [copiedSku, setCopiedSku] = useState(false);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
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
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick Category Add
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatCode, setNewCatCode] = useState('');
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchProductById(id);
      setProduct(data.product);
      setStocks(data.stocks);
      setLedger(data.ledger);
    } catch (err: any) {
      showToast('Product Not Found', err.message || 'Failed to load product details.', 'error');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    fetchCategories().then(setCategories);
  }, [id]);

  // Copy SKU
  const handleCopySku = () => {
    if (!product?.sku) return;
    navigator.clipboard.writeText(product.sku);
    setCopiedSku(true);
    setTimeout(() => setCopiedSku(false), 2000);
  };

  // Open Edit Modal
  const openEdit = () => {
    if (!product) return;
    setEditName(product.name);
    setEditSku(product.sku);
    setEditCategoryId(product.category_id || '');
    setEditUnit(product.unit_of_measure);
    setEditCostPrice(String(product.cost_price));
    setEditSalePrice(String(product.sale_price));
    setEditReorderLevel(String(product.reorder_level));
    setEditReorderQty(String(product.reorder_quantity || 0));
    setEditIsActive(product.is_active);
    setEditDescription(product.description || '');
    setEditError('');
    setIsEditOpen(true);
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsSaving(true);
    setEditError('');
    try {
      const updated = await updateProduct(id, {
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

      showToast('Product Updated', `Product ${updated.name} updated.`, 'success');
      setIsEditOpen(false);
      loadData();
    } catch (err: any) {
      setEditError(err.message || 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Product
  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await deleteProduct(id);
      showToast('Product Deleted', 'Product removed successfully.', 'success');
      navigate('/products');
    } catch (err: any) {
      showToast('Delete Failed', err.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick Category
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
      showToast('Category Created', `Category "${newCat.name}" created.`, 'success');
    } catch (err: any) {
      showToast('Category Error', err.message, 'error');
    } finally {
      setIsCreatingCat(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-xs font-medium">Fetching real-time product inventory and movements...</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Product not found.</p>
        <Button variant="primary" size="sm" onClick={() => navigate('/products')} className="mt-4">
          Return to Products
        </Button>
      </div>
    );
  }

  const onHand = Number(product.on_hand || 0);
  const reserved = Number(product.reserved || 0);
  const freeToUse = Number(product.free_to_use || 0);
  const reorderLevel = Number(product.reorder_level || 0);
  const cost = Number(product.cost_price || 0);
  const sale = Number(product.sale_price || 0);
  const marginPercentage = sale > 0 ? (((sale - cost) / sale) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Breadcrumb & Actions */}
      <PageHeader
        breadcrumbs={[
          { label: 'Inventory', href: '/products' },
          { label: 'Products', href: '/products' },
          { label: `${product.name} (${product.sku})` },
        ]}
        title={product.name}
        description={product.description || 'Master product catalog item and warehouse allocations.'}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/products')}
              className="text-xs text-slate-300"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={openEdit}
              className="text-xs"
            >
              <Edit2 className="w-4 h-4 mr-1.5 text-blue-400" /> Edit Product
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/operations/adjustments/new')}
              className="text-xs text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
              title="Record Inventory Adjustment"
            >
              <Sliders className="w-4 h-4 mr-1.5" /> Adjust Stock
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/operations/receipts/new')}
              className="text-xs text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10"
              title="Receive Inbound Stock"
            >
              <ArrowDownLeft className="w-4 h-4 mr-1.5" /> Receive Stock
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteOpen(true)}
              className="text-xs text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      {/* Product Overview Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-extrabold text-2xl shadow-inner">
              {product.name.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-bold text-white tracking-tight">{product.name}</h2>
                {product.is_active ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Inactive
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <div className="inline-flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500">SKU:</span>
                  <span className="font-mono font-bold text-blue-300">{product.sku}</span>
                  <button
                    onClick={handleCopySku}
                    className="p-0.5 text-slate-500 hover:text-slate-200"
                    title="Copy SKU"
                  >
                    {copiedSku ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                {product.category?.name && (
                  <div className="inline-flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
                    <Tag className="w-3 h-3 text-slate-500" />
                    <span>{product.category.name}</span>
                  </div>
                )}

                <div className="inline-flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Unit:</span>
                  <span className="font-mono text-white">{product.unit_of_measure}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Reorder Health Status Badge */}
          <div className="flex items-center gap-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 self-start lg:self-center">
            {onHand <= 0 ? (
              <div className="flex items-center gap-3 text-red-400">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-red-400">Inventory Status</div>
                  <div className="text-sm font-bold text-white">Out of Stock (0 On Hand)</div>
                </div>
              </div>
            ) : onHand <= reorderLevel ? (
              <div className="flex items-center gap-3 text-amber-400">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Inventory Status</div>
                  <div className="text-sm font-bold text-white">Low Stock (≤ {reorderLevel} Safety Point)</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-emerald-400">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Inventory Status</div>
                  <div className="text-sm font-bold text-white">Adequate Stock Level</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Real-time Inventory Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total On Hand</span>
            <div className="text-2xl font-extrabold text-white font-mono">
              {onHand.toLocaleString()} <span className="text-xs font-normal text-slate-400">{product.unit_of_measure}</span>
            </div>
            <p className="text-[10px] text-slate-500">Physical inventory present across all bins</p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Reserved For Orders</span>
            <div className="text-2xl font-extrabold text-amber-400 font-mono">
              {reserved.toLocaleString()} <span className="text-xs font-normal text-slate-400">{product.unit_of_measure}</span>
            </div>
            <p className="text-[10px] text-slate-500">Allocated for pending customer deliveries</p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Free To Use</span>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono">
              {freeToUse.toLocaleString()} <span className="text-xs font-normal text-slate-400">{product.unit_of_measure}</span>
            </div>
            <p className="text-[10px] text-slate-500">Immediately available for new operations</p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Reorder Strategy</span>
            <div className="text-sm font-bold text-white font-mono flex items-center justify-between pt-1">
              <span>Point: <strong className="text-amber-300">{reorderLevel}</strong></span>
              <span>Batch: <strong className="text-blue-300">{product.reorder_quantity || 0}</strong></span>
            </div>
            <p className="text-[10px] text-slate-500">Automated replenishment thresholds</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 text-xs font-semibold gap-2">
        <button
          onClick={() => setActiveTab('stocks')}
          className={cn(
            'flex items-center gap-2 px-4 py-3 border-b-2 transition-all',
            activeTab === 'stocks'
              ? 'border-blue-500 text-blue-400 font-bold bg-blue-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          )}
        >
          <Building2 className="w-4 h-4" />
          <span>Warehouse Allocations ({stocks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={cn(
            'flex items-center gap-2 px-4 py-3 border-b-2 transition-all',
            activeTab === 'ledger'
              ? 'border-blue-500 text-blue-400 font-bold bg-blue-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          )}
        >
          <History className="w-4 h-4" />
          <span>Stock Movement Ledger ({ledger.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('specs')}
          className={cn(
            'flex items-center gap-2 px-4 py-3 border-b-2 transition-all',
            activeTab === 'specs'
              ? 'border-blue-500 text-blue-400 font-bold bg-blue-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          )}
        >
          <Info className="w-4 h-4" />
          <span>Master Specifications & Financials</span>
        </button>
      </div>

      {/* Tab 1: Stocks Breakdown */}
      {activeTab === 'stocks' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" /> Stock by Warehouse & Location Bin
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              Live balances synced with Supabase inventory tables
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Warehouse Facility</th>
                  <th className="px-4 py-3">Bin / Location</th>
                  <th className="px-4 py-3 text-right">On Hand</th>
                  <th className="px-4 py-3 text-right">Reserved</th>
                  <th className="px-4 py-3 text-right">Free To Use</th>
                  <th className="px-4 py-3 text-right">Last Movement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200">
                {stocks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No stock records currently exist for this product. Use Inbound Receipts or Stock Adjustments to
                      allocate inventory.
                    </td>
                  </tr>
                ) : (
                  stocks.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span className="font-semibold text-white">{st.warehouse?.name || 'Main Warehouse'}</span>
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                            {st.warehouse?.code || 'WH01'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-blue-400" />
                          <span className="font-mono text-blue-300 font-bold">{st.location?.code || 'LOC-A1'}</span>
                          <span className="text-slate-400 text-[11px]">({st.location?.name || 'Bin A1'})</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-white">
                        {Number(st.on_hand).toLocaleString()} {product.unit_of_measure}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-amber-400">
                        {Number(st.reserved) > 0 ? `${Number(st.reserved).toLocaleString()} ${product.unit_of_measure}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                        {Number(st.free_to_use).toLocaleString()} {product.unit_of_measure}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400 font-mono text-[11px]">
                        {st.updated_at ? new Date(st.updated_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Stock Ledger Audit Trail */}
      {activeTab === 'ledger' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" /> Product Stock Ledger & Transaction Log
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Immutable append-only audit trail</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Operation Type</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Warehouse / Bin</th>
                  <th className="px-4 py-3 text-right">Quantity Delta</th>
                  <th className="px-4 py-3 text-right">Balance After</th>
                  <th className="px-4 py-3">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200">
                {ledger.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No stock movement history recorded for this SKU yet.
                    </td>
                  </tr>
                ) : (
                  ledger.map((entry) => {
                    const isPositive = Number(entry.quantity_change) > 0;
                    return (
                      <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                          {entry.created_at ? new Date(entry.created_at).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                              entry.entry_type === 'initial' && 'bg-purple-500/10 text-purple-300 border border-purple-500/30',
                              entry.entry_type === 'receipt' && 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30',
                              entry.entry_type === 'delivery' && 'bg-blue-500/10 text-blue-300 border border-blue-500/30',
                              entry.entry_type === 'adjustment' && 'bg-amber-500/10 text-amber-300 border border-amber-500/30',
                              (entry.entry_type === 'transfer_in' || entry.entry_type === 'transfer_out') &&
                                'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30'
                            )}
                          >
                            {entry.entry_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-300">
                          {entry.reference}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {entry.warehouse?.code || 'WH01'} / {entry.location?.code || 'BIN'}
                        </td>
                        <td
                          className={cn(
                            'px-4 py-3 text-right font-mono font-bold',
                            isPositive ? 'text-emerald-400' : 'text-red-400'
                          )}
                        >
                          {isPositive ? `+${entry.quantity_change}` : entry.quantity_change} {product.unit_of_measure}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-white">
                          {Number(entry.balance_after).toLocaleString()} {product.unit_of_measure}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-[11px] truncate max-w-[120px]">
                          {entry.user?.full_name || entry.user?.email || 'System Operation'}
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

      {/* Tab 3: Specs & Financials */}
      {activeTab === 'specs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Master Info */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800">
              Master Catalog Metadata
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Product Name</span>
                <span className="font-semibold text-white">{product.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Master SKU</span>
                <span className="font-mono font-bold text-blue-300">{product.sku}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Category</span>
                <span className="text-slate-200">{product.category?.name || 'None'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Unit of Measure</span>
                <span className="font-mono text-white">{product.unit_of_measure}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Active Operational Status</span>
                <span className="text-white">{product.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Created At</span>
                <span className="font-mono text-slate-400">
                  {product.created_at ? new Date(product.created_at).toLocaleDateString() : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Last Updated</span>
                <span className="font-mono text-slate-400">
                  {product.updated_at ? new Date(product.updated_at).toLocaleDateString() : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Financials & Reordering Policy */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800">
              Financials & Reorder Rules
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Cost Price</span>
                <span className="font-mono font-bold text-white">${cost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Sale Price</span>
                <span className="font-mono font-bold text-white">${sale.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Unit Profit Margin</span>
                <span className="font-mono font-bold text-emerald-400">{marginPercentage}% (${(sale - cost).toFixed(2)})</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Reorder Safety Point</span>
                <span className="font-mono font-bold text-amber-300">≤ {reorderLevel} {product.unit_of_measure}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Default Reorder Batch</span>
                <span className="font-mono font-bold text-blue-300">{product.reorder_quantity || 0} {product.unit_of_measure}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Total Inventory Valuation</span>
                <span className="font-mono font-bold text-white">${(onHand * cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsEditOpen(false)}
          title={`Edit Product: ${product.sku}`}
          subtitle="Update product catalog specifications, pricing, and reorder triggers."
          maxWidth="lg"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {editError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            {/* Read-only stock protection notice */}
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Stock Integrity Protected:</span> On Hand ({onHand}), Reserved ({reserved}), and Free To Use ({freeToUse}) are managed strictly via warehouse transactions and cannot be changed here.
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
                id="modalEditActive"
                checked={editIsActive}
                onChange={(e) => setEditIsActive(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="modalEditActive" className="text-xs font-semibold text-slate-300 cursor-pointer">
                Product is active for operations (receiving, deliveries, internal transfers)
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isSaving}>
                {isSaving ? 'Saving Changes...' : 'Save Product Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Dialog */}
      {isDeleteOpen && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={handleDelete}
          title="Delete Product"
          message={`Are you sure you want to delete product "${product.name}" (${product.sku})? This action cannot be undone.`}
          confirmLabel="Delete Product"
          loading={isDeleting}
        />
      )}

      {/* Category Modal */}
      {showCatModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowCatModal(false)}
          title="Create New Category"
          maxWidth="sm"
        >
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <FormField label="Category Name" required>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                required
                autoFocus
              />
            </FormField>
            <FormField label="Category Code">
              <input
                type="text"
                value={newCatCode}
                onChange={(e) => setNewCatCode(e.target.value.toUpperCase())}
                className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              />
            </FormField>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCatModal(false)}>
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
