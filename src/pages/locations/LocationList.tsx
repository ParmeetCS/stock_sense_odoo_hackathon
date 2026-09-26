import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MapPin,
  Plus,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Edit2,
  Trash2,
  RefreshCw,
  Building2,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import {
  fetchLocationsList,
  fetchWarehousesList,
  updateLocation,
  deleteLocation,
  checkLocationCanDelete,
} from '../../services/warehouseService';
import type { Location, Warehouse } from '../../types';
import { cn } from '../../utils/cn';

export const LocationList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  const [locations, setLocations] = useState<Location[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [warehouseId, setWarehouseId] = useState(searchParams.get('warehouse_id') || 'all');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>(
    (searchParams.get('status') as any) || 'all'
  );

  // Sorting
  const [sortBy, setSortBy] = useState<any>(searchParams.get('sortBy') || 'name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('sortOrder') as any) || 'asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Quick Edit Modal
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editWarehouseId, setEditWarehouseId] = useState('');
  const [editType, setEditType] = useState('internal');
  const [editIsActive, setEditIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete / Deactivate state
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchWarehousesList({ pageSize: 100 }).then((res) => setWarehouses(res.warehouses));
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchLocationsList({
        search,
        warehouseId,
        status,
        sortBy,
        sortOrder,
        page: currentPage,
        pageSize,
      });

      setLocations(res.locations);
      setTotalRecords(res.totalCount);
      setTotalPages(res.totalPages);

      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (warehouseId !== 'all') params.set('warehouse_id', warehouseId);
      if (status !== 'all') params.set('status', status);
      if (sortBy !== 'name') params.set('sortBy', sortBy);
      if (sortOrder !== 'asc') params.set('sortOrder', sortOrder);
      if (currentPage > 1) params.set('page', String(currentPage));
      setSearchParams(params, { replace: true });
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to load locations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, warehouseId, status, sortBy, sortOrder, currentPage, pageSize]);

  const handleSort = (field: any) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const openEdit = (loc: Location, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLocation(loc);
    setEditName(loc.name);
    setEditCode(loc.code);
    setEditWarehouseId(loc.warehouse_id);
    setEditType(loc.type || 'internal');
    setEditIsActive(loc.is_active ?? true);
    setEditError('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocation) return;
    setIsSaving(true);
    setEditError('');
    try {
      await updateLocation(editingLocation.id, {
        warehouse_id: editWarehouseId,
        name: editName,
        code: editCode,
        type: editType,
        is_active: editIsActive,
      });
      showToast('Location Updated', `Location "${editName}" updated successfully.`, 'success');
      setEditingLocation(null);
      loadData();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update location');
    } finally {
      setIsSaving(false);
    }
  };

  const promptDelete = async (loc: Location, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingLocation(loc);
    const check = await checkLocationCanDelete(loc.id);
    if (!check.canDelete) {
      setDeleteWarning(check.reason || 'Location contains active stock or historical operations.');
    } else {
      setDeleteWarning(null);
    }
  };

  const confirmDeleteOrDeactivate = async () => {
    if (!deletingLocation) return;
    setIsDeleting(true);
    try {
      if (deleteWarning) {
        await updateLocation(deletingLocation.id, { is_active: false });
        showToast('Location Deactivated', `Location "${deletingLocation.name}" has been deactivated.`, 'info');
      } else {
        await deleteLocation(deletingLocation.id);
        showToast('Location Deleted', `Location "${deletingLocation.name}" deleted.`, 'success');
      }
      setDeletingLocation(null);
      loadData();
    } catch (err: any) {
      showToast('Action Failed', err.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const totalStockAcrossAll = locations.reduce((acc, l) => acc + (l.stock_quantity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Configuration', href: '/settings/locations' },
          { label: 'Locations & Bins' },
        ]}
        title="Warehouse Locations & Bins"
        description="Manage storage aisles, shelves, racks, and specific bins within your warehouses."
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
              onClick={() => navigate('/settings/locations/new')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              New Location
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Bins & Locations</div>
            <div className="text-xl font-bold text-white font-mono">{totalRecords}</div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Connected Warehouses</div>
            <div className="text-xl font-bold text-blue-400 font-mono">{warehouses.length}</div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Stock Allocated</div>
            <div className="text-xl font-bold text-emerald-400 font-mono">{totalStockAcrossAll.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm backdrop-blur-sm">
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
              placeholder="Search location by name, bin code, warehouse..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="w-full sm:w-56">
            <select
              value={warehouseId}
              onChange={(e) => {
                setWarehouseId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 px-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} [{w.code}]
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs">
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'inactive', label: 'Inactive' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => {
                setStatus(st.id as any);
                setCurrentPage(1);
              }}
              className={cn(
                'px-3 py-1.5 rounded-md font-medium transition-all whitespace-nowrap',
                status === st.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              )}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Locations Table */}
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
                    <span>Name</span>
                    {sortBy === 'name' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('code')}
                  className="px-4 py-3.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Short Code</span>
                    {sortBy === 'code' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('warehouse')}
                  className="px-4 py-3.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Warehouse</span>
                    {sortBy === 'warehouse' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('stock_quantity')}
                  className="px-4 py-3.5 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Stock Quantity</span>
                    {sortBy === 'stock_quantity' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                      <span className="text-xs font-medium">Loading warehouse locations...</span>
                    </div>
                  </td>
                </tr>
              ) : locations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                        <MapPin className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-bold text-white">No Locations Found</h4>
                      <p className="text-xs text-slate-400">
                        Create storage locations, aisles, or bins to assign incoming and outgoing inventory.
                      </p>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate('/settings/locations/new')}
                        className="mt-2"
                      >
                        <Plus className="w-4 h-4 mr-1.5" /> Create Location
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                locations.map((loc) => (
                  <tr
                    key={loc.id}
                    onClick={() => navigate(`/settings/locations/${loc.id}`)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    {/* Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                            {loc.name}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Short Code */}
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs font-bold text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                        {loc.code}
                      </span>
                    </td>

                    {/* Warehouse */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-200">{loc.warehouse?.name || 'Main Warehouse'}</span>
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                          {loc.warehouse?.code || 'WH01'}
                        </span>
                      </div>
                    </td>

                    {/* Stock Quantity */}
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-white">
                      {(loc.stock_quantity || 0).toLocaleString()}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-center">
                      {loc.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => navigate(`/settings/locations/${loc.id}`)}
                          title="View Location"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => openEdit(loc, e)}
                          title="Edit Location"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => promptDelete(loc, e)}
                          title="Delete / Deactivate"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-900/90 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-white">{locations.length}</strong> of{' '}
              <strong className="text-white">{totalRecords}</strong> locations
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

      {/* Edit Modal */}
      {editingLocation && (
        <Modal
          isOpen={true}
          onClose={() => setEditingLocation(null)}
          title={`Edit Location: ${editingLocation.name}`}
          subtitle="Modify location name, code, warehouse assignment, and status."
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

            <FormField label="Warehouse" required helperText="A location belongs to exactly one warehouse">
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

            <FormField label="Short Code" required helperText="Must be unique within the assigned warehouse">
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
                id="editLocActive"
                checked={editIsActive}
                onChange={(e) => setEditIsActive(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="editLocActive" className="text-xs font-semibold text-slate-300 cursor-pointer">
                Location is active for stock storage and picking
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingLocation(null)}
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

      {/* Delete / Deactivate Confirm Modal */}
      {deletingLocation && (
        <Modal
          isOpen={true}
          onClose={() => setDeletingLocation(null)}
          title={deleteWarning ? 'Deactivate Location' : 'Delete Location'}
          maxWidth="sm"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingLocation(null)}
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
                Are you sure you want to permanently delete location <strong className="text-white">"{deletingLocation.name}" ({deletingLocation.code})</strong>?
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
