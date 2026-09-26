import { useEffect, useState } from 'react';
import { checkSystemHealth } from '../services/healthService';
import type { SystemHealth } from '../types';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Activity, Database, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export const LandingPage = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSystemHealth().then((res) => {
      setHealth(res);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-3xl w-full space-y-8 text-center">
        {/* Header Branding */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider shadow-sm">
            <ShieldCheck className="w-4 h-4 text-blue-400" /> StockSense Enterprise WMS
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            StockSense Project Foundation
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
            High-performance, precision-engineered inventory management system foundation initialized with Supabase backend architecture.
          </p>
        </div>

        {/* Health Status Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <Card className="bg-slate-900/90 border-slate-800 text-slate-100">
            <CardHeader className="border-slate-800">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" /> Core System
              </CardTitle>
            </CardHeader>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-lg font-bold capitalize text-white">
                {loading ? 'Checking...' : health?.status}
              </span>
            </div>
          </Card>

          <Card className="bg-slate-900/90 border-slate-800 text-slate-100">
            <CardHeader className="border-slate-800">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-400" /> Supabase Client
              </CardTitle>
            </CardHeader>
            <div className="flex items-center gap-2">
              {health?.databaseConnected ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400">Initialized & Active</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-400">Client Configured</span>
                </>
              )}
            </div>
          </Card>

          <Card className="bg-slate-900/90 border-slate-800 text-slate-100">
            <CardHeader className="border-slate-800">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Version
              </CardTitle>
            </CardHeader>
            <div className="text-lg font-bold text-white font-mono">
              v{health?.version || '1.0.0'}
            </div>
          </Card>
        </div>

        {/* Action Controls */}
        <div className="pt-2 flex items-center justify-center gap-4">
          <Button variant="primary" size="lg" onClick={() => window.location.reload()}>
            Refresh Health Check
          </Button>
        </div>
      </div>
    </div>
  );
};
