import React from 'react';
import { ChainNode } from '../types';
import { StatusBadge } from './StatusBadge';
import { ArrowRight, AlertTriangle, CheckCircle, ShieldAlert, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';

interface ReplacementChainProps {
  chain: ChainNode[];
  onOpenReplaceModal?: () => void;
  canReplace?: boolean;
}

export const ReplacementChain: React.FC<ReplacementChainProps> = ({
  chain,
  onOpenReplaceModal,
  canReplace = false,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            Instrument Replacement Lineage
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Traces original instruments through successive replacements. Old records are preserved in audit history rather than overwritten.
          </p>
        </div>

        {canReplace && onOpenReplaceModal && (
          <button
            onClick={onOpenReplaceModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Issue Replacement FDR
          </button>
        )}
      </div>

      {chain.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          No replacement lineage associated with this instrument.
        </div>
      ) : (
        <div className="flex flex-col md:flex-row items-center gap-4 overflow-x-auto py-4">
          {chain.map((node, index) => {
            const isLast = index === chain.length - 1;
            const hasGap = node.coverage_gap_days !== null && node.coverage_gap_days !== undefined && node.coverage_gap_days > 0;

            return (
              <React.Fragment key={node.id}>
                {/* Node card */}
                <div
                  className={`w-full md:w-72 shrink-0 p-4 rounded-xl border transition-all ${
                    isLast
                      ? 'bg-indigo-50/40 border-indigo-200 shadow-sm ring-1 ring-indigo-500/20'
                      : 'bg-slate-50/70 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-indigo-700">
                      {node.deposit_id}
                    </span>
                    <StatusBadge status={node.lifecycle_status} />
                  </div>

                  <div className="text-lg font-bold text-slate-900 mb-1">
                    {formatCurrency(node.amount)}
                  </div>

                  <div className="text-xs text-slate-600 mb-2 truncate">
                    {node.bank_name}
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-500 pt-2 border-t border-slate-200/60">
                    <div className="flex justify-between">
                      <span>Issued:</span>
                      <strong className="text-slate-700">
                        {node.issue_date ? format(new Date(node.issue_date), 'dd MMM yyyy') : 'N/A'}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Maturity:</span>
                      <strong className="text-slate-700">
                        {node.maturity_date ? format(new Date(node.maturity_date), 'dd MMM yyyy') : 'N/A'}
                      </strong>
                    </div>
                  </div>

                  {isLast && (
                    <div className="mt-3 text-[10px] uppercase font-bold tracking-wider text-center py-1 bg-indigo-100/70 text-indigo-800 rounded">
                      Current Active / Final Stage
                    </div>
                  )}
                </div>

                {/* Arrow connector with gap notification */}
                {!isLast && (
                  <div className="flex flex-col items-center justify-center shrink-0 px-2 my-2 md:my-0">
                    <div className="flex items-center gap-1 text-slate-400">
                      <span className="h-0.5 w-6 bg-slate-300 hidden md:block"></span>
                      <ArrowRight className="w-5 h-5 text-indigo-600 shrink-0" />
                      <span className="h-0.5 w-6 bg-slate-300 hidden md:block"></span>
                    </div>

                    {hasGap ? (
                      <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 whitespace-nowrap">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        Coverage Gap: {node.coverage_gap_days} days
                      </div>
                    ) : (
                      <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 whitespace-nowrap">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        Continuous
                      </div>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
