import React, { useEffect, useState } from 'react';
import { getAuditEvents } from '../api/client';
import { AuditEvent } from '../types';
import { AuditTimeline } from '../components/AuditTimeline';
import { ScrollText, Search, Filter, ShieldCheck, RefreshCw } from 'lucide-react';

export const AuditPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [objectType, setObjectType] = useState('');
  const [actor, setActor] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await getAuditEvents({
        object_type: objectType || undefined,
        actor: actor || undefined,
        limit: 100,
      });
      setEvents(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [objectType, actor]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-indigo-600" />
            Immutable Audit Trail & Regulatory Provenance
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Every administrative operation, OCR extraction, discrepancy detection, and approval decision is cryptographically traceable.
          </p>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Log
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder="Search by actor username..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        <select
          value={objectType}
          onChange={(e) => setObjectType(e.target.value)}
          className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 bg-white text-slate-700"
        >
          <option value="">All Entities</option>
          <option value="Deposit">Deposit</option>
          <option value="Document">Document</option>
          <option value="ReleaseRequest">Release Request</option>
          <option value="Task">Task</option>
          <option value="Institution">Institution</option>
        </select>
      </div>

      {/* Audit Timeline */}
      <AuditTimeline events={events} />
    </div>
  );
};
