import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createDeposit, getInstitutions } from '../api/client';
import { Institution } from '../types';
import { useAuth } from '../context/AuthContext';
import { Landmark, ArrowLeft, ShieldAlert } from 'lucide-react';

export const DepositCreatePage: React.FC = () => {
  const { user } = useAuth();
  const isInstitution = user?.role === 'INSTITUTION';

  const [searchParams] = useSearchParams();
  const preselectedInstId = searchParams.get('institution_id');

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    institution_id: preselectedInstId ? parseInt(preselectedInstId, 10) : 1,
    amount: 1000000,
    bank_name: 'State Bank of India',
    branch_name: '',
    receipt_no: '',
    account_holder: '',
    issue_date: new Date().toISOString().split('T')[0],
    maturity_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  useEffect(() => {
    const load = async () => {
      try {
        const list = await getInstitutions();
        setInstitutions(list);
        if (list.length > 0 && !preselectedInstId) {
          setFormData((prev) => ({ ...prev, institution_id: list[0].id }));
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [preselectedInstId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await createDeposit(formData);
      navigate(`/deposits/${created.id}`);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to register FDR deposit');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/deposits')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Registry
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
        <div className="flex items-center gap-3 pb-6 border-b border-slate-100 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900">
              Register New Security Deposit / FDR
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter institution details and financial terms as per the physical Fixed Deposit Receipt.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Technical Institution *
            </label>
            {isInstitution ? (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-900 block">
                  {institutions[0]?.name || user?.full_name}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Institution ID: {institutions[0]?.institution_id || 'Your Institution'} ({institutions[0]?.region || 'Registered'} Region)
                </span>
              </div>
            ) : (
              <select
                required
                value={formData.institution_id}
                onChange={(e) => setFormData({ ...formData, institution_id: parseInt(e.target.value, 10) })}
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-600"
              >
                {institutions.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.institution_id} — {i.name} ({i.region} Region)
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Deposit Amount (₹ INR) *
              </label>
              <input
                type="number"
                required
                min={1000}
                step={1000}
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 text-slate-900 font-mono font-bold focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                FDR Receipt / Reference Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. SBI-FDR-98124"
                value={formData.receipt_no}
                onChange={(e) => setFormData({ ...formData, receipt_no: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 text-slate-900 font-mono focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Issuing Scheduled Commercial Bank *
              </label>
              <select
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-600"
              >
                <option value="State Bank of India">State Bank of India</option>
                <option value="Punjab National Bank">Punjab National Bank</option>
                <option value="Bank of Baroda">Bank of Baroda</option>
                <option value="Canara Bank">Canara Bank</option>
                <option value="Union Bank of India">Union Bank of India</option>
                <option value="Indian Bank">Indian Bank</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Bank Branch Name
              </label>
              <input
                type="text"
                placeholder="e.g. Connaught Place Branch"
                value={formData.branch_name}
                onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 text-slate-900 focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Account / Joint Holder Details
            </label>
            <input
              type="text"
              placeholder="e.g. In the name of Regional Officer, AICTE & Trust Chairman"
              value={formData.account_holder}
              onChange={(e) => setFormData({ ...formData, account_holder: e.target.value })}
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 text-slate-900 focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Issue Date *
              </label>
              <input
                type="date"
                required
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 text-slate-900 focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Maturity Date *
              </label>
              <input
                type="date"
                required
                value={formData.maturity_date}
                onChange={(e) => setFormData({ ...formData, maturity_date: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 text-slate-900 focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/deposits')}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm disabled:opacity-60"
            >
              {submitting ? 'Registering...' : 'Register FDR Instrument'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
