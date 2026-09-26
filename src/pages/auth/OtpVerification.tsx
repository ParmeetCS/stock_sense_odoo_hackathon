import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { KeyRound, Mail, Phone, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export const OtpVerification: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyOtp } = useAuth();

  const state = location.state as { email?: string; type?: 'recovery' | 'signup' | 'email' | 'sms' } | undefined;

  const [identifier, setIdentifier] = useState(state?.email || '');
  const [type] = useState<'recovery' | 'signup' | 'email' | 'sms'>(state?.type || 'recovery');
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: verifyError } = await verifyOtp(identifier, token, type);

    if (verifyError) {
      setError(verifyError.message || 'Invalid or expired OTP verification code.');
      setLoading(false);
    } else {
      if (type === 'recovery' || type === 'email' || type === 'sms') {
        navigate('/reset-password');
      } else {
        navigate('/login');
      }
    }
  };

  const isPhone = type === 'sms' || identifier.startsWith('+');

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 text-slate-100">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-blue-400" /> StockSense WMS
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            OTP Verification
          </h1>
          <p className="text-sm text-slate-400">
            Enter the 6-digit OTP security token sent to your {isPhone ? 'mobile number' : 'email address'}
          </p>
        </div>

        <Card className="bg-slate-900 border-slate-800 shadow-2xl">
          <CardHeader className="border-slate-800">
            <CardTitle className="text-base text-slate-200 flex items-center justify-between">
              <span>Verify Security Token</span>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase font-mono">
                {type}
              </span>
            </CardTitle>
          </CardHeader>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="otp-identifier" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {isPhone ? 'Phone Number' : 'Registered Email'}
              </label>
              <div className="relative">
                {isPhone ? (
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                ) : (
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                )}
                <input
                  id="otp-identifier"
                  type={isPhone ? 'tel' : 'email'}
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={isPhone ? '+15550001234' : 'name@company.com'}
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="otp-token" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                6-Digit OTP Token Code
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="otp-token"
                  type="text"
                  required
                  maxLength={6}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="123456"
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono tracking-widest text-center text-base focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full h-10 font-semibold text-sm"
            >
              {loading ? 'Verifying Code...' : 'Verify OTP Token'}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
            Didn't receive token?{' '}
            <Link to="/forgot-password" className="text-blue-400 font-semibold hover:underline">
              Resend Code via Email / SMS
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
