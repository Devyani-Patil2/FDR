import React, { useState } from 'react';
import { ChecklistResult } from '../types';
import { StatusBadge } from './StatusBadge';
import { CheckSquare, AlertCircle, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface ChecklistViewerProps {
  checklist: ChecklistResult[];
  onUpdateItem?: (resultId: number, status: string, notes?: string) => Promise<void>;
  canEvaluate?: boolean;
}

export const ChecklistViewer: React.FC<ChecklistViewerProps> = ({
  checklist,
  onUpdateItem,
  canEvaluate = false,
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('SATISFIED');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const satisfiedCount = checklist.filter(
    (c) => c.status === 'SATISFIED' || c.status === 'NOT_APPLICABLE'
  ).length;
  const totalCount = checklist.length;
  const progressPercent = totalCount > 0 ? Math.round((satisfiedCount / totalCount) * 100) : 0;

  const handleSave = async (id: number) => {
    if (!onUpdateItem) return;
    setSubmitting(true);
    try {
      await onUpdateItem(id, selectedStatus, notes);
      setEditingId(null);
      setNotes('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-100 mb-6 gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-600" />
            Policy-Aware Release Readiness Checker
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Governed by AICTE Approval Process Handbook (APH 2024–2027 Clause 6.46). All items must be satisfied before approval.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
              Readiness Score
            </span>
            <span className="text-sm font-bold text-indigo-600">
              {satisfiedCount} / {totalCount} ({progressPercent}%)
            </span>
          </div>

          <div className="w-24 bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                progressPercent === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {checklist.map((item) => {
          const rule = item.checklist_item;
          const isEditing = editingId === item.id;

          return (
            <div
              key={item.id}
              className="p-4 rounded-lg border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-[240px]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {rule?.rule_id || `ITEM-${item.id}`}
                    </span>
                    {rule?.is_required ? (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        Mandatory
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        Optional / If Applicable
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 font-mono">
                      v{rule?.version || '1.0'}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {rule?.requirement}
                  </p>

                  {rule?.source_reference && (
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-slate-400" />
                      Ref: {rule.source_reference}
                    </p>
                  )}

                  {item.notes && (
                    <p className="text-xs text-slate-600 mt-2 bg-white p-2 rounded border border-slate-200">
                      <strong>Scrutiny Remark:</strong> {item.notes}
                    </p>
                  )}

                  {item.evaluated_by && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Evaluated by {item.evaluated_by}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={item.status} />

                  {canEvaluate && !isEditing && (
                    <button
                      onClick={() => {
                        setEditingId(item.id);
                        setSelectedStatus(item.status);
                        setNotes(item.notes || '');
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors shadow-xs"
                    >
                      Evaluate
                    </button>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Evaluation Outcome
                      </label>
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                      >
                        <option value="SATISFIED">SATISFIED (Approved Document)</option>
                        <option value="DEFICIENT">DEFICIENT (Missing / Invalid)</option>
                        <option value="PENDING_VERIFICATION">PENDING VERIFICATION</option>
                        <option value="NOT_APPLICABLE">NOT APPLICABLE</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Officer Observation Notes
                      </label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g., Verified against original letterhead scan"
                        className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleSave(item.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                    >
                      {submitting ? 'Saving...' : 'Record Finding'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
