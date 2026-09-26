import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { User, Mail, Lock, AlertCircle, ArrowRight, ShieldCheck, UserCheck, MailCheck } from 'lucide-react';
import type { UserRole } from '../../types';

export const Register: React.FC = () => {
  const { signUp } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('inventory_user');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    const { error: signUpError } = await signUp(email, password, fullName, role);

    if (signUpError) {
      setError(signUpError.message || 'Registration failed. Please check details.');
      setLoading(false);
    } else {
      setLoading(false);
      setSuccessMsg(
        `Account created successfully! Please check your mailbox (${email}) to confirm your email address before signing in.`
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 text-slate-100">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-blue-400" /> StockSense WMS
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Enterprise Registration
          </h1>
          <p className="text-sm text-slate-400">
            Create an account for Inventory Manager or Warehouse Staff
          </p>
        </div>

        {/* Card */}
        <Card className="bg-slate-900 border-slate-800 shadow-2xl">
          <CardHeader className="border-slate-800">
            <CardTitle className="text-base text-slate-200">Registration Details</CardTitle>
          </CardHeader>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-emerald-300 text-xs leading-relaxed">
              <MailCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-semibold text-emerald-200">Confirmation Link Sent to Mailbox</p>
                <p>{successMsg}</p>
                <div className="pt-1">
                  <Link to="/login" className="inline-flex items-center gap-1 text-emerald-400 font-bold hover:underline">
                    Proceed to Sign In <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reg-fullname" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="reg-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Rajesh Sharma"
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-role" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Organizational Role
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <select
                  id="reg-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <option value="inventory_user">Warehouse Staff</option>
                  <option value="manager">Inventory Manager</option>
                  <option value="admin">System Admin</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="reg-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-confirm-password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="reg-confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full h-10 mt-2 font-semibold text-sm"
            >
              {loading ? 'Registering Account...' : 'Complete Sign Up'}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
            Already registered?{' '}
            <Link to="/login" className="text-blue-400 font-semibold hover:underline">
              Sign In Instead
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
