import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import Badge from '../components/common/Badge';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import DecisionExplanationPanel from '../components/workflow/DecisionExplanationPanel';
import { ArrowLeft, ShieldCheck, RefreshCw } from 'lucide-react';

const DecisionExplanationPage = () => {
  const { id } = useParams();
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchExplanation = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/requests/${id}/explanation`);
      setExplanation(res.data.data);
    } catch (err) {
      console.error('Failed to load decision explanation:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExplanation();
  }, [id]);

  if (loading) return <LoadingSkeleton rows={8} />;
  if (!explanation) return <div className="text-center py-12 text-slate-500">Explanation not found.</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to={`/requests/${id}`}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Request Details
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              Decision Explanation: {explanation.requestId}
            </h2>
            <Badge status={explanation.finalDecision} size="md" />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Explainable breakdown of all evaluated criteria, rule matches, and underwriter justification
          </p>
        </div>
        <button
          onClick={fetchExplanation}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Analysis</span>
        </button>
      </div>

      <DecisionExplanationPanel
        evaluationSummary={{
          outcome: explanation.overallOutcome,
          reason: explanation.summaryReason,
          ruleResults: explanation.rulesTriggered.concat(explanation.rulesSkipped),
          rulesEvaluatedCount: explanation.rulesEvaluatedCount,
          rulesTriggeredCount: explanation.rulesTriggeredCount
        }}
        requestStatus={explanation.finalDecision}
      />
    </div>
  );
};

export default DecisionExplanationPage;
