import React from 'react';

const statusStyles = {
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  MANUAL_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
  RETRY_PENDING: 'bg-purple-50 text-purple-700 border-purple-200',
  INITIALIZED: 'bg-slate-100 text-slate-700 border-slate-200',
  VALIDATION: 'bg-blue-50 text-blue-700 border-blue-200',
  RULE_EVALUATION: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  EXTERNAL_VERIFICATION: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  COMPLETED: 'bg-teal-50 text-teal-700 border-teal-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  INACTIVE: 'bg-slate-100 text-slate-500 border-slate-200'
};

const Badge = ({ status, text, size = 'sm' }) => {
  const normalized = (status || '').toUpperCase();
  const style = statusStyles[normalized] || 'bg-slate-100 text-slate-700 border-slate-200';
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border tracking-wide uppercase ${sizeClasses} ${style}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70"></span>
      {text || status}
    </span>
  );
};

export default Badge;
