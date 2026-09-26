import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { FormField } from '../../../components/ui/FormField';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../context/AuthContext';
import {
  createDelivery,
  generateDeliveryReference,
} from '../../../services/deliveryService';
import { fetchWarehousesList, fetchLocationsList } from '../../../services/warehouseService';
import { fetchProducts } from '../../../services/productService';
import type { Warehouse, Location, Product } from '../../../types';

interface DeliveryLineItem {
  id: string;
  product_id: string;
  sku: string;
  unit_of_measure: string;
  quantity_demanded: string;
}

export const DeliveryCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [reference, setReference] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [warehouseId, setWarehouseId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [notes, setNotes] = useState('');

  // Line Items
  const [items, setItems] = useState<DeliveryLineItem[]>([]);

  // Dropdowns metadata
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Form State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadMeta() {
      try {
        const [ref, whs, locs, prods] = await Promise.all([
          generateDeliveryReference(),
          fetchWarehousesList({ pageSize: 100 }),
          fetchLocationsList({ pageSize: 100 }),
          fetchProducts({ pageSize: 100 }),
        ]);

        setReference(ref);
        setWarehouses(whs.warehouses);
        setLocations(locs.locations);
        setProducts(prods.products);

        if (whs.warehouses.length > 0) {
          const firstWh = whs.warehouses[0].id;
          setWarehouseId(firstWh);
          const firstWhLocs = locs.locations.filter((l) => l.warehouse_id === firstWh);
          if (firstWhLocs.length > 0) {
            setLocationId(firstWhLocs[0].id);
          }
        }

        // Add 1 default line item
        if (prods.products.length > 0) {
          const defaultProd = prods.products[0];
          setItems([
            {
              id: String(Date.now()),
              product_id: defaultProd.id,
              sku: defaultProd.sku,
              unit_of_measure: 'Units',
              quantity_demanded: '5',
            },
          ]);
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to initialize delivery creation form', 'error');
      }
    }
    loadMeta();
  }, []);

  // Filter locations by selected warehouse
  const filteredLocations = locations.filter((l) => l.warehouse_id === warehouseId);

  useEffect(() => {
    if (filteredLocations.length > 0 && !filteredLocations.some((l) => l.id === locationId)) {
      setLocationId(filteredLocations[0].id);
    }
  }, [warehouseId, filteredLocations]);

  const handleAddItem = () => {
    if (products.length === 0) return;
    const defaultProd = products[0];
    setItems([
      ...items,
      {
        id: String(Date.now() + Math.random()),
        product_id: defaultProd.id,
        sku: defaultProd.sku,
        unit_of_measure: 'Units',
        quantity_demanded: '1',
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      showToast('Delivery order must contain at least one line item', 'warning');
      return;
    }
    setItems(items.filter((item) => item.id !== id));
  };

  const handleItemProductChange = (id: string, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    setItems(
      items.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            product_id: productId,
            sku: prod ? prod.sku : item.sku,
          };
        }
        return item;
      })
    );
  };

  const handleItemQuantityChange = (id: string, val: string) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, quantity_demanded: val } : item))
    );
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!warehouseId) errs.warehouseId = 'Warehouse is required';
    if (!locationId) errs.locationId = 'Source location is required';
    if (items.length === 0) errs.items = 'At least one item is required';

    items.forEach((item, idx) => {
      const qty = parseFloat(item.quantity_demanded);
      if (isNaN(qty) || qty <= 0) {
        errs[`item_${idx}`] = 'Quantity must be greater than 0';
      }
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast('Please fix validation errors before submitting', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await createDelivery(
        {
          reference,
          customer_name: customerName,
          warehouse_id: warehouseId,
          source_location_id: locationId,
          scheduled_date: scheduledDate,
          notes,
          items: items.map((i) => ({
            product_id: i.product_id,
            quantity_demanded: parseFloat(i.quantity_demanded),
          })),
        },
        user?.id
      );

      showToast(`Outbound Delivery ${reference} created successfully!`, 'success');
      navigate('/operations/deliveries');
    } catch (err: any) {
      showToast(err.message || 'Failed to create delivery order', 'error');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Outbound Delivery"
        subtitle="Schedule a new customer delivery dispatch order"
        actions={
          <Button variant="secondary" onClick={() => navigate('/operations/deliveries')}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Deliveries
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Fields */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <ArrowUpRight className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                  Order Header Details
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  id="del-ref"
                  label="Order Reference"
                  required
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="WH/OUT/0001"
                />

                <FormField
                  id="del-customer"
                  label="Customer / Recipient Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Tata Consultancy Services"
                />

                <div className="space-y-1.5">
                  <label htmlFor="del-warehouse" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Source Warehouse <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="del-warehouse"
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-purple-500 focus-visible:ring-2 focus-visible:ring-purple-500"
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                  {errors.warehouseId && (
                    <p className="text-xs text-red-400">{errors.warehouseId}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="del-location" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Source Bin Location <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="del-location"
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-purple-500 focus-visible:ring-2 focus-visible:ring-purple-500"
                  >
                    <option value="">Select Location</option>
                    {filteredLocations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.code})
                      </option>
                    ))}
                  </select>
                  {errors.locationId && (
                    <p className="text-xs text-red-400">{errors.locationId}</p>
                  )}
                </div>

                <FormField
                  id="del-date"
                  label="Scheduled Dispatch Date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="del-notes" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Internal Notes & Instructions
                </label>
                <textarea
                  id="del-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Packing requirements or special shipping notes..."
                  className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-purple-500 focus-visible:ring-2 focus-visible:ring-purple-500 placeholder-slate-500"
                />
              </div>
            </div>

            {/* Line Items Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                  Outbound Line Items
                </h3>
                <Button type="button" variant="secondary" size="sm" onClick={handleAddItem}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Line Item
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 gap-3 items-center bg-slate-950 p-3 rounded-lg border border-slate-800"
                  >
                    <div className="col-span-12 sm:col-span-6 space-y-1">
                      <label className="text-[10px] uppercase font-semibold text-slate-400">
                        Product Item
                      </label>
                      <select
                        value={item.product_id}
                        onChange={(e) => handleItemProductChange(item.id, e.target.value)}
                        className="w-full h-9 px-2.5 rounded-md bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-6 sm:col-span-4 space-y-1">
                      <label className="text-[10px] uppercase font-semibold text-slate-400">
                        Demanded Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity_demanded}
                        onChange={(e) => handleItemQuantityChange(item.id, e.target.value)}
                        className="w-full h-9 px-2.5 rounded-md bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-2 flex justify-end pt-4 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-2 rounded-md hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                        title="Remove line item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Side Info & Submit Action */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider pb-3 border-b border-slate-800">
                Summary & Submit
              </h3>

              <div className="space-y-3 text-xs text-slate-400">
                <div className="flex justify-between py-1 border-b border-slate-800/50">
                  <span>Total Line Items:</span>
                  <span className="font-semibold text-slate-200">{items.length}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/50">
                  <span>Total Demanded Qty:</span>
                  <span className="font-semibold text-purple-400">
                    {items.reduce((acc, i) => acc + (parseFloat(i.quantity_demanded) || 0), 0)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Initial Status:</span>
                  <span className="font-semibold text-slate-300 uppercase">Draft</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-3">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  className="w-full h-11 bg-purple-600 hover:bg-purple-500 border-purple-500 font-semibold"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Creating Delivery...' : 'Create Delivery Order'}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/operations/deliveries')}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </div>

            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div className="text-xs text-purple-300 leading-relaxed space-y-1">
                <p className="font-semibold text-purple-200">Atomic Stock Protection</p>
                <p>
                  Creating a delivery initializes it in <strong className="text-white">Draft</strong> status. Validating the order executes an atomic RPC to verify stock availability before dispatch.
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
