import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  User,
  Package,
  CheckCheck,
  FileText,
  Printer,
} from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../context/AuthContext';
import {
  fetchDeliveryById,
  validateDelivery,
  updateDeliveryStatus,
} from '../../../services/deliveryService';
import type { Delivery, DeliveryItem, OrderStatus } from '../../../types';

export const DeliveryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [delivery, setDelivery] = useState<(Delivery & { items: DeliveryItem[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);

  const loadDelivery = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchDeliveryById(id);
      if (!data) {
        showToast('Delivery order not found', 'error');
        navigate('/operations/deliveries');
        return;
      }
      setDelivery(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load delivery details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDelivery();
  }, [id]);

  const handleValidate = async () => {
    if (!delivery || validating) return;
    setValidating(true);
    try {
      const res = await validateDelivery(delivery.id, user?.id);
      showToast(res.message || 'Delivery successfully validated and inventory dispatched!', 'success');
      await loadDelivery();
    } catch (err: any) {
      showToast(err.message || 'Failed to validate delivery order', 'error');
    } finally {
      setValidating(false);
    }
  };

  const handleStatusChange = async (status: OrderStatus) => {
    if (!delivery) return;
    try {
      await updateDeliveryStatus(delivery.id, status);
      showToast(`Delivery status updated to ${status}`, 'success');
      await loadDelivery();
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading delivery details...</div>;
  }

  if (!delivery) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'done':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCheck className="w-4 h-4" /> Done / Dispatched
          </span>
        );
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <CheckCircle2 className="w-4 h-4" /> Ready for Pick
          </span>
        );
      case 'waiting':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-4 h-4" /> Waiting Stock
          </span>
        );
      case 'canceled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
            <AlertCircle className="w-4 h-4" /> Canceled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <FileText className="w-4 h-4" /> Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Delivery Order ${delivery.reference}`}
        description="Outbound customer shipment order details and atomic validation"
        actions={
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => navigate('/operations/deliveries')}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Deliveries
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1.5" /> Print Delivery Slip
            </Button>

            {delivery.status !== 'done' && delivery.status !== 'canceled' && (
              <Button
                variant="primary"
                disabled={validating}
                onClick={handleValidate}
                className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500 flex items-center gap-2 font-semibold"
              >
                <CheckCircle2 className="w-4 h-4" />
                {validating ? 'Validating & Dispatching...' : 'Validate Delivery'}
              </Button>
            )}
          </div>
        }
      />

      {/* Header Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <ArrowUpRight className="w-4 h-4 text-purple-400" /> Reference Number
          </div>
          <p className="text-sm font-bold text-white font-mono">{delivery.reference}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-4 h-4 text-blue-400" /> Customer / Recipient
          </div>
          <p className="text-sm font-semibold text-slate-200">
            {delivery.customer_name || 'Walk-in Customer'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-emerald-400" /> Warehouse & Bin
          </div>
          <p className="text-xs font-medium text-slate-200">
            {delivery.warehouse?.name} — {delivery.source_location?.name}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Current Status
          </div>
          <div>{getStatusBadge(delivery.status)}</div>
        </div>
      </div>

      {/* Status Bar / Actions */}
      {delivery.status !== 'done' && delivery.status !== 'canceled' && (
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>
              Scheduled Dispatch: <strong>{delivery.scheduled_date ? new Date(delivery.scheduled_date).toLocaleDateString() : 'N/A'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {delivery.status === 'draft' && (
              <Button size="sm" variant="secondary" onClick={() => handleStatusChange('ready')}>
                Mark Ready
              </Button>
            )}
            {delivery.status === 'ready' && (
              <Button size="sm" variant="secondary" onClick={() => handleStatusChange('waiting')}>
                Mark Waiting Stock
              </Button>
            )}
            <Button size="sm" variant="secondary" className="hover:text-red-400" onClick={() => handleStatusChange('canceled')}>
              Cancel Order
            </Button>
          </div>
        </div>
      )}

      {delivery.status === 'done' && delivery.delivered_date && (
        <div className="bg-slate-900/90 border border-emerald-500/30 p-4 rounded-xl flex items-center gap-2 text-xs text-emerald-400 font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Dispatched & Validated on: <strong>{new Date(delivery.delivered_date).toLocaleString()}</strong></span>
        </div>
      )}

      {/* Line Items Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-800">
          <Package className="w-4 h-4 text-purple-400" /> Outbound Line Items
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th scope="col" className="p-3">Product Name</th>
                <th scope="col" className="p-3">SKU</th>
                <th scope="col" className="p-3 text-right">Demanded Qty</th>
                <th scope="col" className="p-3 text-right">Delivered Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {delivery.items && delivery.items.length > 0 ? (
                delivery.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-semibold text-white">
                      <Link to={`/products/${item.product_id}`} className="hover:underline text-blue-400">
                        {item.product?.name || 'Product Item'}
                      </Link>
                    </td>
                    <td className="p-3 font-mono text-slate-400">{item.product?.sku || 'N/A'}</td>
                    <td className="p-3 text-right font-bold text-purple-400">{item.quantity_demanded}</td>
                    <td className="p-3 text-right font-bold text-emerald-400">
                      {delivery.status === 'done' ? item.quantity_demanded : item.quantity_delivered || 0}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-slate-500">
                    No line items attached to this order.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
