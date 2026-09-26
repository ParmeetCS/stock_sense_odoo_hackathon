import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { User, Mail, ShieldCheck, LogOut, Calendar } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, profile, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'manager':
        return <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-semibold">Inventory Manager</span>;
      case 'admin':
        return <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold">System Admin</span>;
      case 'inventory_user':
      default:
        return <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">Warehouse Staff</span>;
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Profile & Security Settings</h1>
          <p className="text-xs text-slate-400">Manage your StockSense account information and security role</p>
        </div>
        <Button variant="danger" size="sm" onClick={handleLogout} className="flex items-center gap-1.5">
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="border-slate-800 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xl uppercase">
            {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
          <div>
            <CardTitle className="text-xl text-white">{profile?.full_name || 'StockSense User'}</CardTitle>
            <div className="mt-1">{getRoleBadge(profile?.role)}</div>
          </div>
        </CardHeader>

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-500" /> Account Email
            </span>
            <span className="text-sm font-mono text-slate-200">{user?.email}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" /> Account ID (UUID)
            </span>
            <span className="text-xs font-mono text-slate-400">{user?.id}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-500" /> Auth Provider
            </span>
            <span className="text-sm font-medium text-emerald-400">Supabase Auth (JWT)</span>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" /> Member Since
            </span>
            <span className="text-xs text-slate-300 font-mono">
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Active'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};
