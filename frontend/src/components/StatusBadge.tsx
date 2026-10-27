import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getColors = () => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
      case 'VERIFIED':
      case 'SATISFIED':
      case 'APPROVED':
      case 'RELEASED':
      case 'HUMAN_CONFIRMED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/20';

      case 'EXPIRING':
      case 'PENDING':
      case 'PENDING_VERIFICATION':
      case 'PENDING_CLEARANCE':
      case 'UNDER_SCRUTINY':
      case 'AWAITING_AUTHORITY':
      case 'IN_PROGRESS':
      case 'ACKNOWLEDGED':
      case 'FIELDS_EXTRACTED':
        return 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/20';

      case 'MATURED':
      case 'MISMATCH':
      case 'DEFICIENT':
      case 'REJECTED':
      case 'OVERDUE_ACTION':
      case 'ESCALATED':
        return 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-600/20';

      case 'RENEWED':
      case 'CROSS_CHECK_PASSED':
      case 'SOURCE_VERIFIED':
      case 'INTEGRITY_TRACKED':
        return 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-600/20';

      case 'REPLACED':
      case 'CLOSED':
      case 'NOT_APPLICABLE':
      case 'NOT_EVALUATED':
      case 'NOT_CHECKED':
      case 'DRAFT':
      case 'UPLOADED':
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 ring-slate-600/20';
    }
  };

  const formatText = (text: string) => {
    return text.replace(/_/g, ' ');
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ring-1 ring-inset ${getColors()} ${className}`}
    >
      {formatText(status)}
    </span>
  );
};
