import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import { History, Filter, ChevronLeft, ChevronRight, Eye, RefreshCw, FileText } from 'lucide-react';

const AuditTrailPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [selectedLog, setSelectedLog] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit', {
        params: {
          page,
          limit: 25,
          eventType: eventTypeFilter || undefined,
          stage: stageFilter || undefined
        }
      });
      setLogs(res.data.data || []);
      setPagination(res.data.meta || { total: 0, pages: 1 });
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, eventTypeFilter, stageFilter]);

  const viewDetails = (log) => {
    setSelectedLog(log);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">System Audit Trail</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Append-only chronological audit log of all decision system operations, transitions, and calls
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Audit Trail</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <select
          value={eventTypeFilter}
          onChange={(e) => {
            setEventTypeFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Event Types</option>
          <option value="REQUEST_CREATED">REQUEST_CREATED</option>
          <option value="INPUT_VALIDATED">INPUT_VALIDATED</option>
          <option value="STAGE_TRANSITION">STAGE_TRANSITION</option>
          <option value="RULES_EVALUATION_COMPLETED">RULES_EVALUATION_COMPLETED</option>
          <option value="EXTERNAL_CALL_SUCCESS">EXTERNAL_CALL_SUCCESS</option>
          <option value="EXTERNAL_CALL_FAILED">EXTERNAL_CALL_FAILED</option>
          <option value="RETRY_SCHEDULED">RETRY_SCHEDULED</option>
          <option value="MANUAL_REVIEW_SUBMITTED">MANUAL_REVIEW_SUBMITTED</option>
        </select>

        <select
          value={stageFilter}
          onChange={(e) => {
            setStageFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Stages</option>
          <option value="INITIALIZED">INITIALIZED</option>
          <option value="VALIDATION">VALIDATION</option>
          <option value="RULE_EVALUATION">RULE_EVALUATION</option>
          <option value="EXTERNAL_VERIFICATION">EXTERNAL_VERIFICATION</option>
          <option value="MANUAL_REVIEW">MANUAL_REVIEW</option>
          <option value="COMPLETED">COMPLETED</option>
        </select>
      </div>

      {loading ? (
        <LoadingSkeleton rows={12} />
      ) : logs.length === 0 ? (
        <EmptyState title="No audit logs recorded for this criteria" />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-6">Timestamp</th>
                  <th className="py-3.5 px-6">Request ID</th>
                  <th className="py-3.5 px-6">Event Type</th>
                  <th className="py-3.5 px-6">Stage</th>
                  <th className="py-3.5 px-6">Actor</th>
                  <th className="py-3.5 px-6">Role</th>
                  <th className="py-3.5 px-6 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-6 font-mono text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3.5 px-6 font-mono font-bold text-slate-900">
                      <Link to={`/requests/${log.requestId}`} className="hover:text-indigo-600">
                        {log.requestId}
                      </Link>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="font-semibold text-slate-800">
                        {log.eventType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-slate-500 font-semibold">{log.stage}</td>
                    <td className="py-3.5 px-6 font-bold text-indigo-600">{log.actor}</td>
                    <td className="py-3.5 px-6 text-slate-400 capitalize">{log.actorRole}</td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => viewDetails(log)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 text-xs font-semibold"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <span className="font-bold text-slate-900">{logs.length}</span> of{' '}
              <span className="font-bold text-slate-900">{pagination.total}</span> logs
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-slate-700">
                Page {page} of {pagination.pages || 1}
              </span>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Audit Event: ${selectedLog?.eventType}`}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500 font-medium">Request ID:</span>{' '}
              <span className="font-mono font-bold text-slate-900">{selectedLog?.requestId}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Stage:</span>{' '}
              <span className="font-bold text-slate-900">{selectedLog?.stage}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Actor:</span>{' '}
              <span className="font-bold text-indigo-600">{selectedLog?.actor}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Timestamp:</span>{' '}
              <span className="font-mono text-slate-600">
                {new Date(selectedLog?.timestamp).toISOString()}
              </span>
            </div>
          </div>

          <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-80">
            <pre>{JSON.stringify(selectedLog?.details, null, 2)}</pre>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AuditTrailPage;
