import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, ShieldCheck, HelpCircle } from 'lucide-react';
import Badge from '../common/Badge';

const DecisionExplanationPanel = ({ evaluationSummary, requestStatus }) => {
  if (!evaluationSummary) {
    return (
      <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm text-slate-500">
        No rule evaluation results available for this request.
      </div>
    );
  }

  const { outcome, reason, ruleResults = [], rulesEvaluatedCount = 0, rulesTriggeredCount = 0 } = evaluationSummary;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
      {/* Top Decision Summary */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Decision Outcome</span>
          <div className="flex items-center gap-2 mt-1">
            <Badge status={requestStatus || outcome} size="md" />
            <span className="text-sm font-bold text-slate-800">{reason || 'Decision reached'}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
          <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
            Rules Evaluated: <span className="font-bold text-slate-900">{rulesEvaluatedCount}</span>
          </div>
          <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
            Rules Triggered: <span className="font-bold text-indigo-600">{rulesTriggeredCount}</span>
          </div>
        </div>
      </div>

      {/* Evaluated Rules List */}
      <div>
        <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          Rule Evaluation Trace (Priority Order)
        </h4>

        {ruleResults.length === 0 ? (
          <p className="text-xs text-slate-500">No individual rule traces logged.</p>
        ) : (
          <div className="space-y-3">
            {ruleResults.map((r, index) => {
              const isMatched = r.matched;
              return (
                <div
                  key={r.ruleCode || index}
                  className={`p-4 rounded-xl border transition-colors ${
                    isMatched
                      ? 'border-indigo-200 bg-indigo-50/40'
                      : 'border-slate-200 bg-white opacity-85'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        P{r.priority ?? index + 1}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {r.ruleName || r.ruleCode}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">({r.ruleCode})</span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        isMatched
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isMatched ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Triggered
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" /> Skipped
                        </>
                      )}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mb-2">
                    <span className="font-semibold">Result: </span>
                    {r.explanation || (isMatched ? 'Condition matched' : 'Condition criteria not met')}
                  </p>

                  {/* Condition Details */}
                  {r.conditionDetails && r.conditionDetails.length > 0 && (
                    <div className="mt-2 bg-white rounded-lg border border-slate-200 p-2 text-xs space-y-1">
                      {r.conditionDetails.map((cond, cIdx) => (
                        <div key={cIdx} className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-slate-600">
                            {cond.field} <span className="font-bold text-indigo-600">[{cond.operator}]</span> {JSON.stringify(cond.expectedValue)}
                          </span>
                          <span className={cond.matched ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                            Actual: {JSON.stringify(cond.actualValue)} ({cond.matched ? 'MATCH' : 'NO MATCH'})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DecisionExplanationPanel;
