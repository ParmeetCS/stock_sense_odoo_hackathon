import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
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
import { createWarehouse, checkWarehouseCodeUnique } from '../../services/warehouseService';

export const WarehouseCreate: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeChecking, setCodeChecking] = useState(false);
  const [codeStatus, setCodeStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

  // Short code uniqueness check
  const handleCodeBlur = async () => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setCodeStatus('idle');
      return;
    }

    setCodeChecking(true);
    try {
      const isUnique = await checkWarehouseCodeUnique(cleanCode);
      if (isUnique) {
        setCodeStatus('valid');
        setErrors((prev) => {
          const next = { ...prev };
          delete next.code;
          return next;
        });
      } else {
        setCodeStatus('invalid');
        setErrors((prev) => ({ ...prev, code: `Warehouse code "${cleanCode}" is already in use.` }));
      }
    } catch {
      setCodeStatus('idle');
    } finally {
      setCodeChecking(false);
    }
  };

  const generateCode = () => {
    if (!name.trim()) {
      setCode('WH' + Math.floor(10 + Math.random() * 90));
      return;
    }
    const words = name.trim().split(' ');
    let prefix = '';
    if (words.length > 1) {
      prefix = (words[0][0] + words[1][0]).toUpperCase();
    } else {
      prefix = name.substring(0, 3).toUpperCase();
    }
    setCode(`${prefix}01`);
    setCodeStatus('idle');
  };

  const validate = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Warehouse name is required.';
    if (!code.trim()) {
      newErrors.code = 'Short code is required.';
    } else {
      const isUnique = await checkWarehouseCodeUnique(code.trim().toUpperCase());
      if (!isUnique) {
        newErrors.code = `Warehouse code "${code.trim().toUpperCase()}" is already taken.`;
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
      const created = await createWarehouse({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        address: address.trim() || undefined,
        is_active: isActive,
      });

      showToast('Warehouse Created', `Warehouse "${created.name}" (${created.code}) created successfully.`, 'success');

      if (createAnother) {
        setName('');
        setCode('');
        setAddress('');
        setCodeStatus('idle');
        setErrors({});
      } else {
        navigate(`/settings/warehouses/${created.id}`);
      }
    } catch (err: any) {
      showToast('Creation Failed', err.message || 'Could not create warehouse', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <PageHeader
        breadcrumbs={[
          { label: 'Configuration', href: '/settings/warehouses' },
          { label: 'Warehouses', href: '/settings/warehouses' },
          { label: 'Create New Warehouse' },
        ]}
        title="Create New Warehouse"
        description="Add a new storage hub, distribution facility, or logistics center."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/settings/warehouses')}
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
              {isSubmitting ? 'Saving...' : 'Save Warehouse'}
            </Button>
          </div>
        }
      />

      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-5 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Building2 className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-bold text-white">Facility Details</h3>
        </div>

        <FormField label="Warehouse Name" required error={errors.name}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Central Logistics Hub"
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
              ? '✓ Code is unique and available'
              : 'Unique facility identifier (e.g. WH01, NORTH-HUB)'
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
              placeholder="e.g. WH01"
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

        <FormField label="Physical Address / Location Details">
          <textarea
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street address, city, industrial park, sector, postal code..."
            className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </FormField>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="whActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0 cursor-pointer"
          />
          <label htmlFor="whActive" className="text-xs font-semibold text-slate-300 cursor-pointer">
            Facility is active for inbound receipts, deliveries, and internal transfers
          </label>
        </div>
      </div>
    </div>
  );
};
