import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import Badge from '../components/common/Badge';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import WorkflowVisualizer from '../components/workflow/WorkflowVisualizer';
import AuditTimeline from '../components/workflow/AuditTimeline';
import DecisionExplanationPanel from '../components/workflow/DecisionExplanationPanel';
import Modal from '../components/common/Modal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  RotateCw,
  UserCheck,
  CheckCircle,
  XCircle,
  FileCode,
  Shield,
  Clock,
  ExternalLink,
  Activity
} from 'lucide-react';

const RequestDetailsPage = () => {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('explanation'); // 'explanation' | 'audit' | 'payload' | 'dependencies'
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState('APPROVED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const { user } = useAuth();
  const toast = useToast();

  const fetchDetails = async () => {
    try {
      const res = await api.get(`/requests/${id}`);
      setRequest(res.data.data);
    } catch (err) {
      console.error('Failed to load request details:', err);
      toast.error('Failed to load request details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewNotes) {
      toast.error('Please enter underwriter review notes');
      return;
    }

    setSubmittingReview(true);
    try {
      const endpoint = reviewAction === 'APPROVED' ? `/reviews/${id}/approve` : `/reviews/${id}/reject`;
      await api.post(endpoint, { notes: reviewNotes });
      toast.success(`Request marked as ${reviewAction}`);
      setReviewModalOpen(false);
      fetchDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Review action failed');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReExecute = async () => {
    try {
      await api.post(`/requests/${id}/execute`);
      toast.success('Pipeline re-executed successfully');
      fetchDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Execution failed');
    }
  };

  if (loading) return <LoadingSkeleton rows={12} />;
  if (!request) return <div className="text-center py-12 text-slate-500">Request not found.</div>;

  const canReview = (user?.role === 'admin' || user?.role === 'reviewer') && request.status === 'MANUAL_REVIEW';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/requests"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Requests List
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight font-mono">{request.requestId}</h2>
            <Badge status={request.status} size="md" />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Workflow: <span className="font-semibold text-slate-700">{request.workflowCode}</span> | Version: v{request.workflowVersion || 1} | Retries: {request.retryCount || 0}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canReview && (
            <button
              onClick={() => {
                setReviewAction('APPROVED');
                setReviewNotes('');
                setReviewModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20"
            >
              <UserCheck className="w-4 h-4" />
              <span>Adjudicate / Review</span>
            </button>
          )}

          <button
            onClick={handleReExecute}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Re-Execute Stage</span>
          </button>
        </div>
      </div>

      {/* Visual Workflow Stage Progression */}
      <WorkflowVisualizer currentStage={request.currentStage} status={request.status} />

      {/* Underwriter Adjudication Banner (if already reviewed) */}
      {request.reviewedBy && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 mt-0.5">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Manual Adjudication Recorded
            </h4>
            <p className="text-sm font-semibold text-slate-800 mt-1">
              Decision: <span className="text-indigo-600 font-bold">{request.status}</span>
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              Reviewer Notes: "{request.reviewerNotes || 'Approved'}"
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Adjudicated by {request.reviewedBy?.fullName || request.reviewedBy?.username || 'Underwriter'} at {new Date(request.reviewedAt).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-6 text-xs font-bold uppercase tracking-wider">
        <button
          onClick={() => setActiveTab('explanation')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'explanation'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Decision Explanation
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Audit Trail ({request.auditTrail?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('payload')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'payload'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Input Payload & Metadata
        </button>
        <button
          onClick={() => setActiveTab('dependencies')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'dependencies'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          External Calls ({request.dependencyLogs?.length || 0})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'explanation' && (
        <DecisionExplanationPanel
          evaluationSummary={request.evaluationSummary}
          requestStatus={request.status}
        />
      )}

      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">
            Immutable Request Audit Trail (Append-Only)
          </h3>
          <AuditTimeline logs={request.auditTrail || []} />
        </div>
      )}

      {activeTab === 'payload' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Submitted Payload Data</h4>
            <div className="bg-slate-50 rounded-xl p-4 font-mono text-xs text-slate-800 border border-slate-200/60 overflow-x-auto">
              <pre>{JSON.stringify(request.payload, null, 2)}</pre>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Lifecycle Metadata & Constraints</h4>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Idempotency Key</span>
                <span className="font-mono font-bold text-slate-800">{request.idempotencyKey || 'None'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Workflow Version</span>
                <span className="font-bold text-slate-800">v{request.workflowVersion || 1}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Last Successful Stage</span>
                <span className="font-bold text-emerald-600">{request.lastSuccessfulStage || 'None'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Client Source</span>
                <span className="font-bold text-slate-800">{request.metadata?.source || 'API'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Created Timestamp</span>
                <span className="font-mono text-slate-600">{new Date(request.createdAt).toISOString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'dependencies' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">
            Third-Party Bureau Integration Logs
          </h3>
          {(request.dependencyLogs || []).length === 0 ? (
            <p className="text-xs text-slate-500">No external dependencies contacted for this request.</p>
          ) : (
            <div className="space-y-3">
              {request.dependencyLogs.map((dep, idx) => (
                <div
                  key={dep._id || idx}
                  className={`p-4 rounded-xl border ${
                    dep.isSuccess
                      ? 'border-emerald-200 bg-emerald-50/40'
                      : 'border-rose-200 bg-rose-50/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-white border border-slate-200">
                        Attempt #{dep.attemptNumber}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{dep.serviceName}</span>
                      <span className="text-xs text-slate-500 font-mono">{dep.endpoint}</span>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        dep.isSuccess ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {dep.isSuccess ? 'SUCCESS (200)' : `FAILED (${dep.statusCode || 500})`}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mb-2">
                    Latency: <span className="font-bold font-mono">{dep.durationMs}ms</span>
                    {dep.errorMessage && (
                      <span className="text-rose-600 font-semibold ml-3">Error: {dep.errorMessage}</span>
                    )}
                  </div>
                  {dep.responsePayload && (
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-700">
                      <pre>{JSON.stringify(dep.responsePayload, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual Review Modal */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="Underwriter Adjudication Decision"
      >
        <form onSubmit={handleReviewSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Adjudication Action
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setReviewAction('APPROVED')}
                className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                  reviewAction === 'APPROVED'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>APPROVE APPLICATION</span>
              </button>

              <button
                type="button"
                onClick={() => setReviewAction('REJECTED')}
                className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                  reviewAction === 'REJECTED'
                    ? 'border-rose-600 bg-rose-50 text-rose-700 ring-2 ring-rose-200'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>REJECT APPLICATION</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Reviewer Notes & Justification *
            </label>
            <textarea
              rows={3}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Provide clear rationale for underwriter audit record..."
              className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
              required
            ></textarea>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setReviewModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingReview}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
            >
              {submittingReview ? 'Recording Decision...' : 'Confirm Decision'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RequestDetailsPage;
