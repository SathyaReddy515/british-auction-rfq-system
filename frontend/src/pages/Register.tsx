import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gavel, Shield, Truck, ArrowRight, Lock, Mail, User as UserIcon, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'BUYER' | 'SUPPLIER'>('SUPPLIER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({ full_name: fullName, email, password, role });
      navigate('/auctions');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-indigo-600 shadow-xl shadow-emerald-950/50 mb-4">
          <div className="p-2 rounded-xl bg-slate-950">
            <Gavel className="w-8 h-8 text-emerald-400" />
          </div>
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Create an Account</h2>
        <p className="mt-1 text-xs text-slate-400">Join the British Auction Procurement Network</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-2">Select Your Role</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('BUYER')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    role === 'BUYER'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                    <Shield className="w-4 h-4" /> Buyer
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Create RFQs & award auctions</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('SUPPLIER')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    role === 'SUPPLIER'
                      ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <Truck className="w-4 h-4" /> Supplier
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Submit quotes & place bids</div>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Company / Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Acme Corp or Global Logistics Ltd"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-white text-sm outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Work Email Address</label>
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
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-white text-sm outline-none transition-all placeholder:text-slate-600"
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
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-white text-sm outline-none transition-all placeholder:text-slate-600"
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
                  Complete Registration <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
