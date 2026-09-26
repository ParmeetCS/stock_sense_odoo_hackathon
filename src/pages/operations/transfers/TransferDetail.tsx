import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Printer,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Package,
  History,
  MinusCircle,
  PlusCircle,
  ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { ConfirmDialog } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../context/AuthContext';
import { parseErrorMessage } from '../../../utils/errorHandler';
import {
  fetchTransferById,
  validateTransfer,
  updateTransferStatus,
} from '../../../services/transferService';
import type { InternalTransfer, StockLedger, OrderStatus } from '../../../types';
import type { StockImpactItem } from '../../../services/transferService';
import { cn } from '../../../utils/cn';

export const TransferDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [transfer, setTransfer] = useState<InternalTransfer | null>(null);
  const [ledger, setLedger] = useState<StockLedger[]>([]);
  const [stockImpact, setStockImpact] = useState<StockImpactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'impact' | 'ledger'>('items');

  useEffect(() => {
    if (id) {
      loadTransferDetail();
    }
  }, [id]);

  // Confirmation Modal States
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const loadTransferDetail = async () => {
    try {
      setLoading(true);
      const data = await fetchTransferById(id!);
      setTransfer(data.transfer);
      setLedger(data.ledger);
      setStockImpact(data.stockImpact);
    } catch (err: any) {
      showToast('Error Loading Transfer', parseErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!transfer) return;

    try {
      setValidating(true);
      const result = await validateTransfer(transfer.id, user?.id);
      showToast('Transfer Validated', result.message, 'success');
      setShowValidateModal(false);
      loadTransferDetail();
    } catch (err: any) {
      showToast('Validation Error', parseErrorMessage(err), 'error');
    } finally {
      setValidating(false);
    }
  };

  const handleCancel = async () => {
    if (!transfer) return;
    try {
      await updateTransferStatus(transfer.id, 'canceled');
      showToast('Transfer Canceled', 'Internal transfer status changed to canceled.', 'success');
      setShowCancelModal(false);
      loadTransferDetail();
    } catch (err: any) {
      showToast('Cancellation Error', parseErrorMessage(err), 'error');
    }
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!transfer) return;
    if (newStatus === 'canceled') {
      setShowCancelModal(true);
      return;
    }
    try {
      await updateTransferStatus(transfer.id, newStatus);
      showToast('Status Updated', `Transfer status updated to ${newStatus}`, 'success');
      loadTransferDetail();
    } catch (err: any) {
      showToast('Status Update Failed', parseErrorMessage(err), 'error');
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Loading transfer details...</p>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-12 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
        <h3 className="text-base font-bold text-white">Internal Transfer Not Found</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/operations/transfers')}
          className="border-slate-800 text-slate-300"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Return to Transfers List
        </Button>
      </div>
    );
  }

  const isDone = transfer.status === 'done';
  const isCanceled = transfer.status === 'canceled';
  const isDraft = transfer.status === 'draft';

  const pipelineSteps: { key: OrderStatus; label: string }[] = [
    { key: 'draft', label: 'Draft' },
    { key: 'waiting', label: 'Waiting Availability' },
    { key: 'ready', label: 'Ready for Validation' },
    { key: 'done', label: 'Completed (Done)' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title={`Internal Transfer ${transfer.reference}`}
        description="Review stock movement, inspect impact & execute atomic completion"
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/operations/transfers')}
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
            const currentIdx = pipelineSteps.findIndex((s) => s.key === transfer.status);
            const isPassed = currentIdx >= idx;
            const isCurrent = transfer.status === step.key;

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
              onClick={() => setShowValidateModal(true)}
              disabled={validating}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 shadow-lg shadow-emerald-900/30"
            >
              {validating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Validating Transfer...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Validate & Complete Transfer
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
              Cancel Transfer
            </Button>
          )}
        </div>
      </div>

      {/* Transfer Information Overview Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Source & Destination Overview */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reference</span>
              <h3 className="text-xl font-bold font-mono text-blue-400">{transfer.reference}</h3>
            </div>
            <StatusBadge status={transfer.status} />
          </div>

          {/* Location Flow Banner */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4 items-center relative">
            {/* Source */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                <MinusCircle className="w-3.5 h-3.5" /> Source Location (-30 Stock)
              </span>
              <p className="text-sm font-bold text-white">{transfer.source_warehouse?.name}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Bin:</span>
                <span className="text-xs font-mono font-bold text-amber-300 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                  {transfer.source_location?.code} - {transfer.source_location?.name}
                </span>
              </div>
            </div>

            {/* Transfer Arrow Icon */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-blue-600 text-white items-center justify-center shadow-lg">
              <ArrowRight className="w-4 h-4" />
            </div>

            {/* Destination */}
            <div className="space-y-1 md:text-right">
              <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold flex items-center justify-start md:justify-end gap-1.5">
                <PlusCircle className="w-3.5 h-3.5" /> Destination Location (+30 Stock)
              </span>
              <p className="text-sm font-bold text-white">{transfer.destination_warehouse?.name}</p>
              <div className="flex items-center gap-2 md:justify-end">
                <span className="text-xs text-slate-400">Bin:</span>
                <span className="text-xs font-mono font-bold text-emerald-300 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                  {transfer.destination_location?.code} - {transfer.destination_location?.name}
                </span>
              </div>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 font-medium block">Scheduled Date</span>
              <span className="text-slate-200 font-semibold mt-0.5 block">
                {transfer.scheduled_date
                  ? new Date(transfer.scheduled_date).toLocaleDateString()
                  : 'Today'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Completed Date</span>
              <span className="text-slate-200 font-semibold mt-0.5 block">
                {transfer.completed_date
                  ? new Date(transfer.completed_date).toLocaleString()
                  : 'Pending Completion'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Responsible</span>
              <span className="text-slate-200 font-semibold mt-0.5 block">
                {transfer.responsible?.full_name || transfer.creator?.full_name || 'Staff User'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Total Units</span>
              <span className="text-blue-400 font-bold text-sm mt-0.5 block">
                {transfer.total_quantity || 0} Units
              </span>
            </div>
          </div>
        </div>

        {/* Business Rule Summary Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Business Rule Verification
            </h4>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-amber-400">
                  <span>Source Stock:</span>
                  <span className="font-mono font-bold">-{transfer.total_quantity || 0} Units</span>
                </div>
                <div className="flex items-center justify-between text-emerald-400">
                  <span>Destination Stock:</span>
                  <span className="font-mono font-bold">+{transfer.total_quantity || 0} Units</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-blue-400 font-bold">
                  <span>Total Company Inventory:</span>
                  <span className="bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30">UNCHANGED (Net 0)</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/40 p-2.5 rounded border border-slate-800/60">
                <span className="text-slate-300 font-semibold">Atomic Execution: </span>
                Clicking &quot;Validate & Complete Transfer&quot; executes a single Supabase/Postgres transactional RPC to update source stock, destination stock, and generate dual audit ledger records.
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Status:</span>
            <span className="font-semibold text-white uppercase">{transfer.status}</span>
          </div>
        </div>
      </div>

      {/* Tabs Bar: Line Items | Stock Impact Preview | Audit Trail Ledger */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="border-b border-slate-800 px-6 flex items-center gap-6">
          <button
            onClick={() => setActiveTab('items')}
            className={cn(
              'py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all',
              activeTab === 'items'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            )}
          >
            <Package className="w-4 h-4" /> Transfer Line Items ({transfer.items?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('impact')}
            className={cn(
              'py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all',
              activeTab === 'impact'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            )}
          >
            <ArrowRightLeft className="w-4 h-4 text-emerald-400" /> Stock Impact Preview (Before / After)
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
            <History className="w-4 h-4" /> Stock Ledger Audit Trail ({ledger.length})
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'items' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Unit of Measure</th>
                    <th className="py-3 px-4 text-right">Transfer Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {transfer.items?.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-blue-400">
                        {item.product?.sku || 'SKU'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {item.product?.name || 'Product'}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {item.product?.unit_of_measure || 'Units'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold font-mono text-sm text-white">
                        {item.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'impact' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">Source On Hand (Before)</th>
                      <th className="py-3 px-4">Source On Hand (After)</th>
                      <th className="py-3 px-4">Dest On Hand (Before)</th>
                      <th className="py-3 px-4">Dest On Hand (After)</th>
                      <th className="py-3 px-4 text-center">Company Net Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {stockImpact.map((sp) => (
                      <tr key={sp.product_id} className="hover:bg-slate-800/40">
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <div>{sp.product_name}</div>
                          <div className="text-[11px] font-mono text-slate-400">{sp.sku}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-300">
                          {sp.source_on_hand_before}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-400 bg-amber-500/5">
                          {sp.source_on_hand_after} (-{sp.quantity})
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-300">
                          {sp.dest_on_hand_before}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 bg-emerald-500/5">
                          {sp.dest_on_hand_after} (+{sp.quantity})
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold font-mono text-blue-400">
                          0 (UNCHANGED)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'ledger' && (
            <div className="space-y-4">
              {ledger.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No stock ledger entries generated yet. Once the transfer is validated, dual audit entries (transfer_out & transfer_in) will appear here.
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
                      {ledger.map((lg) => {
                        const isOut = lg.entry_type === 'transfer_out';
                        return (
                          <tr key={lg.id} className="hover:bg-slate-800/40">
                            <td className="py-3 px-4">
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase',
                                  isOut
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                )}
                              >
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
                                isOut ? 'text-amber-400' : 'text-emerald-400'
                              )}
                            >
                              {lg.quantity_change > 0 ? `+${lg.quantity_change}` : lg.quantity_change}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-200">
                              {lg.balance_after}
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              {lg.user?.full_name || lg.user?.email || 'System'}
                            </td>
                            <td className="py-3 px-4 text-slate-400">
                              {lg.created_at ? new Date(lg.created_at).toLocaleString() : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Validation Modal */}
      <ConfirmDialog
        isOpen={showValidateModal}
        onClose={() => setShowValidateModal(false)}
        onConfirm={handleValidate}
        title="Confirm Internal Transfer Validation"
        message={`Are you sure you want to validate transfer ${transfer.reference}? Stock will decrease at ${transfer.source_location?.name} and increase at ${transfer.destination_location?.name}.`}
        confirmLabel="Validate & Transfer"
        variant="primary"
        loading={validating}
      />

      {/* Confirm Cancellation Modal */}
      <ConfirmDialog
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
        title="Cancel Internal Transfer"
        message={`Are you sure you want to cancel transfer ${transfer.reference}? Canceled transfers cannot be validated.`}
        confirmLabel="Cancel Transfer Order"
        variant="danger"
      />
    </div>
  );
};
