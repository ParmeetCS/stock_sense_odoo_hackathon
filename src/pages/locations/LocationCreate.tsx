import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MapPin,
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { useToast } from '../../components/ui/Toast';
import {
  createLocation,
  checkLocationCodeUnique,
  fetchWarehousesList,
} from '../../services/warehouseService';
import type { Warehouse } from '../../types';

export const LocationCreate: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const preselectedWarehouseId = searchParams.get('warehouse_id') || '';

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [warehouseId, setWarehouseId] = useState(preselectedWarehouseId);
  const [type, setType] = useState('internal');
  const [isActive, setIsActive] = useState(true);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeChecking, setCodeChecking] = useState(false);
  const [codeStatus, setCodeStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

  useEffect(() => {
    fetchWarehousesList({ pageSize: 100 }).then((res) => {
      setWarehouses(res.warehouses);
      if (!warehouseId && res.warehouses.length > 0) {
        setWarehouseId(res.warehouses[0].id);
      }
    });
  }, []);

  // Code uniqueness check within selected warehouse
  const handleCodeBlur = async () => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode || !warehouseId) {
      setCodeStatus('idle');
      return;
    }

    setCodeChecking(true);
    try {
      const isUnique = await checkLocationCodeUnique(warehouseId, cleanCode);
      if (isUnique) {
        setCodeStatus('valid');
        setErrors((prev) => {
          const next = { ...prev };
          delete next.code;
          return next;
        });
      } else {
        setCodeStatus('invalid');
        setErrors((prev) => ({
          ...prev,
          code: `Code "${cleanCode}" is already in use in this warehouse.`,
        }));
      }
    } catch {
      setCodeStatus('idle');
    } finally {
      setCodeChecking(false);
    }
  };

  const generateCode = () => {
    const randomBin = 'LOC-' + String.fromCharCode(65 + Math.floor(Math.random() * 6)) + Math.floor(1 + Math.random() * 9);
    setCode(randomBin);
    setCodeStatus('idle');
  };

  const validate = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Location name is required.';
    if (!warehouseId) newErrors.warehouse = 'A warehouse must be selected.';

    if (!code.trim()) {
      newErrors.code = 'Location short code is required.';
    } else if (warehouseId) {
      const isUnique = await checkLocationCodeUnique(warehouseId, code.trim().toUpperCase());
      if (!isUnique) {
        newErrors.code = `Location code "${code.trim().toUpperCase()}" is already in use in this warehouse.`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (createAnother = false) => {
    const isValid = await validate();
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      const created = await createLocation({
        warehouse_id: warehouseId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        type,
        is_active: isActive,
      });

      showToast('Location Created', `Location "${created.name}" (${created.code}) created successfully.`, 'success');

      if (createAnother) {
        setName('');
        setCode('');
        setCodeStatus('idle');
        setErrors({});
      } else {
        navigate(`/settings/locations/${created.id}`);
      }
    } catch (err: any) {
      showToast('Creation Failed', err.message || 'Could not create location', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <PageHeader
        breadcrumbs={[
          { label: 'Configuration', href: '/settings/locations' },
          { label: 'Locations', href: '/settings/locations' },
          { label: 'Create New Location' },
        ]}
        title="Create New Storage Location"
        description="Configure an internal bin, shelf, rack, or zone mapped to a specific warehouse."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/settings/locations')}
              disabled={isSubmitting}
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
            >
              Save & Create Another
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {isSubmitting ? 'Saving...' : 'Save Location'}
            </Button>
          </div>
        }
      />

      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-5 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <MapPin className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold text-white">Location Details</h3>
        </div>

        <FormField label="Warehouse Facility" required error={errors.warehouse} helperText="A location belongs to exactly one warehouse">
          <select
            value={warehouseId}
            onChange={(e) => {
              setWarehouseId(e.target.value);
              setCodeStatus('idle');
            }}
            className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} [{w.code}]
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Location Name" required error={errors.name}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bin A1 - Top Shelf"
              className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              autoFocus
            />
          </FormField>

          <FormField
            label="Short Code"
            required
            error={errors.code}
            helperText={
              codeStatus === 'valid'
                ? '✓ Code is unique in this warehouse'
                : 'Unique identifier per warehouse (e.g. LOC-A1, BIN-01)'
            }
          >
            <div className="relative">
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setCodeStatus('idle');
                }}
                onBlur={handleCodeBlur}
                placeholder="e.g. LOC-A1"
                className="w-full h-9 pl-3 pr-20 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-blue-300 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {codeChecking ? (
                  <span className="text-[10px] text-slate-400 animate-pulse">Checking...</span>
                ) : codeStatus === 'valid' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : codeStatus === 'invalid' ? (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                ) : null}
                <button
                  type="button"
                  onClick={generateCode}
                  title="Generate Code"
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-medium"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                </button>
              </div>
            </div>
          </FormField>
        </div>

        <FormField label="Location Type">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="internal">Internal (Physical Stock Storage)</option>
            <option value="transit">Transit / Staging Area</option>
            <option value="receiving">Inbound Receiving Bay</option>
            <option value="shipping">Outbound Shipping Bay</option>
          </select>
        </FormField>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="locActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0 cursor-pointer"
          />
          <label htmlFor="locActive" className="text-xs font-semibold text-slate-300 cursor-pointer">
            Location is active and available for inventory storage and picking
          </label>
        </div>
      </div>
    </div>
  );
};
