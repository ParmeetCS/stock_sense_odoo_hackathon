import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  ArrowLeft,
  Save,
  Plus,
  Layers,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';
import {
  createProduct,
  checkSkuUnique,
  fetchCategories,
  fetchWarehouses,
  fetchLocations,
  createCategory,
} from '../../services/productService';
import type { Category, Warehouse, Location } from '../../types';

export const ProductCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  // Form State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unitOfMeasure, setUnitOfMeasure] = useState('Units');
  const [costPrice, setCostPrice] = useState('0.00');
  const [salePrice, setSalePrice] = useState('0.00');
  const [reorderLevel, setReorderLevel] = useState('10');
  const [reorderQuantity, setReorderQuantity] = useState('20');
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState('');

  // Initial Stock Option
  const [enableInitialStock, setEnableInitialStock] = useState(false);
  const [initialWarehouseId, setInitialWarehouseId] = useState('');
  const [initialLocationId, setInitialLocationId] = useState('');
  const [initialQuantity, setInitialQuantity] = useState('0');

  // Metadata dropdowns
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Validation & Loading
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skuChecking, setSkuChecking] = useState(false);
  const [skuStatus, setSkuStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

  // Quick Category Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatCode, setNewCatCode] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Load dropdown data
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

        if (whs.length > 0) {
          setInitialWarehouseId(whs[0].id);
        }
      } catch (err) {
        console.error('Failed to load initial form data:', err);
      }
    }
    loadMeta();
  }, []);

  // Update available locations when warehouse changes
  const filteredLocations = initialWarehouseId
    ? locations.filter((loc) => loc.warehouse_id === initialWarehouseId)
    : locations;

  useEffect(() => {
    if (filteredLocations.length > 0 && !filteredLocations.some((l) => l.id === initialLocationId)) {
      setInitialLocationId(filteredLocations[0].id);
    }
  }, [initialWarehouseId, filteredLocations]);

  // SKU Uniqueness Check
  const handleSkuBlur = async () => {
    const trimmed = sku.trim().toUpperCase();
    if (!trimmed) {
      setSkuStatus('idle');
      return;
    }

    setSkuChecking(true);
    try {
      const isUnique = await checkSkuUnique(trimmed);
      if (isUnique) {
        setSkuStatus('valid');
        setErrors((prev) => {
          const next = { ...prev };
          delete next.sku;
          return next;
        });
      } else {
        setSkuStatus('invalid');
        setErrors((prev) => ({ ...prev, sku: `SKU "${trimmed}" already exists.` }));
      }
    } catch {
      setSkuStatus('idle');
    } finally {
      setSkuChecking(false);
    }
  };

  // Generate Suggested SKU
  const generateSku = () => {
    const cat = categories.find((c) => c.id === categoryId);
    const prefix = cat?.code || (name ? name.substring(0, 3).toUpperCase() : 'SKU');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const suggested = `${prefix}-${randomNum}`;
    setSku(suggested);
    setSkuStatus('idle');
  };

  // Profit Margin Calculation
  const cost = Number(costPrice) || 0;
  const sale = Number(salePrice) || 0;
  const marginPercentage = sale > 0 ? (((sale - cost) / sale) * 100).toFixed(1) : '0.0';
  const profitPerUnit = (sale - cost).toFixed(2);

  // Validate form
  const validateForm = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Product name is required.';
    }

    if (!sku.trim()) {
      newErrors.sku = 'SKU is required.';
    } else {
      const isUnique = await checkSkuUnique(sku.trim().toUpperCase());
      if (!isUnique) {
        newErrors.sku = `SKU "${sku.trim().toUpperCase()}" is already taken.`;
      }
    }

    if (Number(costPrice) < 0) {
      newErrors.costPrice = 'Cost price cannot be negative.';
    }

    if (Number(salePrice) < 0) {
      newErrors.salePrice = 'Sale price cannot be negative.';
    }

    if (Number(reorderLevel) < 0) {
      newErrors.reorderLevel = 'Reorder level must be 0 or greater.';
    }

    if (Number(reorderQuantity) < 0) {
      newErrors.reorderQuantity = 'Reorder quantity must be 0 or greater.';
    }

    if (enableInitialStock) {
      if (Number(initialQuantity) <= 0) {
        newErrors.initialQuantity = 'Initial quantity must be greater than 0.';
      }
      if (!initialWarehouseId) {
        newErrors.initialWarehouse = 'Warehouse is required for initial stock.';
      }
      if (!initialLocationId) {
        newErrors.initialLocation = 'Location/Bin is required for initial stock.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Form Submission
  const handleSubmit = async (createAnother = false) => {
    const isValid = await validateForm();
    if (!isValid) {
      showToast('Validation Error', 'Please check the highlighted fields.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createProduct(
        {
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          category_id: categoryId || undefined,
          unit_of_measure: unitOfMeasure.trim() || 'Units',
          cost_price: Number(costPrice) || 0,
          sale_price: Number(salePrice) || 0,
          reorder_level: Number(reorderLevel) || 0,
          reorder_quantity: Number(reorderQuantity) || 0,
          is_active: isActive,
          description: description.trim() || undefined,
          initial_stock: enableInitialStock
            ? {
                warehouse_id: initialWarehouseId,
                location_id: initialLocationId,
                quantity: Number(initialQuantity) || 0,
              }
            : undefined,
        },
        user?.id
      );

      showToast(
        'Product Created',
        `Product ${created.name} (${created.sku}) has been successfully created.`,
        'success'
      );

      if (createAnother) {
        // Reset form for next item
        setName('');
        setSku('');
        setDescription('');
        setCostPrice('0.00');
        setSalePrice('0.00');
        setInitialQuantity('0');
        setEnableInitialStock(false);
        setSkuStatus('idle');
        setErrors({});
      } else {
        navigate(`/products/${created.id}`);
      }
    } catch (err: any) {
      showToast('Creation Failed', err.message || 'Could not save product.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Inline Category Creation
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setIsCreatingCategory(true);
    try {
      const newCat = await createCategory({
        name: newCatName,
        code: newCatCode || undefined,
      });
      setCategories((prev) => [...prev, newCat]);
      setCategoryId(newCat.id);
      setShowCategoryModal(false);
      setNewCatName('');
      setNewCatCode('');
      showToast('Category Created', `Category "${newCat.name}" is now available.`, 'success');
    } catch (err: any) {
      showToast('Category Error', err.message, 'error');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb & Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Inventory', href: '/products' },
          { label: 'Products', href: '/products' },
          { label: 'Create New Product' },
        ]}
        title="Create New Product"
        description="Add a new SKU to your master catalog with automated stock ledger initialization."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/products')}
              disabled={isSubmitting}
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
            >
              Save & Create Another
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {isSubmitting ? 'Saving...' : 'Save Product'}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main 2-Column Form Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Section 1: General Information */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Package className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">General Information</h3>
            </div>

            <FormField label="Product Name" required error={errors.name}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ergonomic Office Chair V2"
                className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                autoFocus
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="SKU Code"
                required
                error={errors.sku}
                helperText={
                  skuStatus === 'valid'
                    ? '✓ SKU is unique and available'
                    : 'Unique alphanumeric master code'
                }
              >
                <div className="relative">
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => {
                      setSku(e.target.value.toUpperCase());
                      setSkuStatus('idle');
                    }}
                    onBlur={handleSkuBlur}
                    placeholder="e.g. CHAIR-ERG-01"
                    className="w-full h-9 pl-3 pr-20 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-blue-300 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {skuChecking ? (
                      <span className="text-[10px] text-slate-400 animate-pulse">Checking...</span>
                    ) : skuStatus === 'valid' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : skuStatus === 'invalid' ? (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    ) : null}
                    <button
                      type="button"
                      onClick={generateSku}
                      title="Auto-generate SKU"
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-medium"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" />
                    </button>
                  </div>
                </div>
              </FormField>

              <FormField label="Category">
                <div className="flex gap-2">
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.code ? `(${c.code})` : ''}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCategoryModal(true)}
                    className="h-9 px-2.5 text-xs text-slate-300"
                    title="Add new category"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Unit of Measure" required>
                <select
                  value={unitOfMeasure}
                  onChange={(e) => setUnitOfMeasure(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="Units">Units (Count)</option>
                  <option value="Pcs">Pcs (Pieces)</option>
                  <option value="Box">Box (Carton)</option>
                  <option value="Pallet">Pallet</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="g">Grams (g)</option>
                  <option value="L">Liters (L)</option>
                  <option value="m">Meters (m)</option>
                  <option value="Pack">Pack</option>
                </select>
              </FormField>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">Active Catalog Status</span>
                    <span className="text-[11px] text-slate-400 block">Available for orders and stock ops</span>
                  </div>
                </label>
              </div>
            </div>

            <FormField label="Description & Notes">
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Product attributes, dimensions, handling instructions, supplier part codes..."
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </FormField>
          </div>

          {/* Section 2: Pricing & Reordering Strategy */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Pricing & Reordering Strategy</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Cost Price ($)" error={errors.costPrice} helperText="Unit procurement cost">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full h-9 pl-7 pr-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </FormField>

              <FormField label="Sale Price ($)" error={errors.salePrice} helperText="Standard selling price">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="w-full h-9 pl-7 pr-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </FormField>
            </div>

            {/* Profit Margin Preview Box */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Estimated Unit Gross Margin:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-white">${profitPerUnit}</span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-[11px] font-bold font-mono',
                    Number(marginPercentage) >= 30
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : Number(marginPercentage) > 0
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                      : 'bg-red-500/10 text-red-400 border border-red-500/30'
                  )}
                >
                  {marginPercentage}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <FormField
                label="Reorder Point (Safety Threshold)"
                error={errors.reorderLevel}
                helperText="Alert triggers when on-hand falls at or below this value"
              >
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </FormField>

              <FormField
                label="Reorder Quantity"
                error={errors.reorderQuantity}
                helperText="Recommended replenishment batch size"
              >
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={reorderQuantity}
                  onChange={(e) => setReorderQuantity(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </FormField>
            </div>
          </div>

          {/* Section 3: Initial Inventory Transaction */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Initial Stock Booking</h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableInitialStock}
                  onChange={(e) => setEnableInitialStock(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-purple-600 focus:ring-0 cursor-pointer"
                />
                <span className="text-xs font-semibold text-purple-300">Book Initial Inventory</span>
              </label>
            </div>

            {enableInitialStock ? (
              <div className="space-y-4 animate-fade-in">
                {/* Transaction Notice */}
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">Enterprise Transaction Rule:</span> Initial stock will
                    be recorded via an immutable ledger transaction (<code className="text-purple-300 font-mono">INIT/{sku || 'SKU'}</code>)
                    and assigned to the designated facility and bin.
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <FormField label="Warehouse" required error={errors.initialWarehouse}>
                    <select
                      value={initialWarehouseId}
                      onChange={(e) => setInitialWarehouseId(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} [{w.code}]
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Location / Bin" required error={errors.initialLocation}>
                    <select
                      value={initialLocationId}
                      onChange={(e) => setInitialLocationId(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      {filteredLocations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} [{l.code}]
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Initial Quantity" required error={errors.initialQuantity}>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={initialQuantity}
                      onChange={(e) => setInitialQuantity(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                    />
                  </FormField>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Product will be created with <strong className="text-white">0 initial stock</strong>. Stock can later be
                received through Inbound Receipts or Stock Adjustments.
              </p>
            )}
          </div>
        </div>

        {/* Sidebar Summary & Guidance Card */}
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-400" /> Catalog Rules
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <span>
                  <strong>SKU Uniqueness:</strong> Every SKU is enforced unique across the entire database.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <span>
                  <strong>Stock Protection:</strong> Stock values (<code className="text-blue-300">on_hand</code>, <code className="text-blue-300">reserved</code>, <code className="text-blue-300">free_to_use</code>) cannot be modified manually.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <span>
                  <strong>Replenishment:</strong> Reorder point triggers automated low-stock warnings on your operations dashboard.
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-blue-950/40 to-slate-900/80 border border-blue-900/40 rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" /> Summary Preview
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">SKU</span>
                <span className="font-mono font-bold text-blue-300">{sku || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Unit</span>
                <span className="font-mono text-white">{unitOfMeasure}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Reorder Trigger</span>
                <span className="font-mono text-amber-300">≤ {reorderLevel}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Initial Stock</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {enableInitialStock ? `${initialQuantity} ${unitOfMeasure}` : '0 (None)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inline Quick Category Add Modal */}
      {showCategoryModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowCategoryModal(false)}
          title="Create New Category"
          subtitle="Add a new classification for your inventory catalog"
          maxWidth="sm"
        >
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <FormField label="Category Name" required>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Storage & Organization"
                className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                required
                autoFocus
              />
            </FormField>

            <FormField label="Category Code (Optional)" helperText="Used as SKU prefix">
              <input
                type="text"
                value={newCatCode}
                onChange={(e) => setNewCatCode(e.target.value.toUpperCase())}
                placeholder="e.g. STOR"
                className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              />
            </FormField>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCategoryModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isCreatingCategory}>
                {isCreatingCategory ? 'Creating...' : 'Create Category'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
