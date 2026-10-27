import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getDeposits } from '../api/client';
import { Deposit } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  Landmark,
  Plus,
  Search,
  Filter,
  Calendar,
  ShieldCheck,
  ArrowRight,
  AlertOctagon,
} from 'lucide-react';
import { format } from 'date-fns';

export const DepositsPage: React.FC = () => {
  const { user } = useAuth();
  const isInstitution = user?.role === 'INSTITUTION';

  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [bank, setBank] = useState(searchParams.get('bank') || '');

  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getDeposits({
        search: search || undefined,
        status: status || undefined,
        bank: bank || undefined,
      });
      setDeposits(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, status, bank]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Landmark className="w-6 h-6 text-indigo-600" />
            {isInstitution ? "Your Pledged Security Deposits" : "Fixed Deposit Receipts (FDR) Unified Registry"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isInstitution
              ? "Official institutional register of all security deposits pledged to AICTE with lifecycle verification status."
              : "Institution-wise and instrument-wise administrative ledger tracking amounts, maturity schedules, and verification provenance."}
          </p>
        </div>

        <button
          onClick={() => navigate('/deposits/create')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Register New Deposit
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Deposit ID or FDR receipt number..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 bg-white text-slate-700"
        >
          <option value="">All Lifecycle Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRING">Expiring Soon (≤ 90d)</option>
          <option value="MATURED">Matured / Past Due</option>
          <option value="RENEWED">Renewed</option>
          <option value="REPLACED">Replaced</option>
          <option value="RELEASED">Released / Refunded</option>
        </select>

        <select
          value={bank}
          onChange={(e) => setBank(e.target.value)}
          className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 bg-white text-slate-700"
        >
          <option value="">All Banks</option>
          <option value="State Bank of India">State Bank of India</option>
          <option value="Punjab National Bank">Punjab National Bank</option>
          <option value="Bank of Baroda">Bank of Baroda</option>
          <option value="Canara Bank">Canara Bank</option>
          <option value="Union Bank of India">Union Bank of India</option>
          <option value="Indian Bank">Indian Bank</option>
        </select>
      </div>

      {/* Deposits Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Deposit ID</th>
                {!isInstitution && <th className="py-3.5 px-4">Institution Name</th>}
                <th className="py-3.5 px-4">Issuing Bank</th>
                <th className="py-3.5 px-4">Receipt Number</th>
                <th className="py-3.5 px-4">Deposit Amount</th>
                <th className="py-3.5 px-4">Maturity Date</th>
                <th className="py-3.5 px-4 text-center">Lifecycle Status</th>
                <th className="py-3.5 px-4 text-center">Trust Level</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={isInstitution ? 8 : 9} className="py-8 text-center text-slate-400">
                    Loading FDR records...
                  </td>
                </tr>
              ) : deposits.length === 0 ? (
                <tr>
                  <td colSpan={isInstitution ? 8 : 9} className="py-8 text-center text-slate-400">
                    No security deposit records match the specified search filters.
                  </td>
                </tr>
              ) : (
                deposits.map((dep) => {
                  const days = dep.days_to_maturity;
                  return (
                    <tr
                      key={dep.id}
                      onClick={() => navigate(`/deposits/${dep.id}`)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {dep.deposit_id}
                      </td>
                      {!isInstitution && (
                        <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs truncate">
                          {dep.institution_name}
                        </td>
                      )}
                      <td className="py-3 px-4 text-slate-600">
                        <div>{dep.bank_name}</div>
                        <div className="text-[10px] text-slate-400">{dep.branch_name || 'Main Branch'}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {dep.receipt_no || 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {formatCurrency(dep.amount)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{dep.maturity_date ? format(new Date(dep.maturity_date), 'dd MMM yyyy') : 'N/A'}</div>
                        <div className="text-[10px] font-semibold">
                          {days > 0 ? (
                            <span className={days <= 30 ? 'text-amber-600 font-bold' : 'text-slate-400'}>
                              {days} days remaining
                            </span>
                          ) : (
                            <span className="text-rose-600 font-bold">Matured</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={dep.lifecycle_status} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={dep.trust_level} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-indigo-600 font-semibold inline-flex items-center gap-1">
                          Inspect <ArrowRight className="w-3 h-3" />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
