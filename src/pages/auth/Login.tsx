import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Lock, Mail, Phone, AlertCircle, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, sendOtp } = useAuth();

  const [loginMethod, setLoginMethod] = useState<'password' | 'sms'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError.message || 'Invalid login credentials. Please try again.');
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  const handleSmsOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!phone || !phone.startsWith('+')) {
      setError('Please enter your mobile phone number in E.164 format with country code (e.g. +919876543210).');
      return;
    }

    setLoading(true);

    const { error: otpError } = await sendOtp(phone, 'phone');

    if (otpError) {
      setError(otpError.message || 'Failed to send SMS OTP via Textlocal. Please check phone number.');
      setLoading(false);
    } else {
      // Navigate to OTP verification page with SMS type
      navigate('/verify-otp', { state: { email: phone, type: 'sms' } });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 text-slate-100">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-blue-400" /> StockSense WMS
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Enterprise Login
          </h1>
          <p className="text-sm text-slate-400">
            Sign in via Password or Textlocal SMS OTP
          </p>
        </div>

        {/* Login Card */}
        <Card className="bg-slate-900 border-slate-800 shadow-2xl">
          <CardHeader className="border-slate-800 pb-3">
            <CardTitle className="text-base text-slate-200 flex items-center justify-between">
              <span>Account Sign In</span>
            </CardTitle>
          </CardHeader>

          {/* Login Method Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-lg mb-4 border border-slate-800">
            <button
              type="button"
              onClick={() => { setLoginMethod('password'); setError(null); }}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all ${
                loginMethod === 'password'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" /> Password
            </button>
            <button
              type="button"
              onClick={() => { setLoginMethod('sms'); setError(null); }}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all ${
                loginMethod === 'sms'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Phone className="w-3.5 h-3.5" /> Textlocal SMS OTP
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loginMethod === 'password' ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id="login-email"
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
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors focus:outline-none focus-visible:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
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
                {loading ? 'Authenticating...' : 'Sign In to StockSense'}
                {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSmsOtpSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-phone" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Mobile Phone Number (Textlocal SMS)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id="login-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+919876543210 or +15550001234"
                    className="w-full h-10 pl-9 pr-3 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 font-mono text-sm"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Must include country code (e.g., +91 for India, +1 for US). Textlocal will send a 6-digit OTP SMS.
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full h-10 font-semibold text-sm flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                {loading ? 'Sending Textlocal SMS...' : 'Send Textlocal SMS OTP'}
              </Button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-400 font-semibold hover:underline">
              Create Enterprise Account
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
