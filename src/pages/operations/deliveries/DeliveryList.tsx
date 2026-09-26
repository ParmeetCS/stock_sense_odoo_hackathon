import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Plus,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Calendar,
  Building2,
  MapPin,
  Clock,
  CheckCheck,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { DataTable } from '../../../components/ui/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../context/AuthContext';
import { fetchDeliveries, validateDelivery } from '../../../services/deliveryService';
import { fetchWarehousesList } from '../../../services/warehouseService';
import type { Delivery, Warehouse } from '../../../types';

export const DeliveryList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');
  const [validatingId, setValidatingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [delData, whData] = await Promise.all([
        fetchDeliveries({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          warehouseId: warehouseFilter || undefined,
        }),
        fetchWarehousesList({ pageSize: 100 }),
      ]);
      setDeliveries(delData);
      setWarehouses(whData.warehouses);
    } catch (err: any) {
      showToast(err.message || 'Failed to load delivery orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, warehouseFilter]);

  const filteredDeliveries = deliveries.filter((d) => {
    if (!search) return true;
    const term = search.toLowerCase();
    const ref = (d.reference || '').toLowerCase();
    const cust = (d.customer_name || '').toLowerCase();
    const wh = (d.warehouse?.name || '').toLowerCase();
    return ref.includes(term) || cust.includes(term) || wh.includes(term);
  });

  const handleValidate = async (id: string, ref: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (validatingId) return;

    setValidatingId(id);
    try {
      const res = await validateDelivery(id, user?.id);
      showToast(res.message || `Delivery ${ref} validated successfully!`, 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || `Failed to validate delivery ${ref}`, 'error');
    } finally {
      setValidatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'done':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCheck className="w-3.5 h-3.5" /> Done / Dispatched
          </span>
        );
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Pick
          </span>
        );
      case 'waiting':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" /> Waiting Stock
          </span>
        );
      case 'canceled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
            <AlertCircle className="w-3.5 h-3.5" /> Canceled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <FileText className="w-3.5 h-3.5" /> Draft
          </span>
        );
    }
  };

  const columns = [
    {
      key: 'reference',
      header: 'Order Reference',
      render: (item: Delivery) => (
        <div className="flex items-center gap-2">
          <ArrowUpRight className="w-4 h-4 text-purple-400" />
          <Link
            to={`/operations/deliveries/${item.id}`}
            className="font-mono text-xs font-semibold text-blue-400 hover:underline"
          >
            {item.reference}
          </Link>
        </div>
      ),
    },
    {
      key: 'customer_name',
      header: 'Customer / Recipient',
      render: (item: Delivery) => (
        <span className="text-xs text-slate-200 font-medium">
          {item.customer_name || 'Walk-in / Direct Outbound'}
        </span>
      ),
    },
    {
      key: 'warehouse',
      header: 'Warehouse & Source Location',
      render: (item: Delivery) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>{item.warehouse?.name || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <MapPin className="w-3 h-3 text-slate-600" />
            <span>{item.source_location?.name || 'Main Location'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Delivery) => getStatusBadge(item.status),
    },
    {
      key: 'scheduled_date',
      header: 'Scheduled Date',
      render: (item: Delivery) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>{item.scheduled_date ? new Date(item.scheduled_date).toLocaleDateString() : 'N/A'}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Delivery) => (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/operations/deliveries/${item.id}`)}
          >
            <Eye className="w-3.5 h-3.5 mr-1" /> View
          </Button>
          {item.status !== 'done' && item.status !== 'canceled' && (
            <Button
              variant="primary"
              size="sm"
              disabled={validatingId === item.id}
              onClick={(e) => handleValidate(item.id, item.reference, e)}
              className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              {validatingId === item.id ? 'Validating...' : 'Validate'}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outbound Deliveries"
        subtitle="Manage outbound dispatch orders, stock reservations, and customer shipment validations"
        actions={
          <Button
            variant="primary"
            onClick={() => navigate('/operations/deliveries/new')}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 border-purple-500"
          >
            <Plus className="w-4 h-4" /> Create Delivery Order
          </Button>
        }
      />

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order reference, customer, warehouse..."
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-purple-500 focus-visible:ring-2 focus-visible:ring-purple-500 placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-purple-500 focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="waiting">Waiting Stock</option>
              <option value="ready">Ready</option>
              <option value="done">Done / Dispatched</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>

          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="h-10 px-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-purple-500 focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading delivery orders...</div>
      ) : filteredDeliveries.length === 0 ? (
        <EmptyState
          title="No Delivery Orders Found"
          description="Create a new outbound delivery order to dispatch products to customers."
          actionLabel="Create First Delivery"
          onAction={() => navigate('/operations/deliveries/new')}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredDeliveries}
          onRowClick={(item) => navigate(`/operations/deliveries/${item.id}`)}
        />
      )}
    </div>
  );
};
