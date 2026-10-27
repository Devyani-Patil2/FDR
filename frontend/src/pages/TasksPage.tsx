import React, { useEffect, useState } from 'react';
import {
  getTasks,
  getMyTasks,
  acknowledgeTask,
  closeTask,
  reassignTask,
  generateMaturityAlerts,
  listUsers,
} from '../api/client';
import { Task, User } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  CheckSquare,
  Clock,
  Play,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  XCircle,
  Filter,
  User as UserIcon,
} from 'lucide-react';
import { format } from 'date-fns';

export const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);

  // Close modal
  const [closingTask, setClosingTask] = useState<Task | null>(null);
  const [closeReason, setCloseReason] = useState('');

  // Reassign modal
  const [reassigningTask, setReassigningTask] = useState<Task | null>(null);
  const [newOwnerId, setNewOwnerId] = useState<number>(1);

  const [notice, setNotice] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data =
        viewMode === 'mine'
          ? await getMyTasks()
          : await getTasks({
              status: statusFilter || undefined,
              task_type: typeFilter || undefined,
            });
      setTasks(data);
      const userList = await listUsers().catch(() => []);
      setUsers(userList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [viewMode, statusFilter, typeFilter]);

  const handleAcknowledge = async (id: number) => {
    try {
      await acknowledgeTask(id);
      setNotice('Task marked as Acknowledged.');
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to acknowledge');
    }
  };

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingTask) return;
    try {
      await closeTask(closingTask.id, closeReason);
      setClosingTask(null);
      setCloseReason('');
      setNotice('Task closed and recorded in audit log.');
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to close task');
    }
  };

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassigningTask) return;
    try {
      await reassignTask(reassigningTask.id, newOwnerId);
      setReassigningTask(null);
      setNotice('Task reassigned successfully.');
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to reassign');
    }
  };

  const handleTriggerScheduler = async () => {
    try {
      const res = await generateMaturityAlerts();
      setNotice(`Automated Alert Job Executed: ${res.message}`);
      await loadData();
    } catch {
      setNotice('Failed to execute alert scheduler.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-indigo-600" />
            Maturity Intelligence & Compliance Task Engine
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Every regulatory deadline and verification exception is converted into an assigned, escalating task with an owner and audit record.
          </p>
        </div>

        <button
          onClick={handleTriggerScheduler}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Run Maturity Alert Scheduler
        </button>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-semibold flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-indigo-600 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Tabs & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              viewMode === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Bureau Tasks
          </button>
          <button
            onClick={() => setViewMode('mine')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              viewMode === 'mine'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Assigned to Me
          </button>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 bg-white text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="ESCALATED">Escalated</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 bg-white text-slate-700"
          >
            <option value="">All Task Types</option>
            <option value="MATURITY_REMINDER">Maturity Reminder</option>
            <option value="OVERDUE_ACTION">Overdue Action</option>
            <option value="MISMATCH_REVIEW">Mismatch Review</option>
            <option value="VERIFICATION_PENDING">Verification Pending</option>
            <option value="RELEASE_REVIEW">Release Review</option>
          </select>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Task ID</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Task Title & Details</th>
                <th className="py-3.5 px-4">Associated FDR</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4">Assigned Owner</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading compliance tasks...
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No active tasks match the filters.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr
                    key={task.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      task.is_overdue ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      {task.task_id}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 text-[11px]">
                        {task.task_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <div className="font-bold text-slate-900">{task.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {task.description}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                      {task.deposit_display_id}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{task.due_date ? format(new Date(task.due_date), 'dd MMM yyyy') : 'N/A'}</div>
                      {task.is_overdue && (
                        <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="w-3 h-3 text-rose-600" /> Overdue
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      <span className="flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        {task.owner_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <StatusBadge status={task.status} />
                        {task.escalation_level > 0 && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100/90 border border-rose-200 px-2 py-0.5 rounded-full">
                            Level {task.escalation_level} Escalated
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {task.status === 'OPEN' && (
                          <button
                            onClick={() => handleAcknowledge(task.id)}
                            title="Acknowledge Task"
                            className="p-1 text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                        {task.status !== 'CLOSED' && (
                          <>
                            <button
                              onClick={() => {
                                setReassigningTask(task);
                                setNewOwnerId(users[0]?.id || 1);
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded"
                            >
                              Reassign
                            </button>
                            <button
                              onClick={() => {
                                setClosingTask(task);
                                setCloseReason('');
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200"
                            >
                              Close
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Close Task Modal */}
      {closingTask && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Close Compliance Task {closingTask.task_id}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Enter the resolution outcome and reason. This will be permanently recorded in the audit trail.
            </p>

            <form onSubmit={handleClose} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Closure Reason & Resolution Summary *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Institution submitted renewed FDR receipt; mismatch corrected."
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setClosingTask(null)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Record Closure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Task Modal */}
      {reassigningTask && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Reassign Task {reassigningTask.task_id}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Select an authorized scrutiny officer or administrator to take ownership.
            </p>

            <form onSubmit={handleReassign} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select New Owner *
                </label>
                <select
                  value={newOwnerId}
                  onChange={(e) => setNewOwnerId(parseInt(e.target.value, 10))}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReassigningTask(null)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Confirm Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
