import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checkSystemHealth } from '../services/healthService';
import type { SystemHealth } from '../types';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Activity, Database, CheckCircle2, AlertTriangle, ShieldCheck, User, LogOut } from 'lucide-react';

export const LandingPage = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSystemHealth().then((res) => {
      setHealth(res);
      setLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navigation Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md">
            S
          </div>
          <span className="font-bold text-lg text-white tracking-tight">StockSense WMS</span>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 text-xs font-medium text-slate-200">
            <User className="w-3.5 h-3.5 text-blue-400" />
            <span>{profile?.full_name || user?.email}</span>
            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-semibold uppercase">
              {profile?.role === 'manager' ? 'Manager' : 'Staff'}
            </span>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10">
            <LogOut className="w-3.5 h-3.5 mr-1" /> Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-3xl w-full space-y-8 text-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider shadow-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Authenticated Session Active
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              StockSense Enterprise Operations
            </h1>
            <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
              Logged in as <strong className="text-white">{profile?.full_name || user?.email}</strong>. Session persisted via Supabase Auth.
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
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> User Role
                </CardTitle>
              </CardHeader>
              <div className="text-lg font-bold text-white capitalize font-mono">
                {profile?.role === 'manager' ? 'Inventory Manager' : 'Warehouse Staff'}
              </div>
            </Card>
          </div>

          {/* Action Controls */}
          <div className="pt-2 flex items-center justify-center gap-4">
            <Link to="/profile">
              <Button variant="outline" size="md">
                Manage Profile & Security
              </Button>
            </Link>
            <Button variant="primary" size="md" onClick={() => window.location.reload()}>
              Refresh Health Check
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
