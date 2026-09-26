import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  ArrowLeft,
  Edit2,
  Trash2,
  MapPin,
  Package,
  RefreshCw,
  Plus,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import {
  fetchWarehouseById,
  updateWarehouse,
  deleteWarehouse,
  checkWarehouseCanDelete,
} from '../../services/warehouseService';
import type { Warehouse, Location, Stock } from '../../types';
import { cn } from '../../utils/cn';

export const WarehouseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [locations, setLocations] = useState<(Location & { stock_quantity: number })[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'locations' | 'stocks'>('locations');
  const [copiedCode, setCopiedCode] = useState(false);

  // Edit Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete / Deactivate state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchWarehouseById(id);
      setWarehouse(data.warehouse);
      setLocations(data.locations);
      setStocks(data.stocks);
    } catch (err: any) {
      showToast('Warehouse Not Found', err.message || 'Failed to load warehouse details.', 'error');
      navigate('/settings/warehouses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleCopyCode = () => {
    if (!warehouse?.code) return;
    navigator.clipboard.writeText(warehouse.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const openEdit = () => {
    if (!warehouse) return;
    setEditName(warehouse.name);
    setEditCode(warehouse.code);
    setEditAddress(warehouse.address || '');
    setEditIsActive(warehouse.is_active);
    setEditError('');
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsSaving(true);
    setEditError('');
    try {
      const updated = await updateWarehouse(id, {
        name: editName,
        code: editCode,
        address: editAddress,
        is_active: editIsActive,
      });
      showToast('Warehouse Updated', `Warehouse "${updated.name}" updated successfully.`, 'success');
      setIsEditOpen(false);
      loadData();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update warehouse');
    } finally {
      setIsSaving(false);
    }
  };

  const promptDelete = async () => {
    if (!id) return;
    const check = await checkWarehouseCanDelete(id);
    if (!check.canDelete) {
      setDeleteWarning(check.reason || 'Warehouse has active inventory or historical records.');
    } else {
      setDeleteWarning(null);
    }
    setIsDeleteOpen(true);
  };

  const confirmDeleteOrDeactivate = async () => {
    if (!id || !warehouse) return;
    setIsDeleting(true);
    try {
      if (deleteWarning) {
        await updateWarehouse(id, { is_active: false });
        showToast('Warehouse Deactivated', `Warehouse "${warehouse.name}" has been deactivated.`, 'info');
      } else {
        await deleteWarehouse(id);
        showToast('Warehouse Deleted', `Warehouse "${warehouse.name}" deleted.`, 'success');
        navigate('/settings/warehouses');
        return;
      }
      setIsDeleteOpen(false);
      loadData();
    } catch (err: any) {
      showToast('Action Failed', err.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-xs font-medium">Loading warehouse facility data...</span>
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Warehouse not found.</p>
        <Button variant="primary" size="sm" onClick={() => navigate('/settings/warehouses')} className="mt-4">
          Return to Warehouses
        </Button>
      </div>
    );
  }

  const totalStock = Number(warehouse.stock_quantity || 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader
        breadcrumbs={[
          { label: 'Configuration', href: '/settings/warehouses' },
          { label: 'Warehouses', href: '/settings/warehouses' },
          { label: `${warehouse.name} (${warehouse.code})` },
        ]}
        title={warehouse.name}
        description={warehouse.address || 'Physical warehouse logistics hub and bin hierarchy.'}
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/settings/warehouses')}
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={openEdit}
            >
              <Edit2 className="w-4 h-4 mr-1.5 text-blue-400" /> Edit Warehouse
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/settings/locations/new?warehouse_id=${warehouse.id}`)}
              className="bg-blue-600 hover:bg-blue-500"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Location / Bin
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={promptDelete}
              className="text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      {/* Facility Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 text-2xl shadow-inner">
              <Building2 className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-bold text-white tracking-tight">{warehouse.name}</h2>
                {warehouse.is_active ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" /> Inactive
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <div className="inline-flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Short Code:</span>
                  <span className="font-mono font-bold text-blue-300">{warehouse.code}</span>
                  <button
                    onClick={handleCopyCode}
                    className="p-0.5 text-slate-500 hover:text-slate-200"
                    title="Copy Code"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                {warehouse.address && (
                  <span className="text-slate-300">📍 {warehouse.address}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-slate-950/80 px-4 py-3 rounded-xl border border-slate-800 text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Bins / Locations</div>
              <div className="text-xl font-bold text-purple-400 font-mono">{locations.length}</div>
            </div>
            <div className="bg-slate-950/80 px-4 py-3 rounded-xl border border-slate-800 text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">On Hand Inventory</div>
              <div className="text-xl font-bold text-emerald-400 font-mono">{totalStock.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 text-xs font-semibold gap-2 pt-4">
          <button
            onClick={() => setActiveTab('locations')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all',
              activeTab === 'locations'
                ? 'border-blue-500 text-blue-400 font-bold bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            )}
          >
            <MapPin className="w-4 h-4" />
            <span>Locations & Bins ({locations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('stocks')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all',
              activeTab === 'stocks'
                ? 'border-blue-500 text-blue-400 font-bold bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            )}
          >
            <Package className="w-4 h-4" />
            <span>Stock Inventory ({stocks.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Locations Table */}
      {activeTab === 'locations' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-purple-400" /> Bins & Internal Storage Locations
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/settings/locations/new?warehouse_id=${warehouse.id}`)}
              className="text-xs text-blue-300"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> New Bin / Location
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Location Name</th>
                  <th className="px-4 py-3">Short Code</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Stock Quantity</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200">
                {locations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No storage locations configured for this warehouse yet.
                    </td>
                  </tr>
                ) : (
                  locations.map((loc) => (
                    <tr
                      key={loc.id}
                      onClick={() => navigate(`/settings/locations/${loc.id}`)}
                      className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <MapPin className="w-4 h-4 text-purple-400" />
                          <span className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                            {loc.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 text-xs">
                          {loc.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 capitalize">
                        {loc.type || 'internal'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-white">
                        {(loc.stock_quantity || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {loc.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/settings/locations/${loc.id}`);
                          }}
                          className="h-7 text-xs text-slate-300"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Stock Inventory */}
      {activeTab === 'stocks' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-400" /> Inventory Held in this Facility
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Live balances synced with Supabase</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Bin Location</th>
                  <th className="px-4 py-3 text-right">On Hand</th>
                  <th className="px-4 py-3 text-right">Reserved</th>
                  <th className="px-4 py-3 text-right">Free To Use</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200">
                {stocks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No stock currently on hand in this warehouse.
                    </td>
                  </tr>
                ) : (
                  stocks.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => navigate(`/products/${s.product_id}`)}
                      className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-semibold text-white">
                        {s.product?.name || 'Product'}
                      </td>
                      <td className="px-4 py-3 font-mono text-blue-300">
                        {s.product?.sku || 'SKU'}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400">
                        {s.location?.code || 'Bin'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-white">
                        {Number(s.on_hand).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-amber-400">
                        {Number(s.reserved).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                        {Number(s.free_to_use).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsEditOpen(false)}
          title={`Edit Warehouse: ${warehouse.name}`}
          subtitle="Modify facility metadata and status."
          maxWidth="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {editError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <FormField label="Warehouse Name" required>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                required
              />
            </FormField>

            <FormField label="Short Code" required>
              <input
                type="text"
                value={editCode}
                onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-blue-300 focus:outline-none focus:border-blue-500"
                required
              />
            </FormField>

            <FormField label="Address">
              <textarea
                rows={2}
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </FormField>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="modalWhActive"
                checked={editIsActive}
                onChange={(e) => setEditIsActive(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="modalWhActive" className="text-xs font-semibold text-slate-300 cursor-pointer">
                Warehouse facility is active
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
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete / Deactivate Modal */}
      {isDeleteOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsDeleteOpen(false)}
          title={deleteWarning ? 'Deactivate Warehouse' : 'Delete Warehouse'}
          maxWidth="sm"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant={deleteWarning ? 'primary' : 'danger'}
                size="sm"
                onClick={confirmDeleteOrDeactivate}
                disabled={isDeleting}
              >
                {isDeleting
                  ? 'Processing...'
                  : deleteWarning
                  ? 'Deactivate Warehouse'
                  : 'Delete Warehouse'}
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            {deleteWarning ? (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-white font-semibold mb-1">Integrity Constraint:</strong>
                  {deleteWarning}
                  <p className="mt-2 text-slate-300">
                    To maintain transactional history and audit compliance, this warehouse will be <strong>deactivated</strong> instead of deleted.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete warehouse <strong className="text-white">"{warehouse.name}" ({warehouse.code})</strong>?
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
