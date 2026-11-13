import React from 'react';
import { Inbox } from 'lucide-react';

const EmptyState = ({ title = 'No data found', description = 'Try adjusting your filters or search terms.', action }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-slate-200/80 my-4">
      <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl mb-4 border border-slate-100">
        <Inbox className="w-8 h-8" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mt-1">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};

export default EmptyState;
