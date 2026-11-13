import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';

const stagesList = [
  { key: 'INITIALIZED', label: 'Intake' },
  { key: 'VALIDATION', label: 'Validation' },
  { key: 'RULE_EVALUATION', label: 'Rules Engine' },
  { key: 'EXTERNAL_VERIFICATION', label: 'External Bureau' },
  { key: 'MANUAL_REVIEW', label: 'Underwriter Review' },
  { key: 'COMPLETED', label: 'Decision' }
];

const WorkflowVisualizer = ({ currentStage, status }) => {
  const isFailed = status === 'FAILED' || status === 'REJECTED';
  const isApproved = status === 'APPROVED';
  const isManualReview = status === 'MANUAL_REVIEW';

  const getStageStatus = (stageKey, index) => {
    const currentIdx = stagesList.findIndex((s) => s.key === currentStage);

    if (stageKey === currentStage) {
      if (status === 'FAILED') return 'failed';
      if (status === 'REJECTED') return 'rejected';
      if (status === 'APPROVED') return 'completed';
      if (status === 'MANUAL_REVIEW') return 'warning';
      return 'active';
    }

    if (currentIdx !== -1 && index < currentIdx) {
      return 'completed';
    }

    if (currentStage === 'COMPLETED' || isApproved || isFailed) {
      if (stageKey === 'MANUAL_REVIEW' && !isManualReview) {
        return 'skipped';
      }
      return 'completed';
    }

    return 'upcoming';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">Workflow Lifecycle Stages</h4>
          <p className="text-xs text-slate-500 mt-0.5">Execution flow through configurable decision gates</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Current Stage:</span>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
            {currentStage}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {stagesList.map((stg, idx) => {
          const stageState = getStageStatus(stg.key, idx);

          let containerClass = 'border-slate-200 bg-slate-50 text-slate-500';
          let icon = <Clock className="w-5 h-5 text-slate-400" />;

          if (stageState === 'completed') {
            containerClass = 'border-emerald-200 bg-emerald-50 text-emerald-800';
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
          } else if (stageState === 'active') {
            containerClass = 'border-indigo-400 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-200';
            icon = <Clock className="w-5 h-5 text-indigo-600 animate-spin" />;
          } else if (stageState === 'warning') {
            containerClass = 'border-amber-300 bg-amber-50 text-amber-900 ring-2 ring-amber-100';
            icon = <AlertTriangle className="w-5 h-5 text-amber-600" />;
          } else if (stageState === 'failed' || stageState === 'rejected') {
            containerClass = 'border-rose-300 bg-rose-50 text-rose-900 ring-2 ring-rose-100';
            icon = <XCircle className="w-5 h-5 text-rose-600" />;
          } else if (stageState === 'skipped') {
            containerClass = 'border-slate-200 bg-slate-50/50 text-slate-400 opacity-60';
          }

          return (
            <div
              key={stg.key}
              className={`flex flex-col items-center text-center p-3.5 rounded-xl border transition-all ${containerClass}`}
            >
              <div className="mb-2">{icon}</div>
              <span className="text-xs font-bold tracking-tight">{stg.label}</span>
              <span className="text-[10px] uppercase font-semibold mt-1 opacity-75">
                {stageState}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkflowVisualizer;
