import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownLeft,
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
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../context/AuthContext';
import {
  createReceipt,
  generateReceiptReference,
  fetchSuppliers,
  createSupplier,
} from '../../../services/receiptService';
import { fetchWarehousesList, fetchLocationsList } from '../../../services/warehouseService';
import { fetchProducts } from '../../../services/productService';
import type { Supplier, Warehouse, Location, Product } from '../../../types';

interface ReceiptLineItem {
  id: string;
  product_id: string;
  sku: string;
  unit_of_measure: string;
  quantity_expected: string;
  unit_cost: string;
}

export const ReceiptCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [reference, setReference] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [contact, setContact] = useState('');
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [warehouseId, setWarehouseId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [notes, setNotes] = useState('');

  // Line Items
  const [items, setItems] = useState<ReceiptLineItem[]>([]);

  // Metadata dropdowns
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Inline Supplier Modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierCode, setNewSupplierCode] = useState('');
  const [newSupplierEmail, setNewSupplierEmail] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);

  // Form State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadMeta() {
      try {
        const [ref, sups, whs, locs, prods] = await Promise.all([
          generateReceiptReference(),
          fetchSuppliers(),
          fetchWarehousesList({ pageSize: 100 }),
          fetchLocationsList({ pageSize: 100 }),
          fetchProducts({ pageSize: 100 }),
        ]);

        setReference(ref);
        setSuppliers(sups);
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

        // Add 1 default empty item row
        if (prods.products.length > 0) {
          const p = prods.products[0];
          setItems([
            {
              id: Math.random().toString(),
              product_id: p.id,
              sku: p.sku,
              unit_of_measure: p.unit_of_measure,
              quantity_expected: '10',
              unit_cost: String(p.cost_price || 0),
            },
          ]);
        }
      } catch (err) {
        console.error('Failed to load receipt form data:', err);
      }
    }
    loadMeta();
  }, []);

  // Update available locations when warehouse changes
  const filteredLocations = warehouseId
    ? locations.filter((loc) => loc.warehouse_id === warehouseId)
    : locations;

  useEffect(() => {
    if (filteredLocations.length > 0 && !filteredLocations.some((l) => l.id === locationId)) {
      setLocationId(filteredLocations[0].id);
    }
  }, [warehouseId, filteredLocations]);

  // Update supplier contact info when supplier changes
  const handleSupplierChange = (supId: string) => {
    setSupplierId(supId);
    const sup = suppliers.find((s) => s.id === supId);
    if (sup) {
      setContact(sup.email || sup.phone || '');
    }
  };

  // Add line item
  const addLineItem = () => {
    if (products.length === 0) return;
    const p = products[0];
    setItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        product_id: p.id,
        sku: p.sku,
        unit_of_measure: p.unit_of_measure,
        quantity_expected: '1',
        unit_cost: String(p.cost_price || 0),
      },
    ]);
  };

  // Update line item
  const updateLineItem = (index: number, field: keyof ReceiptLineItem, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };

      if (field === 'product_id') {
        const prod = products.find((p) => p.id === value);
        if (prod) {
          item.sku = prod.sku;
          item.unit_of_measure = prod.unit_of_measure;
          item.unit_cost = String(prod.cost_price || 0);
        }
      }

      next[index] = item;
      return next;
    });
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    if (items.length <= 1) {
      showToast('Validation', 'A receipt must contain at least one line item.', 'error');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!reference.trim()) newErrors.reference = 'Reference code is required.';
    if (!warehouseId) newErrors.warehouse = 'Destination warehouse is required.';
    if (!locationId) newErrors.location = 'Destination bin location is required.';

    if (items.length === 0) {
      newErrors.items = 'At least one product item is required.';
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.product_id) {
        newErrors[`item_${i}`] = 'Product is required for all rows.';
      }
      if (Number(it.quantity_expected) <= 0) {
        newErrors[`item_qty_${i}`] = 'Quantity expected must be > 0.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Receipt
  const handleSubmit = async (status: 'draft' | 'ready') => {
    const isValid = validate();
    if (!isValid) {
      showToast('Validation Error', 'Please check the highlighted fields in the receipt form.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createReceipt(
        {
          reference: reference.trim().toUpperCase(),
          supplier_id: supplierId || undefined,
          warehouse_id: warehouseId,
          destination_location_id: locationId,
          status,
          scheduled_date: scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
          contact: contact.trim() || undefined,
          notes: notes.trim() || undefined,
          items: items.map((it) => ({
            product_id: it.product_id,
            quantity_expected: Number(it.quantity_expected),
            unit_cost: Number(it.unit_cost) || 0,
          })),
        },
        user?.id
      );

      showToast(
        'Receipt Created',
        `Receipt ${created.reference} saved as ${status}. (Stock will increase upon validation).`,
        'success'
      );
      navigate(`/operations/receipts/${created.id}`);
    } catch (err: any) {
      showToast('Creation Failed', err.message || 'Could not save receipt', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create Supplier Inline
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) return;
    setIsCreatingSupplier(true);
    try {
      const sup = await createSupplier({
        name: newSupplierName,
        code: newSupplierCode || undefined,
        email: newSupplierEmail || undefined,
        phone: newSupplierPhone || undefined,
      });
      setSuppliers((prev) => [...prev, sup]);
      setSupplierId(sup.id);
      setContact(sup.email || sup.phone || '');
      setShowSupplierModal(false);
      setNewSupplierName('');
      setNewSupplierCode('');
      setNewSupplierEmail('');
      setNewSupplierPhone('');
      showToast('Supplier Created', `Supplier "${sup.name}" added.`, 'success');
    } catch (err: any) {
      showToast('Supplier Error', err.message, 'error');
    } finally {
      setIsCreatingSupplier(false);
    }
  };

  const totalExpectedQuantity = items.reduce(
    (acc, it) => acc + (Number(it.quantity_expected) || 0),
    0
  );
  const totalEstimatedCost = items.reduce(
    (acc, it) =>
      acc + (Number(it.quantity_expected) || 0) * (Number(it.unit_cost) || 0),
    0
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <PageHeader
        breadcrumbs={[
          { label: 'Operations', href: '/operations/receipts' },
          { label: 'Inbound Receipts', href: '/operations/receipts' },
          { label: 'New Receipt' },
        ]}
        title="Create Inbound Receipt"
        description="Receive incoming stock shipments from vendors into designated warehouse locations."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/operations/receipts')}
              disabled={isSubmitting}
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSubmit('draft')}
              disabled={isSubmitting}
            >
              <Save className="w-4 h-4 mr-1.5" /> Save Draft
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSubmit('ready')}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Save & Mark Ready
            </Button>
          </div>
        }
      />

      {/* Stock Rule Notice */}
      <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <strong className="block text-white font-semibold mb-0.5">Inventory Safety Guarantee:</strong>
          Creating a draft receipt order reserves documentation without altering physical inventory. Stock is only incremented when you formally click <strong>Validate</strong> upon physical receipt of goods.
        </div>
      </div>

      {/* Receipt Header Form */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-5 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Receipt Header & Logistics</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Reference Code" required error={errors.reference}>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value.toUpperCase())}
              placeholder="WH/IN/0001"
              className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-blue-300 focus:outline-none focus:border-blue-500"
            />
          </FormField>

          <FormField label="Vendor / Supplier">
            <div className="flex gap-2">
              <select
                value={supplierId}
                onChange={(e) => handleSupplierChange(e.target.value)}
                className="flex-1 h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">Select Vendor...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.code ? `(${s.code})` : ''}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowSupplierModal(true)}
                className="h-9 px-2.5 text-xs text-slate-300"
                title="Add new supplier"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </FormField>

          <FormField label="Vendor Contact / Phone / Email">
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="e.g. orders@supplier.com, +1-800-..."
              className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Destination Warehouse" required error={errors.warehouse}>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} [{w.code}]
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Destination Location / Bin" required error={errors.location}>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              {filteredLocations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} [{l.code}]
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Scheduled Delivery Date">
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </FormField>
        </div>

        <FormField label="Order Notes & Special Instructions">
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Delivery instructions, PO reference, carrier tracking..."
            className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </FormField>
      </div>

      {/* Line Items Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white">Receipt Line Items</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Specify incoming goods and expected quantities</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLineItem}
            className="text-xs text-blue-300"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Product Line
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-3 py-2.5">Product</th>
                <th className="px-3 py-2.5">SKU Code</th>
                <th className="px-3 py-2.5">Quantity Expected</th>
                <th className="px-3 py-2.5">Unit</th>
                <th className="px-3 py-2.5 text-right">Unit Cost ($)</th>
                <th className="px-3 py-2.5 text-right">Estimated Subtotal</th>
                <th className="px-3 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {items.map((item, idx) => {
                const subtotal = (Number(item.quantity_expected) || 0) * (Number(item.unit_cost) || 0);
                return (
                  <tr key={item.id} className="hover:bg-slate-800/20">
                    {/* Product Selector */}
                    <td className="px-3 py-2 min-w-[220px]">
                      <select
                        value={item.product_id}
                        onChange={(e) => updateLineItem(idx, 'product_id', e.target.value)}
                        className="w-full h-8 px-2 rounded bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* SKU */}
                    <td className="px-3 py-2 font-mono text-blue-300 font-bold text-xs">
                      {item.sku}
                    </td>

                    {/* Quantity Expected */}
                    <td className="px-3 py-2 w-32">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={item.quantity_expected}
                        onChange={(e) => updateLineItem(idx, 'quantity_expected', e.target.value)}
                        className="w-full h-8 px-2 rounded bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                      />
                    </td>

                    {/* Unit */}
                    <td className="px-3 py-2 text-slate-400 font-mono text-[11px]">
                      {item.unit_of_measure}
                    </td>

                    {/* Unit Cost */}
                    <td className="px-3 py-2 text-right w-28">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_cost}
                        onChange={(e) => updateLineItem(idx, 'unit_cost', e.target.value)}
                        className="w-full h-8 px-2 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-right text-white focus:outline-none focus:border-blue-500"
                      />
                    </td>

                    {/* Subtotal */}
                    <td className="px-3 py-2 text-right font-mono font-bold text-white">
                      ${subtotal.toFixed(2)}
                    </td>

                    {/* Remove */}
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeLineItem(idx)}
                        className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Remove Line Item"
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

        {/* Totals Summary */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-400">
            Total Expected Volume:{' '}
            <strong className="text-white font-mono">{totalExpectedQuantity} units</strong> across {items.length} line items
          </span>
          <div className="flex items-center gap-3 mt-2 sm:mt-0">
            <span className="text-slate-400">Total Valuation:</span>
            <span className="text-lg font-bold font-mono text-emerald-400">
              ${totalEstimatedCost.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Inline Supplier Modal */}
      {showSupplierModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowSupplierModal(false)}
          title="Create New Vendor / Supplier"
          maxWidth="sm"
        >
          <form onSubmit={handleCreateSupplier} className="space-y-4">
            <FormField label="Supplier Name" required>
              <input
                type="text"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="e.g. Apex Industrial Supplies"
                className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                required
                autoFocus
              />
            </FormField>

            <FormField label="Supplier Code (Optional)">
              <input
                type="text"
                value={newSupplierCode}
                onChange={(e) => setNewSupplierCode(e.target.value.toUpperCase())}
                placeholder="e.g. SUP-APEX"
                className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              />
            </FormField>

            <FormField label="Email Contact">
              <input
                type="email"
                value={newSupplierEmail}
                onChange={(e) => setNewSupplierEmail(e.target.value)}
                placeholder="orders@supplier.com"
                className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </FormField>

            <FormField label="Phone">
              <input
                type="text"
                value={newSupplierPhone}
                onChange={(e) => setNewSupplierPhone(e.target.value)}
                placeholder="+1-800-555-0199"
                className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </FormField>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowSupplierModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isCreatingSupplier}>
                {isCreatingSupplier ? 'Creating...' : 'Create Supplier'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
