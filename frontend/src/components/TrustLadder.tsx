import React from 'react';
import { TrustLadder as TrustLadderType } from '../types';
import { CheckCircle2, Clock, AlertTriangle, ShieldCheck, FileCheck, Hash, Eye, UserCheck } from 'lucide-react';

interface TrustLadderProps {
  data: TrustLadderType;
  onConfirmHuman?: () => void;
  canConfirmHuman?: boolean;
}

export const TrustLadder: React.FC<TrustLadderProps> = ({
  data,
  onConfirmHuman,
  canConfirmHuman = true,
}) => {
  const steps = [
    {
      level: 1,
      name: 'Uploaded',
      description: 'Document file received. Authenticity not established.',
      active: data.uploaded,
      icon: Eye,
    },
    {
      level: 2,
      name: 'Integrity Tracked',
      description: 'SHA-256 hash computed & logged. Detects post-upload file tampering.',
      active: data.integrity_tracked,
      icon: Hash,
    },
    {
      level: 3,
      name: 'Fields Extracted',
      description: 'Candidate fields parsed via OCR with confidence scores & bounding boxes.',
      active: data.fields_extracted,
      icon: FileCheck,
    },
    {
      level: 4,
      name: 'Cross-Check Passed',
      description: 'Internal consistency check across entered form & extracted receipt fields.',
      active: data.cross_check_passed,
      icon: CheckCircle2,
    },
    {
      level: 5,
      name: 'Source Verified',
      description: 'Independent bank verification confirmation recorded via API/sandbox.',
      active: data.source_verified,
      icon: ShieldCheck,
    },
    {
      level: 6,
      name: 'Human Confirmed',
      description: 'Authorized scrutiny officer reviewed evidence and documented formal clearance with remarks.',
      active: data.human_confirmed,
      icon: UserCheck,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            Verification Trust Ladder
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict separation of trust states — An upload or OCR extraction is never mistaken for bank confirmation or human decision.
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 block">Current Stage</span>
          <span className="text-sm font-bold text-indigo-600">
            {data.current_level.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {steps.map((step) => {
          const Icon = step.icon;
          const isDone = step.active;

          return (
            <div
              key={step.level}
              className={`flex items-start gap-4 p-3.5 rounded-lg border transition-all ${
                isDone
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : 'bg-slate-50/60 border-slate-200/80 opacity-70'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                  isDone
                    ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/20'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <span>{step.level}. {step.name}</span>
                    {isDone ? (
                      <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Satisfied
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    )}
                  </h4>

                  {step.level === 6 && (
                    <div className="flex items-center gap-2">
                      {isDone ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Scrutiny Certified
                        </span>
                      ) : canConfirmHuman && onConfirmHuman ? (
                        <button
                          type="button"
                          onClick={onConfirmHuman}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" /> Certify Human Scrutiny
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Governance Guarantee:</span> Automated AI extraction and bank checks assist scrutiny, but the authority to clear security deposits remains exclusively with authorized human officials documenting official remarks.
        </div>
      </div>
    </div>
  );
};
