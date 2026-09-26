import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sliders,
  ArrowLeft,
  User,
  CheckCircle2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  HelpCircle,
} from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../context/AuthContext';
import {
  generateAdjustmentReference,
  createAdjustment,
  fetchRecordedStock,
} from '../../../services/adjustmentService';
import { fetchResponsibleUsers } from '../../../services/transferService';
import { fetchWarehousesList } from '../../../services/warehouseService';
import { fetchProducts } from '../../../services/productService';
import type { Warehouse, Location, Product, Profile, OrderStatus, AdjustmentReason } from '../../../types';
import { cn } from '../../../utils/cn';

export const AdjustmentCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [reference, setReference] = useState('');
  const [responsibleId, setResponsibleId] = useState('');
  const [reason, setReason] = useState<AdjustmentReason>('Counting Error');
  const [notes, setNotes] = useState('');

  // Dropdowns state
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [responsibles, setResponsibles] = useState<Profile[]>([]);

  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');

  // Quantities
  const [recordedQuantity, setRecordedQuantity] = useState(0);
  const [countedQuantity, setCountedQuantity] = useState(0);
  const [loadingRecorded, setLoadingRecorded] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    try {
      setLoading(true);
      const [refCode, whRes, prodRes, userList] = await Promise.all([
        generateAdjustmentReference(),
        fetchWarehousesList(),
        fetchProducts(),
        fetchResponsibleUsers(),
      ]);

      const whList = whRes.warehouses || [];
      const prodList = prodRes.products || [];

      setReference(refCode);
      setWarehouses(whList);
      setProducts(prodList);
      setResponsibles(userList);

      if (user?.id) {
        setResponsibleId(user.id);
      } else if (userList.length > 0) {
        setResponsibleId(userList[0].id);
      }

      if (whList.length > 0) {
        const wh = whList[0];
        setSelectedWarehouseId(wh.id);
        const locs = wh.locations || [];
        setLocations(locs);
        if (locs.length > 0) {
          setSelectedLocationId(locs[0].id);
        }
      }

      if (prodList.length > 0) {
        setSelectedProductId(prodList[0].id);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to initialize adjustment form', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Update locations when warehouse changes
  const handleWarehouseChange = (whId: string) => {
    setSelectedWarehouseId(whId);
    const wh = warehouses.find((w) => w.id === whId);
    const locs = wh?.locations || [];
    setLocations(locs);
    if (locs.length > 0) {
      setSelectedLocationId(locs[0].id);
    } else {
      setSelectedLocationId('');
    }
  };

  // Fetch real-time recorded stock on hand when product, warehouse, or location changes
  useEffect(() => {
    if (selectedProductId && selectedWarehouseId && selectedLocationId) {
      loadLiveRecordedStock(selectedProductId, selectedWarehouseId, selectedLocationId);
    }
  }, [selectedProductId, selectedWarehouseId, selectedLocationId]);

  const loadLiveRecordedStock = async (prodId: string, whId: string, locId: string) => {
    try {
      setLoadingRecorded(true);
      const liveStock = await fetchRecordedStock(prodId, whId, locId);
      setRecordedQuantity(liveStock);
      setCountedQuantity(liveStock); // Default counted quantity to current recorded
    } catch (err) {
      console.error('Failed to load recorded stock:', err);
    } finally {
      setLoadingRecorded(false);
    }
  };

  const difference = countedQuantity - recordedQuantity;

  const handleSubmit = async (targetStatus: OrderStatus = 'draft') => {
    try {
      if (!reference.trim()) {
        showToast('Please enter or generate a reference.', 'error');
        return;
      }
      if (!selectedProductId) {
        showToast('Product selection is required.', 'error');
        return;
      }
      if (!selectedWarehouseId || !selectedLocationId) {
        showToast('Warehouse and storage location are required.', 'error');
        return;
      }
      if (countedQuantity < 0) {
        showToast('Counted quantity cannot be negative.', 'error');
        return;
      }

      setSubmitting(true);

      const created = await createAdjustment(
        {
          reference: reference.trim(),
          warehouse_id: selectedWarehouseId,
          location_id: selectedLocationId,
          product_id: selectedProductId,
          theoretical_quantity: recordedQuantity,
          real_quantity: countedQuantity,
          reason,
          notes: notes.trim() || undefined,
          responsible_id: responsibleId || undefined,
          status: targetStatus,
        },
        user?.id
      );

      showToast(
        `Inventory adjustment ${created.reference} created as ${targetStatus}! System stock remains unchanged until validation.`,
        'success'
      );

      navigate(`/operations/adjustments/${created.id}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to create inventory adjustment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
        <p className="text-sm text-slate-400">Loading form requirements...</p>
      </div>
    );
  }

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <PageHeader
        title="Create Inventory Adjustment"
        description="Reconcile recorded system stock against actual physical counts"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/operations/adjustments')}
            className="border-slate-800 text-slate-300 hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Adjustments
          </Button>
        }
      />

      {/* Main Form Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-6">
        {/* Info Banner */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-start gap-3 text-blue-300 text-xs">
          <HelpCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-blue-200">Business Rule Note: </span>
            Draft creation does not alter system stock. Stock levels will only be updated when this adjustment is validated. Formula: <span className="font-mono font-bold text-white">Difference = Counted Quantity - Recorded Quantity</span>.
          </div>
        </div>

        {/* Section 1: Reference, Responsible & Reason */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Reference */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Reference Code <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. ADJ/0001"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono font-bold text-blue-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Adjustment Reason <span className="text-red-400">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as AdjustmentReason)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="Damaged">Damaged</option>
              <option value="Lost">Lost</option>
              <option value="Found">Found</option>
              <option value="Counting Error">Counting Error</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Responsible User */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Responsible User
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select
                value={responsibleId}
                onChange={(e) => setResponsibleId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">Unassigned</option>
                {responsibles.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Product & Storage Location */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/60 border border-slate-800/80 rounded-xl p-5">
          {/* Product */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Select Product <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="">Select Product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.sku}] {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Warehouse */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Warehouse <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => handleWarehouseChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="">Select Warehouse...</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} - {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Storage Bin Location <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              disabled={!selectedWarehouseId || locations.length === 0}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            >
              {locations.length === 0 ? (
                <option value="">No locations in warehouse</option>
              ) : (
                locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} - {loc.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Section 3: Quantity Formula Calculation Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" /> Quantity Reconciliation Formula
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Recorded Quantity */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] text-slate-400 font-medium block">
                Recorded Quantity (System)
              </span>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold font-mono text-slate-200">
                  {loadingRecorded ? (
                    <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                  ) : (
                    `${recordedQuantity} ${selectedProduct?.unit_of_measure || 'Units'}`
                  )}
                </span>
                <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded font-mono">
                  Theoretical
                </span>
              </div>
            </div>

            {/* Counted Quantity */}
            <div className="bg-slate-900 border border-blue-500/40 rounded-xl p-4 space-y-1">
              <label className="text-[11px] text-blue-300 font-bold block">
                Counted Quantity (Physical) <span className="text-red-400">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={countedQuantity}
                  onChange={(e) => setCountedQuantity(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-lg font-bold font-mono text-white focus:outline-none focus:border-blue-500"
                />
                <span className="text-xs text-slate-400 font-medium shrink-0">
                  {selectedProduct?.unit_of_measure || 'Units'}
                </span>
              </div>
            </div>

            {/* Difference Result */}
            <div
              className={cn(
                'border rounded-xl p-4 space-y-1 transition-colors',
                difference > 0
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : difference < 0
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              )}
            >
              <span className="text-[11px] font-medium block opacity-80">
                Difference (Counted - Recorded)
              </span>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold font-mono">
                  {difference > 0 ? `+${difference}` : difference}{' '}
                  {selectedProduct?.unit_of_measure || 'Units'}
                </span>
                {difference > 0 ? (
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                ) : difference < 0 ? (
                  <TrendingDown className="w-5 h-5 text-rose-400" />
                ) : (
                  <span className="text-xs text-slate-500">No Variance</span>
                )}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-mono bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
            Formula Check: {countedQuantity} (Counted) - {recordedQuantity} (Recorded) ={' '}
            <span className="font-bold text-white">
              {difference >= 0 ? `+${difference}` : difference} Units
            </span>
          </div>
        </div>

        {/* Section 4: Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">
            Notes & Inspection Comments
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Specify reason for discrepancy or physical count details..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Section 5: Form Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/operations/adjustments')}
            className="border-slate-800 text-slate-400 hover:bg-slate-800"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => handleSubmit('draft')}
              className="border-slate-700 text-amber-400 hover:bg-amber-500/10 font-semibold"
            >
              Save as Draft
            </Button>

            <Button
              variant="primary"
              size="sm"
              disabled={submitting}
              onClick={() => handleSubmit('ready')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Mark as Ready
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
