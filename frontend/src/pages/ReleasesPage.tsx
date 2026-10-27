import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReleases, getDeposits, createRelease } from '../api/client';
import { ReleaseRequest, Deposit } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  ArrowRightCircle,
  Plus,
  Search,
  Building2,
  Calendar,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { format } from 'date-fns';

export const ReleasesPage: React.FC = () => {
  const [releases, setReleases] = useState<ReleaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [selectedDepositId, setSelectedDepositId] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getReleases();
      setReleases(data);
      const depList = await getDeposits({ status: 'ACTIVE' }).catch(() => []);
      setDeposits(depList);
      if (depList.length > 0) setSelectedDepositId(depList[0].id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const rel = await createRelease(selectedDepositId);
      setShowCreateModal(false);
      navigate(`/releases/${rel.id}`);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to create release request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ArrowRightCircle className="w-6 h-6 text-indigo-600" />
            Security Deposit Release & Refund Workflow
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Human-controlled administrative clearance mechanism governed by AICTE Approval Process Handbook (Clause 6.46).
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Initiate Release Request
        </button>
      </div>

      {/* Release Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Request ID</th>
                <th className="py-3.5 px-4">Institution Name</th>
                <th className="py-3.5 px-4">Target Deposit</th>
                <th className="py-3.5 px-4">Submission Date</th>
                <th className="py-3.5 px-4">Checklist Version</th>
                <th className="py-3.5 px-4 text-center">Workflow Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading release requests...
                  </td>
                </tr>
              ) : releases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No active release or refund requests registered.
                  </td>
                </tr>
              ) : (
                releases.map((rel) => (
                  <tr
                    key={rel.id}
                    onClick={() => navigate(`/releases/${rel.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      {rel.request_id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs truncate">
                      {rel.institution_name || 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                      {rel.deposit_display_id}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {rel.submitted_at ? format(new Date(rel.submitted_at), 'dd MMM yyyy') : 'Draft Stage'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      v{rel.checklist_version}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={rel.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-indigo-600 font-semibold inline-flex items-center gap-1">
                        Scrutiny Workspace <ArrowRight className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal to initiate release request */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Initiate FDR Release / Refund Request
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Select an active deposit to initiate the policy-aware scrutiny workflow.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Deposit Instrument *
                </label>
                <select
                  value={selectedDepositId}
                  onChange={(e) => setSelectedDepositId(parseInt(e.target.value, 10))}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                >
                  {deposits.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.deposit_id} — {d.institution_name} (₹{d.amount.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-800">
                A regulatory checklist compliant with AICTE APH 2024-2027 will be automatically initialized for this request.
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  {submitting ? 'Creating...' : 'Initialize Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
