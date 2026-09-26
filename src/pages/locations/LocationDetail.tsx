import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  ArrowLeft,
  Edit2,
  Trash2,
  Building2,
  Package,
  RefreshCw,
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
  fetchLocationById,
  updateLocation,
  deleteLocation,
  checkLocationCanDelete,
  fetchWarehousesList,
} from '../../services/warehouseService';
import type { Location, Stock, Warehouse } from '../../types';

export const LocationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [location, setLocation] = useState<Location | null>(null);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  // Edit Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editWarehouseId, setEditWarehouseId] = useState('');
  const [editType, setEditType] = useState('internal');
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
      const [data, whs] = await Promise.all([
        fetchLocationById(id),
        fetchWarehousesList({ pageSize: 100 }),
      ]);
      setLocation(data.location);
      setStocks(data.stocks);
      setWarehouses(whs.warehouses);
    } catch (err: any) {
      showToast('Location Not Found', err.message || 'Failed to load location details.', 'error');
      navigate('/settings/locations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleCopyCode = () => {
    if (!location?.code) return;
    navigator.clipboard.writeText(location.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const openEdit = () => {
    if (!location) return;
    setEditName(location.name);
    setEditCode(location.code);
    setEditWarehouseId(location.warehouse_id);
    setEditType(location.type || 'internal');
    setEditIsActive(location.is_active ?? true);
    setEditError('');
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsSaving(true);
    setEditError('');
    try {
      const updated = await updateLocation(id, {
        warehouse_id: editWarehouseId,
        name: editName,
        code: editCode,
        type: editType,
        is_active: editIsActive,
      });
      showToast('Location Updated', `Location "${updated.name}" updated successfully.`, 'success');
      setIsEditOpen(false);
      loadData();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update location');
    } finally {
      setIsSaving(false);
    }
  };

  const promptDelete = async () => {
    if (!id) return;
    const check = await checkLocationCanDelete(id);
    if (!check.canDelete) {
      setDeleteWarning(check.reason || 'Location contains active stock or historical operations.');
    } else {
      setDeleteWarning(null);
    }
    setIsDeleteOpen(true);
  };

  const confirmDeleteOrDeactivate = async () => {
    if (!id || !location) return;
    setIsDeleting(true);
    try {
      if (deleteWarning) {
        await updateLocation(id, { is_active: false });
        showToast('Location Deactivated', `Location "${location.name}" has been deactivated.`, 'info');
      } else {
        await deleteLocation(id);
        showToast('Location Deleted', `Location "${location.name}" deleted.`, 'success');
        navigate('/settings/locations');
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
        <span className="text-xs font-medium">Loading location bin data...</span>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Location not found.</p>
        <Button variant="primary" size="sm" onClick={() => navigate('/settings/locations')} className="mt-4">
          Return to Locations
        </Button>
      </div>
    );
  }

  const totalStock = Number(location.stock_quantity || 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader
        breadcrumbs={[
          { label: 'Configuration', href: '/settings/locations' },
          { label: 'Locations', href: '/settings/locations' },
          { label: `${location.name} (${location.code})` },
        ]}
        title={location.name}
        description={`Warehouse storage bin in ${location.warehouse?.name || 'Warehouse'}`}
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/settings/locations')}
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={openEdit}
            >
              <Edit2 className="w-4 h-4 mr-1.5 text-blue-400" /> Edit Location
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

      {/* Location Overview Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-600/10 border border-purple-500/30 flex items-center justify-center text-purple-400 text-2xl shadow-inner">
              <MapPin className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-bold text-white tracking-tight">{location.name}</h2>
                {location.is_active ? (
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
                  <span className="font-mono font-bold text-blue-300">{location.code}</span>
                  <button
                    onClick={handleCopyCode}
                    className="p-0.5 text-slate-500 hover:text-slate-200"
                    title="Copy Code"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                <div
                  onClick={() => location.warehouse_id && navigate(`/settings/warehouses/${location.warehouse_id}`)}
                  className="inline-flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 cursor-pointer hover:border-blue-500 transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-200 font-semibold">{location.warehouse?.name || 'Warehouse'}</span>
                  <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1 py-0.2 rounded">
                    {location.warehouse?.code || 'WH'}
                  </span>
                </div>

                <div className="inline-flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-400 capitalize">
                  Type: <strong className="text-white ml-1">{location.type || 'internal'}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/80 px-5 py-3.5 rounded-xl border border-slate-800 text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Stock Quantity</div>
            <div className="text-2xl font-bold text-emerald-400 font-mono">{totalStock.toLocaleString()}</div>
          </div>
        </div>

        {/* Stock in this Location Table */}
        <div className="pt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-400" /> Products Stored in this Bin ({stocks.length})
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Live balances synced with Supabase</span>
          </div>

          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3 text-right">On Hand</th>
                  <th className="px-4 py-3 text-right">Reserved</th>
                  <th className="px-4 py-3 text-right">Free To Use</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200">
                {stocks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-500">
                      No inventory currently allocated to this location bin.
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
      </div>

      {/* Edit Modal */}
      {isEditOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsEditOpen(false)}
          title={`Edit Location: ${location.name}`}
          subtitle="Modify location details and warehouse mapping."
          maxWidth="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {editError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <FormField label="Location Name" required>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                required
              />
            </FormField>

            <FormField label="Warehouse" required>
              <select
                value={editWarehouseId}
                onChange={(e) => setEditWarehouseId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                required
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} [{w.code}]
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Short Code" required helperText="Must be unique in this warehouse">
              <input
                type="text"
                value={editCode}
                onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-blue-300 focus:outline-none focus:border-blue-500"
                required
              />
            </FormField>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="modalLocActive"
                checked={editIsActive}
                onChange={(e) => setEditIsActive(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="modalLocActive" className="text-xs font-semibold text-slate-300 cursor-pointer">
                Location is active
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
          title={deleteWarning ? 'Deactivate Location' : 'Delete Location'}
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
                  ? 'Deactivate Location'
                  : 'Delete Location'}
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
                    To maintain transactional history and prevent data corruption, this location will be <strong>deactivated</strong> instead of deleted.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete location <strong className="text-white">"{location.name}" ({location.code})</strong>?
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
