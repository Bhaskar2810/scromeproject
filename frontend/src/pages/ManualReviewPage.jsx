import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Badge from '../components/common/Badge';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import { useToast } from '../context/ToastContext';
import { UserCheck, CheckCircle, XCircle, AlertTriangle, Eye, RefreshCw } from 'lucide-react';

const ManualReviewPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState(null);
  const [action, setAction] = useState('APPROVED');
  const [notes, setNotes] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const toast = useToast();

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reviews');
      setReviews(res.data.data || []);
    } catch (err) {
      console.error('Failed to load review queue:', err);
      toast.error('Failed to load manual review queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const openDecisionModal = (req, defaultAction) => {
    setSelectedReq(req);
    setAction(defaultAction);
    setNotes('');
    setModalOpen(true);
  };

  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    if (!notes) {
      toast.error('Please enter underwriter rationale');
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = action === 'APPROVED' ? `/reviews/${selectedReq.requestId}/approve` : `/reviews/${selectedReq.requestId}/reject`;
      await api.post(endpoint, { notes });
      toast.success(`Request ${selectedReq.requestId} marked as ${action}`);
      setModalOpen(false);
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error recording decision');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Manual Underwriter Review Queue</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Adjudicate business requests requiring human intervention according to configurable rules
          </p>
        </div>
        <button
          onClick={fetchQueue}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Queue ({reviews.length})</span>
        </button>
      </div>

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : reviews.length === 0 ? (
        <EmptyState
          title="Manual Review Queue is Empty!"
          description="All applications have been adjudicated or automatically approved/rejected by the rules engine."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-6">Request ID</th>
                  <th className="py-3.5 px-6">Applicant</th>
                  <th className="py-3.5 px-6">Amount</th>
                  <th className="py-3.5 px-6">Income</th>
                  <th className="py-3.5 px-6">Review Trigger Reason</th>
                  <th className="py-3.5 px-6">Submitted At</th>
                  <th className="py-3.5 px-6 text-right">Adjudication</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {reviews.map((req) => (
                  <tr key={req.requestId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-6 font-mono font-bold text-slate-900">
                      <Link to={`/requests/${req.requestId}`} className="hover:text-indigo-600">
                        {req.requestId}
                      </Link>
                    </td>
                    <td className="py-3.5 px-6 font-semibold text-slate-900">
                      {req.payload?.applicantName || 'N/A'}
                    </td>
                    <td className="py-3.5 px-6 font-mono font-semibold">
                      ${Number(req.payload?.amount || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-6 font-mono text-slate-600">
                      ${Number(req.payload?.income || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-6 text-slate-600 max-w-xs truncate">
                      {req.evaluationSummary?.reason || 'Flagged for underwriter assessment'}
                    </td>
                    <td className="py-3.5 px-6 text-slate-400">
                      {new Date(req.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3.5 px-6 text-right space-x-2">
                      <button
                        onClick={() => openDecisionModal(req, 'APPROVED')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold hover:bg-emerald-100 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => openDecisionModal(req, 'REJECTED')}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-bold hover:bg-rose-100 transition-colors"
                      >
                        Reject
                      </button>
                      <Link
                        to={`/requests/${req.requestId}`}
                        className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 inline-block align-middle"
                        title="View Full Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Decision Adjudication Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Review Request: ${selectedReq?.requestId}`}
      >
        <form onSubmit={handleDecisionSubmit} className="space-y-4">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1">
            <p>
              <span className="font-semibold text-slate-600">Applicant:</span>{' '}
              <span className="font-bold text-slate-900">{selectedReq?.payload?.applicantName}</span>
            </p>
            <p>
              <span className="font-semibold text-slate-600">Requested Amount:</span>{' '}
              <span className="font-bold font-mono text-slate-900">
                ${Number(selectedReq?.payload?.amount || 0).toLocaleString()}
              </span>
            </p>
            <p>
              <span className="font-semibold text-slate-600">Rules Trigger:</span>{' '}
              <span className="text-indigo-600">{selectedReq?.evaluationSummary?.reason}</span>
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Decision
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAction('APPROVED')}
                className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                  action === 'APPROVED'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>APPROVE</span>
              </button>
              <button
                type="button"
                onClick={() => setAction('REJECTED')}
                className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                  action === 'REJECTED'
                    ? 'border-rose-600 bg-rose-50 text-rose-700 ring-2 ring-rose-200'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>REJECT</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Reviewer Audit Notes *
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record underwriter rationale..."
              className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
              required
            ></textarea>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Record Decision'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ManualReviewPage;
