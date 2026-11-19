import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gavel, Shield, Truck, ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/auctions');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setError(null);
    setLoading(true);
    try {
      await login(demoEmail, 'password123');
      navigate('/auctions');
    } catch (err: any) {
      setError('Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-indigo-600 shadow-xl shadow-emerald-950/50 mb-4">
          <div className="p-2 rounded-xl bg-slate-950">
            <Gavel className="w-8 h-8 text-emerald-400" />
          </div>
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">British Auction in RFQ</h2>
        <p className="mt-1 text-xs text-slate-400">Competitive Reverse Downward Bidding & Anti-Sniping System</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Quick Demo Switcher Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 mb-5 backdrop-blur-sm">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
            <span>⚡ Instant Demo Access</span>
            <span className="text-[10px] text-emerald-400 font-mono">1-Click Sign In</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleQuickLogin('buyer@demo.com')}
              className="p-3 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-700/40 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                <Shield className="w-3.5 h-3.5" /> Buyer Account
              </div>
              <div className="text-[11px] text-slate-400 mt-1 truncate">Acme Procurement</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('supplier1@demo.com')}
              className="p-3 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-700/40 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                <Truck className="w-3.5 h-3.5" /> Supplier 1
              </div>
              <div className="text-[11px] text-slate-400 mt-1 truncate">FastTrack Cargo</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('supplier2@demo.com')}
              className="p-3 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-700/40 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                <Truck className="w-3.5 h-3.5" /> Supplier 2
              </div>
              <div className="text-[11px] text-slate-400 mt-1 truncate">Apex Freight Lines</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('supplier3@demo.com')}
              className="p-3 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-700/40 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                <Truck className="w-3.5 h-3.5" /> Supplier 3
              </div>
              <div className="text-[11px] text-slate-400 mt-1 truncate">BlueDart Logistics</div>
            </button>
          </div>
        </div>

        {/* Regular Login Form */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-white text-sm outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-white text-sm outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-950 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
              Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
