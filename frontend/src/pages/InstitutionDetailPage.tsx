import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInstitution, getDeposits } from '../api/client';
import { Institution, Deposit } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Building2,
  MapPin,
  Mail,
  Phone,
  Landmark,
  Plus,
  ArrowLeft,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import { format } from 'date-fns';

export const InstitutionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const inst = await getInstitution(parseInt(id, 10));
        setInstitution(inst);
        const depList = await getDeposits({ institution_id: parseInt(id, 10) });
        setDeposits(depList);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const totalAmount = deposits.reduce((acc, curr) => acc + curr.amount, 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!institution) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        Institution record not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button & Action */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/institutions')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Institutions
        </button>

        <button
          onClick={() => navigate(`/deposits/create?institution_id=${institution.id}`)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> Register Deposit for this Institution
        </button>
      </div>

      {/* Institution Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {institution.institution_id}
                </span>
                <StatusBadge status={institution.status} />
              </div>
              <h1 className="text-xl font-black text-slate-900 mt-1">
                {institution.name}
              </h1>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {institution.address || 'Address not registered'} ({institution.region} Region)
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1 text-xs text-slate-500">
            {institution.contact_email && (
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {institution.contact_email}
              </span>
            )}
            {institution.contact_phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {institution.contact_phone}
              </span>
            )}
          </div>
        </div>

        {/* Institution KPI summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Security Deposits Value
            </span>
            <span className="text-xl font-black text-slate-900 mt-1 block">
              {formatCurrency(totalAmount)}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Instruments
            </span>
            <span className="text-xl font-black text-emerald-600 mt-1 block">
              {deposits.filter((d) => d.lifecycle_status === 'ACTIVE' || d.lifecycle_status === 'EXPIRING').length}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Matured / Past Due
            </span>
            <span className="text-xl font-black text-rose-600 mt-1 block">
              {deposits.filter((d) => d.lifecycle_status === 'MATURED').length}
            </span>
          </div>
        </div>
      </div>

      {/* Associated FDR Deposits List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-indigo-600" />
            Security Deposits & FDR Instruments Portfolio
          </h2>
          <span className="text-xs text-slate-400 font-semibold">
            {deposits.length} Registered FDR{deposits.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Deposit ID</th>
                <th className="py-3 px-4">Issuing Bank & Branch</th>
                <th className="py-3 px-4">Receipt Number</th>
                <th className="py-3 px-4">Deposit Amount</th>
                <th className="py-3 px-4">Maturity Date</th>
                <th className="py-3 px-4 text-center">Lifecycle Status</th>
                <th className="py-3 px-4 text-center">Trust Level</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deposits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No FDR records registered for this institution yet.
                  </td>
                </tr>
              ) : (
                deposits.map((dep) => (
                  <tr
                    key={dep.id}
                    onClick={() => navigate(`/deposits/${dep.id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      {dep.deposit_id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{dep.bank_name}</div>
                      <div className="text-[11px] text-slate-400">{dep.branch_name || 'Main Branch'}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {dep.receipt_no || 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {formatCurrency(dep.amount)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{dep.maturity_date ? format(new Date(dep.maturity_date), 'dd MMM yyyy') : 'N/A'}</div>
                      <div className="text-[10px] text-slate-400">
                        {dep.days_to_maturity > 0 ? `${dep.days_to_maturity} days left` : 'Expired'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={dep.lifecycle_status} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={dep.trust_level} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-indigo-600 font-semibold">Inspect</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
