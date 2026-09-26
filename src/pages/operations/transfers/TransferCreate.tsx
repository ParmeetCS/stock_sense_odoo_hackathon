import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  User,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Package,
} from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../context/AuthContext';
import {
  generateTransferReference,
  createTransfer,
  fetchResponsibleUsers,
  checkFreeToUseStock,
} from '../../../services/transferService';
import { fetchWarehousesList } from '../../../services/warehouseService';
import { fetchProducts } from '../../../services/productService';
import type { Warehouse, Location, Product, Profile, OrderStatus } from '../../../types';
import { cn } from '../../../utils/cn';

interface LineItemRow {
  id: string;
  product_id: string;
  quantity: number;
  available_stock: number;
  loading_stock: boolean;
}

export const TransferCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [reference, setReference] = useState('');
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [responsibleId, setResponsibleId] = useState('');
  const [notes, setNotes] = useState('');

  // Warehouse & Location state
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [responsibles, setResponsibles] = useState<Profile[]>([]);

  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [sourceLocations, setSourceLocations] = useState<Location[]>([]);

  const [destinationWarehouseId, setDestinationWarehouseId] = useState('');
  const [destinationLocationId, setDestinationLocationId] = useState('');
  const [destinationLocations, setDestinationLocations] = useState<Location[]>([]);

  // Line Items
  const [items, setItems] = useState<LineItemRow[]>([
    {
      id: '1',
      product_id: '',
      quantity: 1,
      available_stock: 0,
      loading_stock: false,
    },
  ]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    try {
      setLoading(true);
      const [refCode, whRes, prodRes, userList] = await Promise.all([
        generateTransferReference(),
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

      // Default responsible to current user if present
      if (user?.id) {
        setResponsibleId(user.id);
      } else if (userList.length > 0) {
        setResponsibleId(userList[0].id);
      }

      // Default warehouses if available
      if (whList.length > 0) {
        const wh1 = whList[0];
        setSourceWarehouseId(wh1.id);
        setSourceLocations(wh1.locations || []);

        if (wh1.locations && wh1.locations.length > 0) {
          setSourceLocationId(wh1.locations[0].id);
        }

        // Set destination to second WH or second location
        if (whList.length > 1) {
          const wh2 = whList[1];
          setDestinationWarehouseId(wh2.id);
          setDestinationLocations(wh2.locations || []);
          if (wh2.locations && wh2.locations.length > 0) {
            setDestinationLocationId(wh2.locations[0].id);
          }
        } else if (wh1.locations && wh1.locations.length > 1) {
          setDestinationWarehouseId(wh1.id);
          setDestinationLocations(wh1.locations);
          setDestinationLocationId(wh1.locations[1].id);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to initialize form data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Update source locations when source warehouse changes
  const handleSourceWarehouseChange = (whId: string) => {
    setSourceWarehouseId(whId);
    const selectedWh = warehouses.find((w) => w.id === whId);
    const locs = selectedWh?.locations || [];
    setSourceLocations(locs);
    if (locs.length > 0) {
      setSourceLocationId(locs[0].id);
    } else {
      setSourceLocationId('');
    }
  };

  // Update destination locations when destination warehouse changes
  const handleDestinationWarehouseChange = (whId: string) => {
    setDestinationWarehouseId(whId);
    const selectedWh = warehouses.find((w) => w.id === whId);
    const locs = selectedWh?.locations || [];
    setDestinationLocations(locs);
    if (locs.length > 0) {
      setDestinationLocationId(locs[0].id);
    } else {
      setDestinationLocationId('');
    }
  };

  // Refresh stock levels for all items whenever source location changes
  useEffect(() => {
    if (sourceWarehouseId && sourceLocationId && items.length > 0) {
      items.forEach((item, index) => {
        if (item.product_id) {
          updateItemStock(index, item.product_id);
        }
      });
    }
  }, [sourceWarehouseId, sourceLocationId]);

  const updateItemStock = async (index: number, productId: string) => {
    if (!productId || !sourceWarehouseId || !sourceLocationId) return;

    setItems((prev) =>
      prev.map((row, i) => (i === index ? { ...row, loading_stock: true } : row))
    );

    const stock = await checkFreeToUseStock(
      productId,
      sourceWarehouseId,
      sourceLocationId
    );

    setItems((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              available_stock: stock.free_to_use,
              loading_stock: false,
            }
          : row
      )
    );
  };

  const handleProductChange = (index: number, productId: string) => {
    setItems((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, product_id: productId } : row
      )
    );
    updateItemStock(index, productId);
  };

  const handleQuantityChange = (index: number, qty: number) => {
    setItems((prev) =>
      prev.map((row, i) => (i === index ? { ...row, quantity: qty } : row))
    );
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        product_id: '',
        quantity: 1,
        available_stock: 0,
        loading_stock: false,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      showToast('Transfers must have at least one product line item.', 'warning');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Validations
  const isSourceAndDestSame =
    sourceWarehouseId &&
    destinationWarehouseId &&
    sourceLocationId &&
    destinationLocationId &&
    sourceWarehouseId === destinationWarehouseId &&
    sourceLocationId === destinationLocationId;

  const handleSubmit = async (targetStatus: OrderStatus = 'draft') => {
    try {
      // Basic validations
      if (!reference.trim()) {
        showToast('Please enter or generate a reference.', 'error');
        return;
      }
      if (!sourceWarehouseId || !sourceLocationId) {
        showToast('Valid source warehouse and location are required.', 'error');
        return;
      }
      if (!destinationWarehouseId || !destinationLocationId) {
        showToast('Valid destination warehouse and location are required.', 'error');
        return;
      }
      if (isSourceAndDestSame) {
        showToast('Source location and destination location must be different (source != destination).', 'error');
        return;
      }

      const validItems = items.filter((it) => it.product_id && it.quantity > 0);
      if (validItems.length === 0) {
        showToast('Please add at least one line item with a valid product and positive quantity.', 'error');
        return;
      }

      // Check stock sufficiency
      for (const item of validItems) {
        const prod = products.find((p) => p.id === item.product_id);
        if (item.quantity > item.available_stock) {
          showToast(
            `Insufficient stock for ${prod?.name || 'product'}. Available Free To Use: ${item.available_stock}, Requested: ${item.quantity}.`,
            'error'
          );
          return;
        }
      }

      setSubmitting(true);

      const created = await createTransfer(
        {
          reference: reference.trim(),
          source_warehouse_id: sourceWarehouseId,
          source_location_id: sourceLocationId,
          destination_warehouse_id: destinationWarehouseId,
          destination_location_id: destinationLocationId,
          status: targetStatus,
          scheduled_date: scheduledDate,
          responsible_id: responsibleId || undefined,
          notes: notes.trim() || undefined,
          items: validItems.map((it) => ({
            product_id: it.product_id,
            quantity: Number(it.quantity),
          })),
        },
        user?.id
      );

      showToast(
        `Internal transfer ${created.reference} successfully created as ${targetStatus}!`,
        'success'
      );

      navigate(`/operations/transfers/${created.id}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to create internal transfer', 'error');
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <PageHeader
        title="Create Internal Transfer"
        description="Relocate stock between warehouses or internal bin locations"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/operations/transfers')}
            className="border-slate-800 text-slate-300 hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Transfers
          </Button>
        }
      />

      {/* Main Form Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-6">
        {/* Validation Warning Alert for Source == Dest */}
        {isSourceAndDestSame && (
          <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-3 flex items-start gap-3 text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-200">Validation Error: Source == Destination</p>
              <p className="text-red-400">
                Source location and destination location must be different. You cannot transfer stock into the exact same bin location.
              </p>
            </div>
          </div>
        )}

        {/* Section 1: Document Metadata */}
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
              placeholder="e.g. WH/INT/0001"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono font-bold text-blue-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Scheduled Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Scheduled Date <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
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

        {/* Section 2: Source & Destination Locations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/60 border border-slate-800/80 rounded-xl p-5">
          {/* Source Location Block */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <div className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Source (Origin)
              </h4>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Source Warehouse <span className="text-red-400">*</span>
              </label>
              <select
                value={sourceWarehouseId}
                onChange={(e) => handleSourceWarehouseChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="">Select Source Warehouse</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} - {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Source Storage Location / Bin <span className="text-red-400">*</span>
              </label>
              <select
                value={sourceLocationId}
                onChange={(e) => setSourceLocationId(e.target.value)}
                disabled={!sourceWarehouseId || sourceLocations.length === 0}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500 disabled:opacity-50"
              >
                {sourceLocations.length === 0 ? (
                  <option value="">No locations available in warehouse</option>
                ) : (
                  sourceLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.code} - {loc.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Destination Location Block */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Destination (Target)
              </h4>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Destination Warehouse <span className="text-red-400">*</span>
              </label>
              <select
                value={destinationWarehouseId}
                onChange={(e) => handleDestinationWarehouseChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select Destination Warehouse</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} - {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Destination Storage Location / Bin <span className="text-red-400">*</span>
              </label>
              <select
                value={destinationLocationId}
                onChange={(e) => setDestinationLocationId(e.target.value)}
                disabled={!destinationWarehouseId || destinationLocations.length === 0}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              >
                {destinationLocations.length === 0 ? (
                  <option value="">No locations available in warehouse</option>
                ) : (
                  destinationLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.code} - {loc.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Line Items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-400" /> Transfer Line Items
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              className="border-slate-800 text-blue-400 hover:bg-slate-800 text-xs py-1"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Product Line
            </Button>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Available Free Stock (Source)</th>
                  <th className="py-3 px-4">Transfer Quantity</th>
                  <th className="py-3 px-4">UoM</th>
                  <th className="py-3 px-4 text-center">Stock Check</th>
                  <th className="py-3 px-4 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {items.map((row, idx) => {
                  const selectedProd = products.find((p) => p.id === row.product_id);
                  const isExceeding = row.product_id && row.quantity > row.available_stock;
                  const isPositive = row.quantity > 0;

                  return (
                    <tr key={row.id} className="hover:bg-slate-900/50 transition-colors">
                      {/* Product Selector */}
                      <td className="py-3 px-4 w-72">
                        <select
                          value={row.product_id}
                          onChange={(e) => handleProductChange(idx, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                        >
                          <option value="">Select Product...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              [{p.sku}] {p.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Available Stock */}
                      <td className="py-3 px-4">
                        {row.loading_stock ? (
                          <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                        ) : row.product_id ? (
                          <span
                            className={cn(
                              'font-mono font-semibold px-2 py-0.5 rounded text-[11px]',
                              row.available_stock > 0
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-500/10 text-red-400 border border-red-500/30'
                            )}
                          >
                            {row.available_stock} Units
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Quantity Input */}
                      <td className="py-3 px-4 w-40">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={row.quantity}
                          onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                          className={cn(
                            'w-full bg-slate-900 border rounded-lg px-2.5 py-1.5 text-xs font-bold font-mono focus:outline-none',
                            isExceeding
                              ? 'border-red-500 text-red-400 bg-red-500/10'
                              : 'border-slate-800 text-white focus:border-blue-500'
                          )}
                        />
                      </td>

                      {/* UoM */}
                      <td className="py-3 px-4 text-slate-400">
                        {selectedProd?.unit_of_measure || 'Units'}
                      </td>

                      {/* Stock Check Indicator */}
                      <td className="py-3 px-4 text-center">
                        {row.product_id ? (
                          isExceeding ? (
                            <span className="inline-flex items-center gap-1 text-red-400 text-[10px] font-bold">
                              <AlertCircle className="w-3.5 h-3.5" /> Insufficient Stock
                            </span>
                          ) : isPositive ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Sufficient
                            </span>
                          ) : (
                            <span className="text-red-400 text-[10px]">Invalid Qty</span>
                          )
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Remove line */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-900 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">
            Transfer Notes & Reason
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add internal remarks or reason for stock relocation..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Section 5: Form Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/operations/transfers')}
            className="border-slate-800 text-slate-400 hover:bg-slate-800"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={submitting || Boolean(isSourceAndDestSame)}
              onClick={() => handleSubmit('draft')}
              className="border-slate-700 text-amber-400 hover:bg-amber-500/10 font-semibold"
            >
              Save as Draft
            </Button>

            <Button
              variant="primary"
              size="sm"
              disabled={submitting || Boolean(isSourceAndDestSame)}
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
