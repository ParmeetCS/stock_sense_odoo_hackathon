import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Mail, AlertCircle, CheckCircle2, ArrowLeft, ShieldCheck } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const { resetPasswordForEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: resetError } = await resetPasswordForEmail(email);

    if (resetError) {
      setError(resetError.message || 'Failed to send recovery email.');
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 text-slate-100">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-blue-400" /> StockSense WMS
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Password Recovery
          </h1>
          <p className="text-sm text-slate-400">
            Enter your account email to receive recovery instructions or OTP
          </p>
        </div>

        <Card className="bg-slate-900 border-slate-800 shadow-2xl">
          <CardHeader className="border-slate-800">
            <CardTitle className="text-base text-slate-200">Reset Password Link</CardTitle>
          </CardHeader>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="space-y-4 text-center py-2">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center gap-2 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Recovery instructions sent to {email}</span>
              </div>
              <p className="text-xs text-slate-400">
                Check your inbox for a password reset link or proceed to OTP verification.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  variant="primary"
                  onClick={() => navigate('/verify-otp', { state: { email } })}
                  className="w-full text-sm font-semibold"
                >
                  Enter Recovery OTP Code
                </Button>
                <Link to="/login">
                  <Button variant="outline" className="w-full text-sm">
                    Back to Login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Account Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full h-10 pl-9 pr-3 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full h-10 font-semibold text-sm"
              >
                {loading ? 'Sending Recovery Request...' : 'Send Recovery Email'}
              </Button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-400 flex items-center justify-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
            <Link to="/login" className="text-slate-300 hover:text-white font-medium">
              Return to Sign In
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
