import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Sliders,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Printer,
  AlertCircle,
  RefreshCw,
  Package,
  History,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../context/AuthContext';
import {
  fetchAdjustmentById,
  validateAdjustment,
  updateAdjustmentStatus,
} from '../../../services/adjustmentService';
import type { InventoryAdjustment, StockLedger, OrderStatus } from '../../../types';
import { cn } from '../../../utils/cn';

export const AdjustmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [adjustment, setAdjustment] = useState<InventoryAdjustment | null>(null);
  const [ledger, setLedger] = useState<StockLedger[]>([]);
  const [currentStock, setCurrentStock] = useState(0);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'ledger'>('details');

  useEffect(() => {
    if (id) {
      loadAdjustmentDetail();
    }
  }, [id]);

  const loadAdjustmentDetail = async () => {
    try {
      setLoading(true);
      const data = await fetchAdjustmentById(id!);
      setAdjustment(data.adjustment);
      setLedger(data.ledger);
      setCurrentStock(data.currentStock);
    } catch (err: any) {
      showToast(err.message || 'Failed to load adjustment details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!adjustment) return;

    try {
      setValidating(true);
      const result = await validateAdjustment(adjustment.id, user?.id);
      showToast(result.message, 'success');
      loadAdjustmentDetail();
    } catch (err: any) {
      showToast(err.message || 'Adjustment validation failed', 'error');
    } finally {
      setValidating(false);
    }
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!adjustment) return;
    try {
      await updateAdjustmentStatus(adjustment.id, newStatus);
      showToast(`Adjustment status updated to ${newStatus}`, 'success');
      loadAdjustmentDetail();
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Loading adjustment details...</p>
      </div>
    );
  }

  if (!adjustment) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-12 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
        <h3 className="text-base font-bold text-white">Inventory Adjustment Not Found</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/operations/adjustments')}
          className="border-slate-800 text-slate-300"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Return to Adjustments List
        </Button>
      </div>
    );
  }

  const isDone = adjustment.status === 'done';
  const isCanceled = adjustment.status === 'canceled';
  const isDraft = adjustment.status === 'draft';
  const diff = adjustment.difference;

  const pipelineSteps: { key: OrderStatus; label: string }[] = [
    { key: 'draft', label: 'Draft' },
    { key: 'waiting', label: 'Waiting Approval' },
    { key: 'ready', label: 'Ready for Validation' },
    { key: 'done', label: 'Completed (Done)' },
  ];

  const getReasonBadgeClass = (r?: string) => {
    switch (r) {
      case 'Damaged':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'Lost':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Found':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Counting Error':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title={`Inventory Adjustment ${adjustment.reference}`}
        description="Inspect stock count variance & execute atomic stock updates"
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/operations/adjustments')}
              className="border-slate-800 text-slate-300 hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="border-slate-800 text-slate-300 hover:bg-slate-800"
            >
              <Printer className="w-4 h-4 mr-2" /> Print Slip
            </Button>
          </div>
        }
      />

      {/* Control Actions & Pipeline Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        {/* Status Pipeline */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {pipelineSteps.map((step, idx) => {
            const currentIdx = pipelineSteps.findIndex((s) => s.key === adjustment.status);
            const isPassed = currentIdx >= idx;
            const isCurrent = adjustment.status === step.key;

            return (
              <React.Fragment key={step.key}>
                {idx > 0 && (
                  <div
                    className={cn(
                      'h-0.5 w-6 shrink-0',
                      isPassed ? 'bg-blue-500' : 'bg-slate-800'
                    )}
                  />
                )}
                <div
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors',
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-md'
                      : isPassed
                      ? 'bg-slate-800 text-blue-300'
                      : 'bg-slate-950/60 text-slate-500 border border-slate-800'
                  )}
                >
                  {isPassed && <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{step.label}</span>
                </div>
              </React.Fragment>
            );
          })}

          {isCanceled && (
            <div className="ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" /> Canceled
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {isDraft && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange('ready')}
              className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 font-semibold"
            >
              Mark as Ready
            </Button>
          )}

          {!isDone && !isCanceled && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleValidate}
              disabled={validating}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 shadow-lg shadow-emerald-900/30"
            >
              {validating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Validating Adjustment...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Validate & Apply Adjustment
                </>
              )}
            </Button>
          )}

          {!isDone && !isCanceled && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange('canceled')}
              className="border-slate-800 text-rose-400 hover:bg-rose-500/10"
            >
              Cancel Adjustment
            </Button>
          )}
        </div>
      </div>

      {/* Main Adjustment Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Product & Location Details */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reference</span>
              <h3 className="text-xl font-bold font-mono text-blue-400">{adjustment.reference}</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('px-2.5 py-1 rounded text-xs font-semibold border', getReasonBadgeClass(adjustment.reason))}>
                Reason: {adjustment.reason || 'Counting Error'}
              </span>
              <StatusBadge status={adjustment.status} />
            </div>
          </div>

          {/* Product Banner */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{adjustment.product?.name}</h4>
                <p className="text-xs font-mono text-slate-400">SKU: {adjustment.product?.sku}</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase text-slate-500 font-semibold block">Storage Bin</span>
              <span className="text-xs font-mono font-bold text-amber-400">
                {adjustment.location?.code} ({adjustment.warehouse?.code})
              </span>
            </div>
          </div>

          {/* Formula Summary Cards */}
          <div className="grid grid-cols-3 gap-4 text-center">
            {/* Recorded */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">
                Recorded (System)
              </span>
              <span className="text-lg font-bold font-mono text-slate-300">
                {adjustment.theoretical_quantity} {adjustment.product?.unit_of_measure || 'Units'}
              </span>
            </div>

            {/* Counted */}
            <div className="bg-slate-950 border border-blue-500/30 rounded-xl p-4">
              <span className="text-[10px] uppercase text-blue-400 font-bold block mb-1">
                Counted (Physical)
              </span>
              <span className="text-lg font-bold font-mono text-white">
                {adjustment.real_quantity} {adjustment.product?.unit_of_measure || 'Units'}
              </span>
            </div>

            {/* Difference */}
            <div
              className={cn(
                'border rounded-xl p-4',
                diff > 0
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : diff < 0
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              )}
            >
              <span className="text-[10px] uppercase font-bold block mb-1 opacity-80">
                Difference (Counted - Recorded)
              </span>
              <span className="text-lg font-bold font-mono inline-flex items-center gap-1">
                {diff > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : diff < 0 ? (
                  <TrendingDown className="w-4 h-4" />
                ) : null}
                {diff > 0 ? `+${diff}` : diff} {adjustment.product?.unit_of_measure || 'Units'}
              </span>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs border-t border-slate-800 pt-4">
            <div>
              <span className="text-slate-500 font-medium block">Created Date</span>
              <span className="text-slate-200 font-semibold mt-0.5 block">
                {adjustment.created_at ? new Date(adjustment.created_at).toLocaleDateString() : 'Today'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Completed Date</span>
              <span className="text-slate-200 font-semibold mt-0.5 block">
                {adjustment.completed_date
                  ? new Date(adjustment.completed_date).toLocaleString()
                  : 'Pending Completion'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Responsible</span>
              <span className="text-slate-200 font-semibold mt-0.5 block">
                {adjustment.responsible?.full_name || adjustment.creator?.full_name || 'Staff User'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Current Live Stock</span>
              <span className="text-blue-400 font-bold text-sm mt-0.5 block font-mono">
                {currentStock} {adjustment.product?.unit_of_measure || 'Units'}
              </span>
            </div>
          </div>

          {adjustment.notes && (
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-xs">
              <span className="text-slate-400 font-semibold block mb-0.5">Notes:</span>
              <p className="text-slate-200">{adjustment.notes}</p>
            </div>
          )}
        </div>

        {/* Right: Business Rule & Audit Summary */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Reconciliation Business Rule
            </h4>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>System Stock:</span>
                <span className="font-mono font-bold text-slate-200">{adjustment.theoretical_quantity}</span>
              </div>
              <div className="flex items-center justify-between text-white font-bold">
                <span>Counted Stock:</span>
                <span className="font-mono">{adjustment.real_quantity}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-bold">
                <span>Net Stock Change:</span>
                <span
                  className={cn(
                    'font-mono px-2 py-0.5 rounded border',
                    diff > 0
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : diff < 0
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  )}
                >
                  {diff > 0 ? `+${diff}` : diff} Units
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/40 p-2.5 rounded border border-slate-800/60">
              Validating this adjustment executes a Supabase/Postgres transactional RPC that updates the stock row to exactly <span className="font-bold text-white">{adjustment.real_quantity}</span> and creates an immutable audit trail entry in <span className="font-mono text-blue-400">stock_ledger</span>.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Adjustment Status:</span>
            <span className="font-semibold text-white uppercase">{adjustment.status}</span>
          </div>
        </div>
      </div>

      {/* Audit Trail & Ledger Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="border-b border-slate-800 px-6 flex items-center gap-6">
          <button
            onClick={() => setActiveTab('details')}
            className={cn(
              'py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all',
              activeTab === 'details'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            )}
          >
            <Sliders className="w-4 h-4" /> Adjustment Summary
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={cn(
              'py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all',
              activeTab === 'ledger'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            )}
          >
            <History className="w-4 h-4 text-emerald-400" /> Stock Ledger Audit Trail ({ledger.length})
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'details' ? (
            <div className="text-xs space-y-3 text-slate-300">
              <p>
                <span className="font-semibold text-white">Product: </span>
                {adjustment.product?.name} ([{adjustment.product?.sku}])
              </p>
              <p>
                <span className="font-semibold text-white">Warehouse & Bin: </span>
                {adjustment.warehouse?.name} ({adjustment.warehouse?.code}) / {adjustment.location?.code}
              </p>
              <p>
                <span className="font-semibold text-white">Reason Category: </span>
                <span className={cn('px-2 py-0.5 rounded border text-[11px]', getReasonBadgeClass(adjustment.reason))}>
                  {adjustment.reason || 'Counting Error'}
                </span>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {ledger.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No stock ledger entries generated yet. Once the adjustment is validated, an audit entry will appear here.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Entry Type</th>
                        <th className="py-3 px-4">Reference</th>
                        <th className="py-3 px-4">Product</th>
                        <th className="py-3 px-4">Warehouse & Location</th>
                        <th className="py-3 px-4 text-right">Quantity Change</th>
                        <th className="py-3 px-4 text-right">Balance After</th>
                        <th className="py-3 px-4">Recorded By</th>
                        <th className="py-3 px-4">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {ledger.map((lg) => (
                        <tr key={lg.id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                              {lg.entry_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-blue-400">
                            {lg.reference}
                          </td>
                          <td className="py-3 px-4 text-white font-medium">
                            {lg.product?.name || 'Product'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-slate-300">{lg.warehouse?.code}</span> /{' '}
                            <span className="font-mono text-slate-400">{lg.location?.code}</span>
                          </td>
                          <td
                            className={cn(
                              'py-3 px-4 text-right font-mono font-bold text-sm',
                              lg.quantity_change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            )}
                          >
                            {lg.quantity_change >= 0 ? `+${lg.quantity_change}` : lg.quantity_change}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-white">
                            {lg.balance_after}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {lg.user?.full_name || lg.user?.email || 'System'}
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {lg.created_at ? new Date(lg.created_at).toLocaleString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
