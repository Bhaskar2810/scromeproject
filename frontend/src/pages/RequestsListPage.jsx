import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Badge from '../components/common/Badge';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import { Search, Filter, Plus, ChevronLeft, ChevronRight, Eye, RefreshCw } from 'lucide-react';

const RequestsListPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [workflowFilter, setWorkflowFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 15,
        search: search || undefined,
        status: statusFilter || undefined,
        workflowCode: workflowFilter || undefined
      };
      const res = await api.get('/requests', { params });
      setRequests(res.data.data || []);
      setPagination(res.data.meta || { total: 0, pages: 1 });
    } catch (err) {
      console.error('Error loading requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page, statusFilter, workflowFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRequests();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Business Requests Intake</h2>
          <p className="text-sm text-slate-500 mt-0.5">Explore, search, and monitor all decision requests across pipelines</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchRequests}
            title="Refresh"
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/requests/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Request</span>
          </Link>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Request ID or Applicant Name..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="MANUAL_REVIEW">MANUAL_REVIEW</option>
            <option value="FAILED">FAILED</option>
            <option value="RETRY_PENDING">RETRY_PENDING</option>
            <option value="INITIALIZED">INITIALIZED</option>
          </select>

          <select
            value={workflowFilter}
            onChange={(e) => {
              setWorkflowFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Workflows</option>
            <option value="APPLICATION_APPROVAL">APPLICATION_APPROVAL</option>
            <option value="INSURANCE_CLAIM_PROCESSING">INSURANCE_CLAIM</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      {loading ? (
        <LoadingSkeleton rows={10} />
      ) : requests.length === 0 ? (
        <EmptyState
          title="No requests match your criteria"
          description="Try removing status filters or creating a new request."
          action={
            <Link
              to="/requests/new"
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
            >
              Submit New Request
            </Link>
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-6">Request ID</th>
                  <th className="py-3.5 px-6">Workflow</th>
                  <th className="py-3.5 px-6">Applicant</th>
                  <th className="py-3.5 px-6">Amount</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Current Stage</th>
                  <th className="py-3.5 px-6">Idempotency Key</th>
                  <th className="py-3.5 px-6">Created</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {requests.map((req) => (
                  <tr key={req.requestId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-6 font-mono font-bold text-slate-900">
                      <Link to={`/requests/${req.requestId}`} className="hover:text-indigo-600">
                        {req.requestId}
                      </Link>
                    </td>
                    <td className="py-3.5 px-6 font-semibold">{req.workflowCode}</td>
                    <td className="py-3.5 px-6 font-semibold text-slate-900">
                      {req.payload?.applicantName || 'N/A'}
                    </td>
                    <td className="py-3.5 px-6 font-mono font-semibold">
                      ${Number(req.payload?.amount || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-6">
                      <Badge status={req.status} />
                    </td>
                    <td className="py-3.5 px-6 text-slate-500">{req.currentStage}</td>
                    <td className="py-3.5 px-6 font-mono text-[11px] text-slate-400">
                      {req.idempotencyKey || '—'}
                    </td>
                    <td className="py-3.5 px-6 text-slate-400">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-6 text-right space-x-2">
                      <Link
                        to={`/requests/${req.requestId}`}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 inline-block text-slate-500"
                        title="View details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <span className="font-bold text-slate-900">{requests.length}</span> of{' '}
              <span className="font-bold text-slate-900">{pagination.total}</span> total requests
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
    </div>
  );
};

export default RequestsListPage;
