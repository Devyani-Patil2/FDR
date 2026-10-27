import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getDashboardStats,
  getPriorityQueue,
  getMaturityCalendar,
  getRecentActivity,
  generateMaturityAlerts,
  getDeposits,
} from '../api/client';
import { DashboardStats, PriorityQueueItem, MaturityCalendarItem, AuditEvent, Deposit } from '../types';
import { StatsCard } from '../components/StatsCard';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  Landmark,
  ShieldCheck,
  Clock,
  AlertTriangle,
  ArrowRightCircle,
  Building2,
  Calendar,
  Play,
  ArrowRight,
  RefreshCw,
  AlertOctagon,
  CheckCircle2,
  FileText,
  Plus,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { format } from 'date-fns';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const isInstitution = user?.role === 'INSTITUTION';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [priorityQueue, setPriorityQueue] = useState<PriorityQueueItem[]>([]);
  const [calendarData, setCalendarData] = useState<MaturityCalendarItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<AuditEvent[]>([]);
  const [institutionDeposits, setInstitutionDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertNotice, setAlertNotice] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const promises: [
        Promise<DashboardStats>,
        Promise<PriorityQueueItem[]>,
        Promise<MaturityCalendarItem[]>,
        Promise<AuditEvent[]>,
        Promise<Deposit[]>
      ] = [
        getDashboardStats(),
        getPriorityQueue(),
        getMaturityCalendar(),
        getRecentActivity(),
        isInstitution ? getDeposits() : Promise.resolve([]),
      ];

      const [s, pq, cal, act, deps] = await Promise.all(promises);
      setStats(s);
      setPriorityQueue(pq);
      setCalendarData(cal);
      setRecentActivity(act);
      if (deps) setInstitutionDeposits(deps);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleRunAlerts = async () => {
    try {
      const res = await generateMaturityAlerts();
      setAlertNotice(`Automated Scheduler Executed: ${res.message}`);
      await loadData();
      setTimeout(() => setAlertNotice(null), 5000);
    } catch {
      setAlertNotice('Failed to execute automated alert scheduler.');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Priority queue filtering:
  // For Officers: Display only top 3 HIGH priority items so dashboard stays compact
  // For Institutions: Display max 2 urgent items
  const displayedPriorityQueue = isInstitution
    ? priorityQueue.slice(0, 2)
    : priorityQueue.filter((item) => item.priority === 'HIGH').slice(0, 3);

  const totalHighPriorityCount = priorityQueue.filter((item) => item.priority === 'HIGH').length;
  const hasMoreItems = isInstitution
    ? priorityQueue.length > 2
    : priorityQueue.length > displayedPriorityQueue.length;

  // Institution Spotlight: Pick the 1 most urgent/expiring deposit to prevent stretching
  const focusDeposit = institutionDeposits.length > 0
    ? [...institutionDeposits].sort((a, b) => (a.days_to_maturity ?? 9999) - (b.days_to_maturity ?? 9999))[0]
    : null;

  const otherDepositsCount = institutionDeposits.length > 1 ? institutionDeposits.length - 1 : 0;
  const otherDepositsAmount = institutionDeposits
    .filter((d) => d.id !== focusDeposit?.id)
    .reduce((sum, d) => sum + (d.amount || 0), 0);

  if (loading && !stats) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            {isInstitution ? (
              <>
                <Building2 className="w-6 h-6 text-indigo-600" />
                {user?.full_name || 'Technical Institution Workspace'}
              </>
            ) : (
              <>
                <Landmark className="w-6 h-6 text-indigo-600" />
                Bureau Executive Workspace
              </>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isInstitution
              ? 'Institutional compliance dashboard for security deposits & Fixed Deposit Receipts (FDRs) pledged to AICTE.'
              : 'Real-time portfolio oversight of technical institution security deposits and Fixed Deposit Receipts (FDRs).'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isInstitution ? (
            <button
              onClick={() => navigate('/deposits/create')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Register New Deposit
            </button>
          ) : (
            <button
              onClick={handleRunAlerts}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Run Maturity Alert Scheduler
            </button>
          )}
          <button
            onClick={loadData}
            title="Refresh Data"
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {alertNotice && (
        <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-semibold flex items-center justify-between">
          <span>{alertNotice}</span>
          <button onClick={() => setAlertNotice(null)} className="text-indigo-600 hover:underline">Dismiss</button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatsCard
          title={isInstitution ? 'Total Pledged' : 'Total FDRs'}
          value={stats?.total_deposits || 0}
          subtitle={isInstitution ? 'Registered FDRs' : 'Registered'}
          icon={Landmark}
          color="indigo"
          onClick={() => navigate('/deposits')}
        />
        <StatsCard
          title={isInstitution ? 'Active Standing' : 'Active'}
          value={stats?.active_deposits || 0}
          subtitle={isInstitution ? 'Compliant' : 'Valid'}
          icon={ShieldCheck}
          color="emerald"
          onClick={() => navigate('/deposits?status=ACTIVE')}
        />
        <StatsCard
          title={isInstitution ? 'Expiring Soon' : 'Due in 30 Days'}
          value={stats?.expiring_soon || 0}
          subtitle={isInstitution ? 'Renewal Due' : 'Requires Task'}
          icon={Clock}
          color="amber"
          onClick={() => navigate('/deposits?status=EXPIRING')}
        />
        <StatsCard
          title="Matured"
          value={stats?.matured || 0}
          subtitle={isInstitution ? 'Action Needed' : 'Renewal Needed'}
          icon={AlertTriangle}
          color="rose"
          onClick={() => navigate('/deposits?status=MATURED')}
        />
        <StatsCard
          title="Pending Verif."
          value={stats?.pending_verification || 0}
          subtitle="Bank Clearance"
          icon={AlertOctagon}
          color="blue"
          onClick={() => navigate('/deposits')}
        />
        <StatsCard
          title="Release Requests"
          value={stats?.pending_releases || 0}
          subtitle={isInstitution ? 'In Progress' : 'In Scrutiny'}
          icon={ArrowRightCircle}
          color="slate"
          onClick={() => navigate('/releases')}
        />
      </div>

      {/* Main Two-Column Layout (Matching Heights, Compact) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Focused High-Priority Queue / Action Center */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between min-h-[380px]">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <AlertOctagon className="w-5 h-5 text-indigo-600" />
                  {isInstitution ? 'Urgent Institutional Actions' : 'High-Priority Triage Queue'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isInstitution
                    ? 'Immediate compliance requirements and resolution items for your FDRs.'
                    : 'Critical compliance cases, OCR mismatches, and overdue actions requiring immediate officer intervention.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
                  {displayedPriorityQueue.length} Critical Case{displayedPriorityQueue.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            <div>
              {displayedPriorityQueue.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 ring-8 ring-emerald-50/50">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-sm text-slate-800">All Instruments in Good Standing</span>
                  <span className="text-slate-400 text-xs mt-1 max-w-xs">
                    {isInstitution
                      ? 'No pending compliance mismatches or urgent renewal requirements for your institution.'
                      : 'No critical high-priority items pending triage. All deadlines and verifications compliant.'}
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedPriorityQueue.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/30 hover:bg-rose-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                            {item.deposit_id}
                          </span>
                          <span className="text-[10px] font-black tracking-wider px-2 py-0.5 rounded bg-rose-100 text-rose-700">
                            HIGH PRIORITY
                          </span>
                          {!isInstitution && (
                            <span className="text-xs font-semibold text-slate-800 truncate max-w-[180px]">
                              {item.institution_name}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-800 font-semibold mt-1">
                          {item.reason}
                        </p>

                        <p className="text-[11px] text-slate-500">
                          Recommended Action: <strong className="text-slate-700">{item.action}</strong>
                        </p>
                      </div>

                      <button
                        onClick={() => navigate(`/deposits/${item.deposit_db_id}`)}
                        className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg shrink-0 flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      >
                        Inspect <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Compact Queue Footer */}
          {hasMoreItems && (
            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {displayedPriorityQueue.length} of {priorityQueue.length} priority items
              </span>
              <button
                onClick={() => navigate(isInstitution ? '/deposits' : '/tasks')}
                className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                View Complete List in {isInstitution ? 'Registry' : 'Tasks'} <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Role-Tailored Display */}
        {isInstitution ? (
          /* Technical Institution View: Clean 1-FDR Spotlight Mode (No Stretching!) */
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between min-h-[380px]">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    Pledged FDR Spotlight
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Primary active security deposit under council surveillance.
                  </p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                  AICTE Pledged
                </span>
              </div>

              {!focusDeposit ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <Landmark className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  No security deposits registered yet for your institution.
                  <div className="mt-3">
                    <button
                      onClick={() => navigate('/deposits/create')}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer"
                    >
                      Register First FDR
                    </button>
                  </div>
                </div>
              ) : (
                (() => {
                  const days = focusDeposit.days_to_maturity ?? 0;
                  const isExpiring = days <= 90 && days > 0;
                  const isMatured = days <= 0;

                  return (
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-indigo-50/40 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-mono text-xs font-black text-indigo-700 block">
                              {focusDeposit.deposit_id}
                            </span>
                            <span className="text-base font-black text-slate-900">
                              {formatCurrency(focusDeposit.amount)}
                            </span>
                          </div>
                          <StatusBadge status={focusDeposit.lifecycle_status} />
                        </div>

                        <div className="text-xs text-slate-600 space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Issuing Bank:</span>
                            <span className="font-semibold text-slate-800">{focusDeposit.bank_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Receipt No:</span>
                            <span className="font-mono font-medium text-slate-700">{focusDeposit.receipt_no || 'Receipt Document Pledged'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Maturity Date:</span>
                            <span className="font-medium text-slate-700">
                              {focusDeposit.maturity_date ? format(new Date(focusDeposit.maturity_date), 'dd MMM yyyy') : 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Trust Level:</span>
                            <span className="font-bold text-indigo-600">{focusDeposit.trust_level ? focusDeposit.trust_level.replace(/_/g, ' ') : 'NOT CHECKED'}</span>
                          </div>
                        </div>

                        {/* Validity Countdown Pill */}
                        <div
                          className={`p-2.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
                            isMatured
                              ? 'bg-rose-100/90 text-rose-800 border border-rose-200'
                              : isExpiring
                              ? 'bg-amber-100/90 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100/90 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {isMatured ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                            ) : isExpiring ? (
                              <Clock className="w-3.5 h-3.5 text-amber-700" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            )}
                            <span>
                              {isMatured
                                ? `Matured ${Math.abs(days)} days ago — Action Required`
                                : isExpiring
                                ? `Matures in ${days} days — Renewal Due Soon`
                                : `Healthy Standing • ${days} days remaining`}
                            </span>
                          </div>
                        </div>

                        <div>
                          <button
                            onClick={() => navigate(`/deposits/${focusDeposit.id}`)}
                            className="w-full py-2 px-3 text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <FileText className="w-3.5 h-3.5" /> View FDR Passport & Evidence
                          </button>
                        </div>
                      </div>

                      {/* Compact Footer Strip for other deposits (if any) */}
                      {otherDepositsCount > 0 && (
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span><strong>+{otherDepositsCount}</strong> other deposit in healthy standing ({formatCurrency(otherDepositsAmount)})</span>
                          </div>
                          <button
                            onClick={() => navigate('/deposits')}
                            className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                          >
                            Registry <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>

            <div className="mt-3 p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-100 text-[11px] text-indigo-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <strong>Compliance Mandate:</strong> Jointly pledged with Member Secretary, AICTE (Clause 6.46).
              </span>
            </div>
          </div>
        ) : (
          /* Bureau Officer View: Maturity Distribution Calendar (Bar Chart) */
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between min-h-[380px]">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    Maturity Schedule Forecast
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Portfolio-wide upcoming deposit maturities grouped by month.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                  Cross-College
                </span>
              </div>

              <div className="h-60 w-full">
                {calendarData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No maturity data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={calendarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1E293B',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} name="Deposits Maturing" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Automated 90-day alert tracking</span>
              <button
                onClick={() => navigate('/tasks')}
                className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                Inspect Compliance Schedule <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Section: Recent Audit Log */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isInstitution ? 'Your Institution Audit & Event Trail' : 'Recent Bureau Regulatory Activity'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isInstitution
                ? 'Tamper-evident log of all FDR events, uploads, and verifications recorded for your institution.'
                : 'Live audit stream of submissions, OCR extractions, verification runs, and approvals.'}
            </p>
          </div>
          <button
            onClick={() => navigate('/audit')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            View Complete Audit Log <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Record</th>
                <th className="py-3 px-4">Evidence Hash / Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentActivity.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No recent audit events logged.
                  </td>
                </tr>
              ) : (
                recentActivity.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-500">
                      {e.timestamp ? format(new Date(e.timestamp), 'dd MMM yyyy, HH:mm') : 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {e.actor}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-bold">
                        {e.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {e.object_type}: <strong className="font-mono">{e.object_id}</strong>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {e.evidence_reference || e.before_value ? 'Tracked in Hash Store' : 'Direct Action'}
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
