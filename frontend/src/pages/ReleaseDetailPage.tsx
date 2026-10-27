import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getRelease,
  getReleaseChecklist,
  updateReleaseStatus,
  submitRelease,
  approveRelease,
  rejectRelease,
  updateChecklistResult,
} from '../api/client';
import { ReleaseRequest, ChecklistResult } from '../types';
import { ChecklistViewer } from '../components/ChecklistViewer';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  ArrowRightCircle,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  FileText,
  ShieldCheck,
  Send,
  Download,
  Building2,
  Calendar,
  User,
  Printer,
} from 'lucide-react';
import { format } from 'date-fns';

export const ReleaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [release, setRelease] = useState<ReleaseRequest | null>(null);
  const [checklist, setChecklist] = useState<ChecklistResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Deficiency letter modal
  const [showDeficiencyModal, setShowDeficiencyModal] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const relId = parseInt(id, 10);
      const [r, cl] = await Promise.all([
        getRelease(relId),
        getReleaseChecklist(relId),
      ]);
      setRelease(r);
      setChecklist(cl);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleUpdateChecklistItem = async (resultId: number, status: string, notes?: string) => {
    if (!release) return;
    await updateChecklistResult(release.id, resultId, { status, notes });
    await loadData();
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!release) return;
    try {
      await updateReleaseStatus(release.id, newStatus);
      setNotice(`Workflow status transitioned to ${newStatus}`);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Status transition failed');
    }
  };

  const handleSubmit = async () => {
    if (!release) return;
    try {
      await submitRelease(release.id);
      setNotice('Release request submitted for official bureau scrutiny.');
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Submission failed');
    }
  };

  const handleApprove = async () => {
    if (!release) return;
    try {
      await approveRelease(release.id);
      setNotice('Release request formally approved by Competent Authority!');
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Approval failed');
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!release) return;
    try {
      await rejectRelease(release.id, rejectReason);
      setShowRejectModal(false);
      setNotice('Release request rejected. Formal reason documented in audit trail.');
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Rejection failed');
    }
  };

  if (loading && !release) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!release) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        Release request record not found.
      </div>
    );
  }

  const workflowStages = [
    'DRAFT',
    'SUBMITTED',
    'UNDER_SCRUTINY',
    'AWAITING_AUTHORITY',
    'APPROVED',
  ];

  const currentStageIndex = workflowStages.indexOf(release.status);
  const deficientItems = checklist.filter((c) => c.status === 'DEFICIENT');

  return (
    <div className="space-y-6">
      {/* Back button & Action controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/releases')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Releases
        </button>

        <div className="flex items-center gap-2">
          {deficientItems.length > 0 && (
            <button
              onClick={() => setShowDeficiencyModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200"
            >
              <Printer className="w-3.5 h-3.5" /> Generate Deficiency Letter ({deficientItems.length})
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" /> Export Audit Pack
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-semibold flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-indigo-600 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Release Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md ring-2 ring-indigo-500/20 shrink-0">
              <ArrowRightCircle className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {release.request_id}
                </span>
                <StatusBadge status={release.status} />
                <span className="text-xs font-mono text-slate-400">
                  Checklist RulePack v{release.checklist_version}
                </span>
              </div>

              <h1 className="text-xl font-black text-slate-900 mt-1">
                Release Request for FDR #{release.deposit_display_id}
              </h1>

              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {release.institution_name} • Submitted by {release.submitted_by || 'Institution'}
              </p>
            </div>
          </div>

          <div className="text-right text-xs text-slate-500">
            <div>Submitted: <strong>{release.submitted_at ? format(new Date(release.submitted_at), 'dd MMM yyyy') : 'Draft'}</strong></div>
            {release.reviewer_notes && (
              <div className="mt-1 text-[11px] text-amber-700 max-w-xs">
                Observation: {release.reviewer_notes}
              </div>
            )}
          </div>
        </div>

        {/* Workflow Progress Stepper */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-3">
            Administrative Workflow Lifecycle State
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {workflowStages.map((stage, idx) => {
              const isPast = currentStageIndex >= idx;
              const isCurrent = release.status === stage;

              return (
                <div
                  key={stage}
                  className={`p-2.5 rounded-lg border text-center transition-all ${
                    isCurrent
                      ? 'bg-indigo-600 text-white font-bold border-indigo-600 shadow-sm'
                      : isPast
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold'
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-wider">Step {idx + 1}</div>
                  <div className="text-xs mt-0.5 capitalize">{stage.replace(/_/g, ' ')}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrutiny Action Gate Buttons */}
        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Authorized Governance Gate: <strong>AI cannot approve releases. Decisions require official credentials.</strong>
          </div>

          <div className="flex items-center gap-2">
            {release.status === 'DRAFT' && (
              <button
                onClick={handleSubmit}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
              >
                Submit for Scrutiny
              </button>
            )}

            {release.status === 'SUBMITTED' && (
              <button
                onClick={() => handleStatusChange('UNDER_SCRUTINY')}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
              >
                Begin Scrutiny Verification
              </button>
            )}

            {release.status === 'UNDER_SCRUTINY' && (
              <>
                <button
                  onClick={() => handleStatusChange('AWAITING_AUTHORITY')}
                  className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200"
                >
                  Forward to Approving Authority
                </button>
                <button
                  onClick={() => handleStatusChange('CORRECTION_REQUIRED')}
                  className="px-3.5 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200"
                >
                  Flag Correction Required
                </button>
              </>
            )}

            {release.status === 'AWAITING_AUTHORITY' && (
              <>
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 cursor-pointer"
                >
                  Reject Request
                </button>
                {user && (release.reviewer_id === user.id || release.submitted_by === user.username) ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                      <AlertOctagon className="w-3.5 h-3.5 text-amber-600" /> Maker-Checker Rule: Reviewer/Submitter cannot approve
                    </span>
                    <button
                      disabled
                      title="Maker-Checker: Segregation of duties prevents the reviewer from approving their own forward."
                      className="px-4 py-2 text-xs font-bold text-white bg-slate-300 rounded-lg shadow-xs cursor-not-allowed"
                    >
                      Approval Restricted
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleApprove}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm cursor-pointer"
                  >
                    Confirm Authorized Approval
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Policy-Aware Checklist (Core USP 7 & 8) */}
      <ChecklistViewer
        checklist={checklist}
        onUpdateItem={handleUpdateChecklistItem}
        canEvaluate={true}
      />

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Reject Release Request {release.request_id}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Enter formal rejection grounds as per AICTE handbook regulations.
            </p>

            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Rejection *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Non-submission of departmental no-dues clearance certificate..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auto-Generated Deficiency Letter Modal (Suggested Addition) */}
      {showDeficiencyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">
                All India Council for Technical Education
              </h3>
              <p className="text-xs font-semibold text-slate-600">
                Regulation Bureau • Nelson Mandela Marg, Vasant Kunj, New Delhi-110070
              </p>
              <div className="mt-2 text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 py-1 rounded">
                Official Regulatory Deficiency Notice
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <div className="flex justify-between text-slate-500 pb-2 border-b border-slate-100">
                <span>Ref: AICTE/REG/FDR-DEF/{release.request_id}</span>
                <span>Date: {format(new Date(), 'dd MMMM yyyy')}</span>
              </div>

              <p>
                To,<br />
                The Principal / Chairman,<br />
                <strong>{release.institution_name}</strong>
              </p>

              <p className="font-bold text-slate-900">
                Subject: Notice of Deficiency in Security Deposit Release Application (Ref: FDR #{release.deposit_display_id})
              </p>

              <p>
                Sir/Madam,<br />
                With reference to your application for release of security deposit receipt, scrutiny under AICTE Approval Process Handbook (Clause 6.46) has identified the following deficiencies that must be cured before your file can proceed to the Competent Authority:
              </p>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                {deficientItems.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <span className="font-bold text-rose-600">{idx + 1}.</span>
                    <div>
                      <span className="font-semibold text-slate-900">{item.checklist_item?.requirement}</span>
                      {item.notes && <p className="text-slate-500 text-[11px] mt-0.5">Remark: {item.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>

              <p>
                You are requested to upload rectified documentation through the AICTE FDR GUARDIAN portal within fifteen (15) working days from the date of this notice.
              </p>

              <div className="pt-6 text-right">
                <p className="font-bold text-slate-900">Scrutiny Officer</p>
                <p className="text-slate-500">Regulation Bureau, AICTE</p>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeficiencyModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Print Formal Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
