import React from 'react';
import { AuditEvent } from '../types';
import { format } from 'date-fns';
import { ScrollText, User, Tag, Clock } from 'lucide-react';

interface AuditTimelineProps {
  events: AuditEvent[];
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        No audit log events available.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-indigo-600" />
            Append-Only Audit Log & Tamper-Evident Trail
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable tracking of all operational changes, approvals, OCR extractions, and verification runs.
          </p>
        </div>
        <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2.5 py-1 rounded-full border border-slate-200">
          {events.length} Entries
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        {events.map((evt) => {
          const formattedDate = evt.timestamp
            ? format(new Date(evt.timestamp), 'PPpp')
            : 'Unknown';

          return (
            <div key={evt.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">
                    {evt.action.replace(/_/g, ' ')}
                  </span>
                  {evt.object_type && (
                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {evt.object_type} {evt.object_id ? `(#${evt.object_id})` : ''}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-300" />
                  {formattedDate}
                </span>
              </div>

              {evt.reason && (
                <p className="text-xs text-slate-600 mb-2 italic">
                  &ldquo;{evt.reason}&rdquo;
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  By: <strong className="text-slate-700">{evt.actor}</strong>
                </span>

                {evt.before_value && (
                  <span className="font-mono text-[11px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                    Before: {evt.before_value}
                  </span>
                )}

                {evt.after_value && (
                  <span className="font-mono text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    After: {evt.after_value}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
