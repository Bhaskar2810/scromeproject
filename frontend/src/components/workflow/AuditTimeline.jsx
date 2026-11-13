import React from 'react';
import {
  FileText,
  CheckCircle,
  AlertOctagon,
  ArrowRightCircle,
  ExternalLink,
  RotateCw,
  UserCheck,
  Zap,
  Info
} from 'lucide-react';

const eventIcons = {
  REQUEST_CREATED: <FileText className="w-4 h-4 text-blue-600" />,
  INPUT_VALIDATED: <CheckCircle className="w-4 h-4 text-emerald-600" />,
  INPUT_VALIDATION_FAILED: <AlertOctagon className="w-4 h-4 text-rose-600" />,
  STAGE_TRANSITION: <ArrowRightCircle className="w-4 h-4 text-indigo-600" />,
  RULES_EVALUATION_COMPLETED: <Zap className="w-4 h-4 text-amber-600" />,
  EXTERNAL_CALL_SUCCESS: <CheckCircle className="w-4 h-4 text-emerald-600" />,
  EXTERNAL_CALL_FAILED: <AlertOctagon className="w-4 h-4 text-rose-600" />,
  RETRY_SCHEDULED: <RotateCw className="w-4 h-4 text-purple-600" />,
  MANUAL_REVIEW_SUBMITTED: <UserCheck className="w-4 h-4 text-indigo-600" />
};

const AuditTimeline = ({ logs = [] }) => {
  if (!logs || logs.length === 0) {
    return <p className="text-sm text-slate-500 py-4">No audit events recorded yet.</p>;
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
      {logs.map((log, index) => {
        const icon = eventIcons[log.eventType] || <Info className="w-4 h-4 text-slate-600" />;
        const timeFormatted = new Date(log.timestamp || log.createdAt).toLocaleString();

        return (
          <div key={log._id || index} className="relative group">
            <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center shadow-xs">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded bg-slate-100">{icon}</span>
                  <span className="text-xs font-bold text-slate-900 tracking-wide">
                    {log.eventType.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                    {log.stage}
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">{timeFormatted}</span>
              </div>

              <div className="text-xs text-slate-600 flex items-center gap-2 mb-2">
                <span className="font-medium text-slate-700">Actor:</span>
                <span className="font-semibold text-indigo-600">{log.actor}</span>
                <span className="text-slate-400">({log.actorRole || 'SYSTEM'})</span>
              </div>

              {log.details && Object.keys(log.details).length > 0 && (
                <div className="mt-2 bg-slate-50 rounded-lg p-2.5 text-xs font-mono text-slate-700 overflow-x-auto border border-slate-200/60 max-h-40">
                  <pre>{JSON.stringify(log.details, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AuditTimeline;
