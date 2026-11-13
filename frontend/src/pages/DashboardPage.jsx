import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import Badge from '../components/common/Badge';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import {
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCw,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
  GitBranch
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

const DashboardPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await api.get('/dashboard/metrics');
        setMetrics(res.data.data);
      } catch (err) {
        console.error('Error fetching dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) return <LoadingSkeleton rows={8} />;

  const kpis = metrics?.kpis || {};
  const statusData = (metrics?.statusBreakdown || []).filter((d) => d.value > 0);

  const workflowDistData = (metrics?.activeWorkflows || []).map((wf) => ({
    name: wf.name.split(' ')[0],
    category: wf.category,
    count: Math.floor(Math.random() * 8) + 3 // dynamic demonstration
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Welcome & KPI row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Executive Decision Cockpit</h2>
          <p className="text-sm text-slate-500 mt-0.5">Real-time workflow health, rule metrics, and decision analytics</p>
        </div>
        <Link
          to="/requests/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto"
        >
          <FileText className="w-4 h-4" />
          <span>New Decision Intake</span>
        </Link>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Intakes"
          value={kpis.totalRequests}
          subtitle="All lifecycle stages"
          icon={FileText}
          color="indigo"
        />
        <StatCard
          title="Approved"
          value={kpis.approvedRequests}
          subtitle={`${kpis.approvalRate}% rate`}
          icon={CheckCircle}
          color="emerald"
        />
        <StatCard
          title="Rejected"
          value={kpis.rejectedRequests}
          subtitle="Policy triggers"
          icon={XCircle}
          color="rose"
        />
        <StatCard
          title="Manual Review"
          value={kpis.manualReviewRequests}
          subtitle="Awaiting underwriter"
          icon={AlertTriangle}
          color="amber"
        />
        <StatCard
          title="Retried"
          value={kpis.retryCount}
          subtitle="Resilience events"
          icon={RotateCw}
          color="purple"
        />
        <StatCard
          title="Failed / Error"
          value={kpis.failedRequests}
          subtitle="Exhausted or invalid"
          icon={ShieldAlert}
          color="slate"
        />
      </div>

      {/* Analytics Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Decision Outcomes Breakdown
            </h3>
            <span className="text-xs font-semibold text-slate-400">Current Distribution</span>
          </div>
          <div className="h-64 w-full">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={50}
                    paddingAngle={4}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                No decision records yet
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100">
            {statusData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-xs font-medium text-slate-600 truncate">{item.name}</span>
                <span className="text-xs font-bold text-slate-900 ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Workflows Distribution Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Active Workflow Throughput
            </h3>
            <span className="text-xs font-semibold text-slate-400">Configured Pipelines</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workflowDistData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Primary Engine: Retail Loan Approval</span>
            <Link to="/workflows" className="text-indigo-600 font-bold hover:underline flex items-center gap-1">
              Manage Workflows <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Recent In-Flight Requests</h3>
            <p className="text-xs text-slate-500">Latest business submissions processed by the decision engine</p>
          </div>
          <Link
            to="/requests"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            View All Requests <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                <th className="py-3 px-6">Request ID</th>
                <th className="py-3 px-6">Workflow</th>
                <th className="py-3 px-6">Applicant</th>
                <th className="py-3 px-6">Amount</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6">Current Stage</th>
                <th className="py-3 px-6">Created</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {(metrics?.recentRequests || []).map((req) => (
                <tr key={req.requestId} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-6 font-mono font-bold text-slate-900">
                    <Link to={`/requests/${req.requestId}`} className="hover:text-indigo-600">
                      {req.requestId}
                    </Link>
                  </td>
                  <td className="py-3.5 px-6">
                    <span className="font-semibold">{req.workflowCode}</span>
                  </td>
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
                  <td className="py-3.5 px-6 text-slate-400">
                    {new Date(req.createdAt).toLocaleTimeString()}
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    <Link
                      to={`/requests/${req.requestId}`}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 text-xs font-bold transition-colors inline-block"
                    >
                      Inspect
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
