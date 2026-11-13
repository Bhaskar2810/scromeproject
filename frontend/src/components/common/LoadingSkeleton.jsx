import React from 'react';

const LoadingSkeleton = ({ rows = 5 }) => {
  return (
    <div className="w-full space-y-4 animate-pulse p-4 bg-white rounded-xl border border-slate-200">
      <div className="h-6 bg-slate-200 rounded w-1/4"></div>
      <div className="space-y-3 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-4 bg-slate-200 rounded w-1/6"></div>
            <div className="h-4 bg-slate-200 rounded w-2/6"></div>
            <div className="h-4 bg-slate-200 rounded w-1/6"></div>
            <div className="h-4 bg-slate-200 rounded w-2/6"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoadingSkeleton;
