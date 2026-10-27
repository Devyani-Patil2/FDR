import React from 'react';
import { ConsistencyResult } from '../types';
import { CheckCircle2, AlertOctagon, HelpCircle, FileText, Check, Edit2 } from 'lucide-react';

interface MismatchMapProps {
  results: ConsistencyResult[];
  onCorrectField?: (fieldName: string, currentValue: string) => void;
  canEdit?: boolean;
}

export const MismatchMap: React.FC<MismatchMapProps> = ({
  results,
  onCorrectField,
  canEdit = false,
}) => {
  const hasMismatch = results.some((r) => !r.match);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Cross-Document Consistency Engine & Mismatch Map
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated comparative analysis between submitted form data and OCR-extracted receipt evidence.
          </p>
        </div>

        {hasMismatch ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
            Discrepancy Detected
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            All Fields Consistent
          </span>
        )}
      </div>

      {hasMismatch && (
        <div className="mb-5 p-4 rounded-lg bg-rose-50/70 border border-rose-200 text-xs text-rose-800">
          <div className="flex items-start gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Explainable AI Triage Notice:</p>
              <p className="mt-0.5 text-rose-700">
                A mismatch was detected between the applicant-entered details and the document OCR output. This record has been marked as <strong>Requires Review</strong> and queued for scrutiny officer action. AI does not automatically reject records.
              </p>
            </div>
          </div>
        </div>
      )}

      {results.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-sm">
          No comparison fields available. Ensure an FDR receipt document has been uploaded and OCR extraction has been run.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Field Name</th>
                <th className="py-3 px-4">Entered Value</th>
                <th className="py-3 px-4">Extracted (OCR) Value</th>
                <th className="py-3 px-4">OCR Confidence</th>
                <th className="py-3 px-4 text-center">Consistency</th>
                {canEdit && <th className="py-3 px-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((item, index) => {
                const isMatch = item.match;
                const isLowConfidence = item.confidence < 0.75;

                return (
                  <tr
                    key={index}
                    className={
                      !isMatch
                        ? 'bg-rose-50/40 hover:bg-rose-50/70'
                        : 'hover:bg-slate-50/60'
                    }
                  >
                    <td className="py-3 px-4 font-semibold text-slate-900 capitalize">
                      {item.field_name.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {item.entered_value || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-900 font-semibold">
                      {item.extracted_value || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isLowConfidence ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.round(item.confidence * 100)}%` }}
                          />
                        </div>
                        <span
                          className={`font-mono text-[11px] font-semibold ${
                            isLowConfidence ? 'text-amber-700' : 'text-slate-600'
                          }`}
                        >
                          {Math.round(item.confidence * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isMatch ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[11px] font-semibold">
                          <Check className="w-3 h-3" /> Match
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-100 px-2 py-0.5 rounded text-[11px] font-bold">
                          <AlertOctagon className="w-3 h-3" /> Mismatch
                        </span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="py-3 px-4 text-right">
                        {onCorrectField && (
                          <button
                            onClick={() => onCorrectField(item.field_name, item.extracted_value)}
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold"
                          >
                            <Edit2 className="w-3 h-3" /> Correct
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
