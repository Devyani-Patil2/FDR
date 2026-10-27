import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, User as UserIcon, AlertCircle, ArrowRight, UserCheck, ChevronDown } from 'lucide-react';

interface RoleOption {
  label: string;
  username: string;
  role: string;
}

export const LoginPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<string>('reviewer');
  const [username, setUsername] = useState('reviewer');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const roleOptions: RoleOption[] = [
    { label: 'Scrutiny Officer', username: 'reviewer', role: 'REVIEWER' },
    { label: 'Bank Verification Officer', username: 'verifier', role: 'VERIFIER' },
    { label: 'Approving Authority', username: 'approver', role: 'APPROVER' },
    { label: 'Technical Institution', username: 'institution1', role: 'INSTITUTION' },
    { label: 'System Administrator', username: 'admin', role: 'ADMIN' },
    { label: 'Compliance Auditor', username: 'auditor', role: 'AUDITOR' },
  ];

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedRole(val);
    if (val !== 'custom') {
      const found = roleOptions.find((r) => r.username === val);
      if (found) {
        setUsername(found.username);
        setPassword('password123');
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Authentication failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat flex flex-col justify-center items-center p-4 antialiased relative"
      style={{ backgroundImage: `url('/login-bg.png')` }}
    >
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] z-0" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md my-auto">
        {/* Branding Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-600/90 backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center text-white shadow-2xl ring-4 ring-indigo-400/30 mb-3 transition-transform hover:scale-105">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight drop-shadow-md">
            AICTE FDR GUARDIAN
          </h1>
          <p className="text-xs text-indigo-200 font-semibold tracking-wider uppercase mt-1 drop-shadow-sm">
            Security Deposit & FDR Lifecycle Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/30 p-8 transition-all">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Portal Login</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sign in to access your workspace.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* User Role Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Select Role
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-indigo-600 absolute left-3.5 top-3 pointer-events-none" />
                <select
                  value={selectedRole}
                  onChange={handleRoleChange}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all appearance-none cursor-pointer shadow-xs"
                >
                  {roleOptions.map((opt) => (
                    <option key={opt.username} value={opt.username} className="py-1">
                      {opt.label}
                    </option>
                  ))}
                  <option value="custom">Other / Custom Username</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (selectedRole !== 'custom') {
                      const match = roleOptions.find((r) => r.username === e.target.value);
                      setSelectedRole(match ? match.username : 'custom');
                    }
                  }}
                  placeholder="Enter username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-600/30 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-60 cursor-pointer active:scale-[0.99]"
            >
              {submitting ? 'Authenticating...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Clean Footer */}
        <div className="mt-6 text-center text-slate-300/90 text-xs drop-shadow-sm font-medium">
          © All India Council for Technical Education. All rights reserved.
        </div>
      </div>
    </div>
  );
};
