import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Mail, Phone, AlertCircle, CheckCircle2, ArrowLeft, ShieldCheck, KeyRound } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const { resetPasswordForEmail, sendOtp } = useAuth();
  
  const [channel, setChannel] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [mode, setMode] = useState<'otp' | 'link'>('otp');

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (channel === 'phone') {
      if (!phone) {
        setError('Please enter a valid phone number with country code (e.g. +15550001234)');
        setLoading(false);
        return;
      }
      const { error: otpError } = await sendOtp(phone, 'phone');
      if (otpError) {
        setError(otpError.message || 'Failed to send SMS OTP.');
        setLoading(false);
      } else {
        setSuccess(true);
        setLoading(false);
      }
    } else {
      if (!email) {
        setError('Please enter your account email.');
        setLoading(false);
        return;
      }
      if (mode === 'otp') {
        const { error: otpError } = await sendOtp(email, 'email');
        if (otpError) {
          setError(otpError.message || 'Failed to send Email OTP.');
          setLoading(false);
        } else {
          setSuccess(true);
          setLoading(false);
        }
      } else {
        const { error: resetError } = await resetPasswordForEmail(email);
        if (resetError) {
          setError(resetError.message || 'Failed to send recovery email link.');
          setLoading(false);
        } else {
          setSuccess(true);
          setLoading(false);
        }
      }
    }
  };

  const recipient = channel === 'phone' ? phone : email;
  const otpType = channel === 'phone' ? 'sms' : (mode === 'otp' ? 'email' : 'recovery');

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 text-slate-100">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-blue-400" /> StockSense WMS
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Security Verification
          </h1>
          <p className="text-sm text-slate-400">
            Request an OTP code via Email or SMS to verify your account
          </p>
        </div>

        <Card className="bg-slate-900 border-slate-800 shadow-2xl">
          <CardHeader className="border-slate-800 pb-3">
            <CardTitle className="text-base text-slate-200 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-400" />
              <span>Choose Verification Method</span>
            </CardTitle>
          </CardHeader>

          {/* Channel selector tab */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-lg mb-4 border border-slate-800">
            <button
              type="button"
              onClick={() => { setChannel('email'); setSuccess(false); setError(null); }}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all ${
                channel === 'email'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5" /> Email OTP
            </button>
            <button
              type="button"
              onClick={() => { setChannel('phone'); setSuccess(false); setError(null); }}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all ${
                channel === 'phone'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Phone className="w-3.5 h-3.5" /> SMS OTP
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="space-y-4 text-center py-2">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center gap-2 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Verification OTP sent to {recipient}</span>
              </div>
              <p className="text-xs text-slate-400">
                {channel === 'phone'
                  ? 'Check your mobile device for the 6-digit SMS code.'
                  : 'Check your inbox for the 6-digit Email OTP token.'}
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  variant="primary"
                  onClick={() => navigate('/verify-otp', { state: { email: recipient, type: otpType } })}
                  className="w-full text-sm font-semibold"
                >
                  Enter OTP Verification Code
                </Button>
                <button
                  type="button"
                  onClick={() => setSuccess(false)}
                  className="text-xs text-slate-400 hover:text-slate-200 underline mt-1"
                >
                  Send another code
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {channel === 'email' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Account Email Address
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

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span>Delivery Mode:</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="mode"
                          checked={mode === 'otp'}
                          onChange={() => setMode('otp')}
                          className="accent-blue-500"
                        />
                        <span>6-Digit OTP</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="mode"
                          checked={mode === 'link'}
                          onChange={() => setMode('link')}
                          className="accent-blue-500"
                        />
                        <span>Reset Link</span>
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Mobile Phone Number (E.164 Format)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+15550001234 or +919876543210"
                      className="w-full h-10 pl-9 pr-3 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Include country code (e.g., +1 for US, +91 for India).
                  </p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full h-10 font-semibold text-sm"
              >
                {loading
                  ? 'Requesting OTP...'
                  : channel === 'phone'
                  ? 'Send SMS OTP Code'
                  : mode === 'otp'
                  ? 'Send Email OTP Code'
                  : 'Send Password Reset Link'}
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
