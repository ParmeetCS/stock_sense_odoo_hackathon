import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { PageHeader } from './ui/PageHeader';
import { Button } from './ui/Button';
import { DataTable } from './ui/DataTable';
import type { Column } from './ui/DataTable';
import { StatusBadge } from './ui/StatusBadge';
import { FilterBar, FilterChip } from './ui/FilterBar';
import { SearchInput } from './ui/SearchInput';
import { Plus, CheckCircle2, ShieldAlert } from 'lucide-react';

interface PlaceholderProps {
  title: string;
  moduleName: string;
  category?: string;
  createPath?: string;
}

export const PlaceholderModule: React.FC<PlaceholderProps> = ({
  title,
  moduleName,
  category = 'StockSense Module',
  createPath,
}) => {
  const location = useLocation();

  const mockRows = [
    {
      id: 'REC-2026-001',
      reference: 'WH/IN/0001',
      entity: 'Global Logistics & Supply Co.',
      warehouse: 'Main Warehouse [WH01]',
      status: 'ready',
      date: '2026-09-26',
      items: '12 Items',
    },
    {
      id: 'REC-2026-002',
      reference: 'WH/OUT/0001',
      entity: 'Apex Hardware Ltd.',
      warehouse: 'Main Warehouse [WH01]',
      status: 'waiting',
      date: '2026-09-26',
      items: '8 Items',
    },
    {
      id: 'REC-2026-003',
      reference: 'WH/INT/0001',
      entity: 'Internal Transfer',
      warehouse: 'WH01 -> WH02',
      status: 'done',
      date: '2026-09-25',
      items: '5 Items',
    },
    {
      id: 'REC-2026-004',
      reference: 'ADJ/0001',
      entity: 'Stock Audit Reconcile',
      warehouse: 'Secondary WH [WH02]',
      status: 'draft',
      date: '2026-09-24',
      items: '2 Items',
    },
  ];

  const columns: Column<(typeof mockRows)[0]>[] = [
    { key: 'reference', header: 'Reference', width: '160px' },
    { key: 'entity', header: 'Source / Entity' },
    { key: 'warehouse', header: 'Warehouse Facility' },
    { key: 'items', header: 'Quantity / Units', align: 'center' },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => <StatusBadge status={row.status} />,
    },
    { key: 'date', header: 'Timestamp', align: 'right' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={`Active module route: ${location.pathname} • Shell navigation & target architecture verified`}
        breadcrumbs={[
          { label: category },
          { label: moduleName },
        ]}
        actions={
          createPath ? (
            <Link to={createPath}>
              <Button variant="primary" size="md" className="flex items-center gap-1.5 font-semibold">
                <Plus className="w-4 h-4" /> New Record
              </Button>
            </Link>
          ) : undefined
        }
      />

      {/* Module Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Total Active Records</span>
            <h3 className="text-xl font-bold text-white mt-0.5">24 Records</h3>
          </div>
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Pending Execution</span>
            <h3 className="text-xl font-bold text-amber-300 mt-0.5">8 Waiting</h3>
          </div>
          <ShieldAlert className="w-6 h-6 text-amber-400" />
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Active Route Path</span>
            <h3 className="text-xs font-mono font-bold text-blue-400 mt-1 truncate max-w-[180px]">
              {location.pathname}
            </h3>
          </div>
          <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase">
            Route OK
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <SearchInput placeholder={`Filter ${moduleName.toLowerCase()}...`} />
          <FilterBar>
            <FilterChip label="Warehouse" value="WH01" active />
            <FilterChip label="Status" value="All Statuses" />
          </FilterBar>
        </div>

        {/* Data Table Shell */}
        <DataTable columns={columns} data={mockRows} />
      </div>
    </div>
  );
};
