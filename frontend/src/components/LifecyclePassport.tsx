import React from 'react';
import { PassportEvent } from '../types';
import { format } from 'date-fns';
import {
  FileText,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowRightCircle,
  FileCheck2,
  User,
  History,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

interface LifecyclePassportProps {
  events: PassportEvent[];
}

export const LifecyclePassport: React.FC<LifecyclePassportProps> = ({ events }) => {
  const getIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'SUBMISSION':
        return FileText;
      case 'DOCUMENT':
        return FileCheck2;
      case 'EXTRACTION':
        return CheckCircle;
      case 'VERIFICATION':
        return ShieldCheck;
      case 'TASK':
        return Clock;
      case 'RELEASE':
        return ArrowRightCircle;
      case 'STATUS_CHANGE':
        return History;
      default:
        return AlertCircle;
    }
  };

  const getBadgeColor = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'red':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'amber':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'purple':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'indigo':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'cyan':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getDotColor = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-emerald-500 ring-emerald-100';
      case 'red':
        return 'bg-rose-500 ring-rose-100';
      case 'amber':
        return 'bg-amber-500 ring-amber-100';
      case 'purple':
        return 'bg-purple-500 ring-purple-100';
      case 'indigo':
        return 'bg-indigo-500 ring-indigo-100';
      case 'cyan':
        return 'bg-cyan-500 ring-cyan-100';
      default:
        return 'bg-slate-500 ring-slate-100';
    }
  };

  if (!events || events.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        No lifecycle events recorded yet for this instrument.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            Deposit Lifecycle Passport
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Single continuous provenance record linking registration, document scrutiny, verification, and closure.
          </p>
        </div>
        <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-1 rounded-full border border-indigo-100">
          {events.length} Recorded Milestone{events.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="relative pl-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        <div className="space-y-6">
          {events.map((evt, idx) => {
            const Icon = getIcon(evt.event_type);
            const formattedDate = evt.timestamp
              ? format(new Date(evt.timestamp), 'PPpp')
              : 'Unknown Date';

            return (
              <div key={idx} className="relative flex items-start gap-4 group">
                {/* Node dot */}
                <div
                  className={`absolute -left-6 top-1.5 w-6 h-6 rounded-full flex items-center justify-center ring-4 shadow-sm z-10 ${getDotColor(
                    evt.icon_color
                  )}`}
                >
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>

                <div className="flex-1 bg-slate-50/70 hover:bg-slate-50 transition-colors border border-slate-200/80 rounded-lg p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900">
                        {evt.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getBadgeColor(
                          evt.icon_color
                        )}`}
                      >
                        {evt.event_type}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                      {formattedDate}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed mb-2">
                    {evt.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-2 border-t border-slate-200/60">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      Actor: <strong className="text-slate-700">{evt.actor || 'System'}</strong>
                    </span>

                    {evt.details && (
                      <span className="text-slate-400">
                        {Object.entries(evt.details).map(([k, v]) => (
                          <span key={k} className="mr-3">
                            {k}: <code className="text-slate-700 font-mono">{String(v)}</code>
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
