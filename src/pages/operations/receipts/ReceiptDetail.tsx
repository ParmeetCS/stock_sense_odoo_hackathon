import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowLeft,
  Printer,
  CheckCircle2,
  Clock,
  Building2,
  User,
  History,
  Layers,
  CheckCheck,
  Ban,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../context/AuthContext';
import {
  fetchReceiptById,
  validateReceipt,
  updateReceiptStatus,
} from '../../../services/receiptService';
import type { Receipt, StockLedger, OrderStatus } from '../../../types';
import { cn } from '../../../utils/cn';

export const ReceiptDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [ledger, setLedger] = useState<StockLedger[]>([]);
  const [stockImpact, setStockImpact] = useState<Array<{
    product_id: string;
    product_name: string;
    sku: string;
    unit_of_measure: string;
    current_on_hand: number;
    expected_quantity: number;
    received_quantity: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchReceiptById(id);
      setReceipt(data.receipt);
      setLedger(data.ledger);
      setStockImpact(data.stockImpact);
    } catch (err: any) {
      showToast('Receipt Not Found', err.message || 'Failed to load receipt details.', 'error');
      navigate('/operations/receipts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleCopyRef = () => {
    if (!receipt?.reference) return;
    navigator.clipboard.writeText(receipt.reference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  // Validate / Complete Receipt Atomically
  const handleValidate = async () => {
    if (!id) return;
    setValidating(true);
    try {
      const res = await validateReceipt(id, user?.id);
      showToast('Receipt Validated', res.message, 'success');
      loadData();
    } catch (err: any) {
      showToast('Validation Error', err.message, 'error');
    } finally {
      setValidating(false);
    }
  };

  // Change Status
  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!id) return;
    try {
      await updateReceiptStatus(id, newStatus);
      showToast('Status Updated', `Receipt status changed to ${newStatus}.`, 'success');
      loadData();
    } catch (err: any) {
      showToast('Status Update Failed', err.message, 'error');
    }
  };

  // Print Receipt Note / Packing Slip
  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-xs font-medium">Loading inbound receipt and stock audit log...</span>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Receipt order not found.</p>
        <Button variant="primary" size="sm" onClick={() => navigate('/operations/receipts')} className="mt-4">
          Back to Inbound Receipts
        </Button>
      </div>
    );
  }

  const isDone = receipt.status === 'done';
  const isCanceled = receipt.status === 'canceled';

  const stages: OrderStatus[] = ['draft', 'waiting', 'ready', 'done'];
  const currentStageIndex = stages.indexOf(receipt.status);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 print:p-0 print:space-y-4">
      {/* Action Header - Hidden during print */}
      <div className="print:hidden">
        <PageHeader
          breadcrumbs={[
            { label: 'Operations', href: '/operations/receipts' },
            { label: 'Inbound Receipts', href: '/operations/receipts' },
            { label: receipt.reference },
          ]}
          title={`Receipt: ${receipt.reference}`}
          description={`Inbound shipment from ${receipt.supplier?.name || 'Vendor'} to ${receipt.warehouse?.name || 'Warehouse'}`}
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/operations/receipts')}
                className="text-xs"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="text-xs text-slate-300"
              >
                <Printer className="w-4 h-4 mr-1.5" /> Print Goods Note
              </Button>

              {/* Workflow stage transitions */}
              {!isDone && !isCanceled && (
                <>
                  {receipt.status === 'draft' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleStatusChange('ready')}
                      className="text-xs"
                    >
                      Mark as Ready
                    </Button>
                  )}

                  {receipt.status === 'ready' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleStatusChange('waiting')}
                      className="text-xs"
                    >
                      Mark as Waiting
                    </Button>
                  )}

                  {receipt.status === 'waiting' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleStatusChange('ready')}
                      className="text-xs"
                    >
                      Mark as Ready
                    </Button>
                  )}

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleValidate}
                    disabled={validating}
                    className="bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-500/20 text-xs font-semibold"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    {validating ? 'Executing Atomic Booking...' : 'Validate & Receive Goods'}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStatusChange('canceled')}
                    className="text-xs text-red-400 hover:bg-red-500/10"
                  >
                    <Ban className="w-4 h-4 mr-1.5" /> Cancel Order
                  </Button>
                </>
              )}
            </div>
          }
        />
      </div>

      {/* Main Receipt Document Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-6 shadow-sm backdrop-blur-sm print:bg-white print:text-black print:border-none print:shadow-none">
        {/* Document Top Bar & Workflow Status Stepper */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800 print:border-black">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl font-bold print:hidden">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white font-mono tracking-tight print:text-black">
                  {receipt.reference}
                </h2>
                <button
                  onClick={handleCopyRef}
                  className="p-1 text-slate-400 hover:text-white print:hidden"
                  title="Copy Reference"
                >
                  {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-xs text-slate-400 print:text-slate-600">
                Created on {receipt.created_at ? new Date(receipt.created_at).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>

          {/* Workflow Stepper */}
          <div className="flex items-center gap-2 bg-slate-950/80 p-2 rounded-xl border border-slate-800 print:hidden">
            {isCanceled ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                <Ban className="w-4 h-4" /> Order Canceled
              </span>
            ) : (
              stages.map((stage, idx) => {
                const isPassed = currentStageIndex >= idx;
                const isCurrent = receipt.status === stage;
                return (
                  <div key={stage} className="flex items-center gap-2">
                    {idx > 0 && <div className={cn('w-4 h-0.5', isPassed ? 'bg-blue-500' : 'bg-slate-800')} />}
                    <div
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all',
                        isCurrent
                          ? isDone
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-blue-600 text-white shadow-md'
                          : isPassed
                          ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                          : 'bg-slate-900 text-slate-500'
                      )}
                    >
                      {stage === 'done' ? <CheckCheck className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      <span>{stage}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Header Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs print:border-black print:bg-slate-50">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Vendor / Supplier</span>
            <div className="font-bold text-white text-sm print:text-black">{receipt.supplier?.name || 'Unassigned'}</div>
            {receipt.contact && <div className="text-slate-400">{receipt.contact}</div>}
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Destination Facility</span>
            <div className="font-bold text-white print:text-black flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{receipt.warehouse?.name}</span>
            </div>
            <div className="font-mono text-purple-300 font-semibold">
              Bin: {receipt.destination_location?.name} [{receipt.destination_location?.code}]
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Delivery Schedule</span>
            <div className="text-white print:text-black font-mono">
              Scheduled: {receipt.scheduled_date ? new Date(receipt.scheduled_date).toLocaleDateString() : 'Immediate'}
            </div>
            {receipt.received_date && (
              <div className="text-emerald-400 font-mono text-[11px]">
                Received: {new Date(receipt.received_date).toLocaleString()}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Operator / Responsible</span>
            <div className="text-white print:text-black flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>{receipt.creator?.full_name || receipt.creator?.email || 'System'}</span>
            </div>
            <div className="text-slate-400 text-[11px]">Status: <StatusBadge status={receipt.status} className="ml-1" /></div>
          </div>
        </div>

        {receipt.notes && (
          <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 text-xs text-slate-300">
            <strong className="text-slate-400 block mb-0.5">Notes & Handling Instructions:</strong>
            {receipt.notes}
          </div>
        )}

        {/* Items Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white print:text-black">
              Inbound Shipment Line Items ({receipt.items?.length || 0})
            </h3>
            <span className="text-xs text-slate-400 font-mono print:text-black">
              Total: <strong>{receipt.total_quantity_expected} units</strong>
            </span>
          </div>

          <div className="rounded-xl border border-slate-800 overflow-hidden print:border-black">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 print:bg-slate-100 print:text-black">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3 text-right">Expected</th>
                  <th className="px-4 py-3 text-right">Received</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3 text-right">Unit Cost</th>
                  <th className="px-4 py-3 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200 print:text-black">
                {receipt.items?.map((item) => {
                  const lineTotal = (Number(item.quantity_expected) || 0) * (Number(item.unit_cost) || 0);
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/20">
                      <td className="px-4 py-3 font-semibold text-white print:text-black">
                        {item.product?.name || 'Product'}
                      </td>
                      <td className="px-4 py-3 font-mono text-blue-300 print:text-black font-bold">
                        {item.product?.sku || 'SKU'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-white print:text-black">
                        {Number(item.quantity_expected).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400 print:text-black">
                        {isDone ? Number(item.quantity_received || item.quantity_expected).toLocaleString() : '0'}
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                        {item.product?.unit_of_measure || 'Units'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-300 print:text-black">
                        ${Number(item.unit_cost).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-white print:text-black">
                        ${lineTotal.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2 text-xs">
            <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-3">
              <span className="text-slate-400">Total Shipment Valuation:</span>
              <span className="text-base font-bold font-mono text-emerald-400">
                ${(receipt.total_cost || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Stock Impact Preview */}
        <div className="space-y-3 pt-4 border-t border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Inventory Allocation & Balance Impact
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stockImpact.map((impact) => {
              const before = impact.current_on_hand;
              const delta = isDone ? 0 : impact.expected_quantity;
              const projected = isDone ? before : before + delta;

              return (
                <div
                  key={impact.product_id}
                  className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/90 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white truncate">{impact.product_name}</span>
                    <span className="font-mono text-blue-300 font-bold text-[10px]">{impact.sku}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-900">
                    <span className="text-slate-500">Current On Hand:</span>
                    <span className="font-mono text-slate-300">{before} {impact.unit_of_measure}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Inbound Delta:</span>
                    <span className="font-mono text-emerald-400 font-bold">+{impact.expected_quantity} {impact.unit_of_measure}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                    <span className="text-slate-400 font-bold">
                      {isDone ? 'Updated Balance:' : 'Projected Balance:'}
                    </span>
                    <span className="font-mono text-white font-bold">{projected} {impact.unit_of_measure}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stock Ledger Entries (When Validated) */}
        {isDone && (
          <div className="space-y-3 pt-4 border-t border-slate-800 print:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Stock Ledger Audit Trail (Immutable Transactions)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Booked into {receipt.warehouse?.code} / {receipt.destination_location?.code}
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-3 py-2.5">Timestamp</th>
                    <th className="px-3 py-2.5">SKU / Product</th>
                    <th className="px-3 py-2.5">Reference</th>
                    <th className="px-3 py-2.5 text-right">Quantity In</th>
                    <th className="px-3 py-2.5 text-right">Bin Balance After</th>
                    <th className="px-3 py-2.5">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {ledger.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500 italic">
                        Ledger transactions registered with reference {receipt.reference}
                      </td>
                    </tr>
                  ) : (
                    ledger.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-800/30">
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-400">
                          {entry.created_at ? new Date(entry.created_at).toLocaleString() : '—'}
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-mono text-blue-300 font-bold">{entry.product?.sku}</span>{' '}
                          <span className="text-slate-400">({entry.product?.name})</span>
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-300">
                          {entry.reference}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-400">
                          +{entry.quantity_change}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-white">
                          {Number(entry.balance_after).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-slate-400 text-[11px]">
                          {entry.user?.full_name || entry.user?.email || 'System'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
