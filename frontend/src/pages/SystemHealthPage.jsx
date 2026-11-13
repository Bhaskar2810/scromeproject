import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Badge from '../components/common/Badge';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import StatCard from '../components/common/StatCard';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Server,
  Database,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Clock,
  Zap,
  Flame
} from 'lucide-react';

const SystemHealthPage = () => {
  const [health, setHealth] = useState(null);
  const [dependencies, setDependencies] = useState(null);
  const [loading, setLoading] = useState(true);

  // Chaos controls
  const [forceMode, setForceMode] = useState('');
  const [failureRate, setFailureRate] = useState(0);
  const [timeoutMs, setTimeoutMs] = useState(3000);
  const [savingChaos, setSavingChaos] = useState(false);

  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'admin';

  const fetchStatus = async () => {
    try {
      const [hRes, dRes] = await Promise.all([
        api.get('/health'),
        api.get('/dependencies/status')
      ]);
      setHealth(hRes.data.data);
      setDependencies(dRes.data.data);

      const chaos = dRes.data.data?.service || {};
      setForceMode(chaos.forceMode || '');
      setFailureRate(Math.round((chaos.failureRate || 0) * 100));
      setTimeoutMs(chaos.timeoutMs || 3000);
    } catch (err) {
      console.error('Failed to load system health:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSaveChaos = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Only administrators can configure chaos testing');
      return;
    }

    setSavingChaos(true);
    try {
      await api.post('/dependencies/chaos', {
        forceMode: forceMode || null,
        failureRate: failureRate / 100,
        timeoutMs: Number(timeoutMs)
      });
      toast.success('Chaos engineering configuration applied live');
      fetchStatus();
    } catch (err) {
      toast.error('Failed to update chaos simulation');
    } finally {
      setSavingChaos(false);
    }
  };

  if (loading) return <LoadingSkeleton rows={10} />;

  const metrics = dependencies?.metrics || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">System Health & Dependency Resilience</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor real-time infrastructure status, database connectivity, and test external chaos fault injection
          </p>
        </div>
        <button
          onClick={fetchStatus}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs self-start sm:self-auto"
        >
          <RotateCw className="w-4 h-4" />
          <span>Refresh System Metrics</span>
        </button>
      </div>

      {/* Infrastructure KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">System State</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {health?.status || 'HEALTHY'}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Server className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2 font-mono">Uptime: {health?.system?.uptimeSeconds}s</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">MongoDB Database</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1 capitalize">
                {health?.database?.status || 'connected'}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Database className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2 font-mono">Database: {health?.database?.name || 'decision_sys'}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bureau Calls</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{metrics.totalCalls ?? 0}</h3>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <Activity className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2 font-mono">Success Rate: {metrics.successRate}%</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Node Memory</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{health?.system?.memoryUsageMb} MB</h3>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 text-slate-600 border border-slate-200">
              <Zap className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2 font-mono">Node {health?.system?.nodeVersion}</p>
        </div>
      </div>

      {/* External Service Chaos Injection Control Panel */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Simulated External Service Fault Injection (Chaos Mode)
            </h3>
            <p className="text-xs text-slate-500">
              Target: <span className="font-bold text-slate-700">CreditVerificationBureau</span> (/api/v1/credit-check)
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveChaos} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Forced Mode Buttons */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Operational Fault Mode
              </label>
              <div className="space-y-2">
                {[
                  { key: '', label: 'Normal / Probabilistic Failure' },
                  { key: 'SUCCESS', label: 'Force Always Success (200 OK)' },
                  { key: 'INTERMITTENT', label: 'Intermittent Fail -> Retry Success' },
                  { key: 'FAIL', label: 'Force Service Outage (HTTP 503)' },
                  { key: 'TIMEOUT', label: 'Force Gateway Timeout (HTTP 504)' }
                ].map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setForceMode(m.key)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      forceMode === m.key
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-200'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Failure Rate Slider */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Failure Rate Probability: <span className="text-indigo-600 font-mono font-bold">{failureRate}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={failureRate}
                disabled={forceMode !== ''}
                onChange={(e) => setFailureRate(Number(e.target.value))}
                className="w-full accent-indigo-600 disabled:opacity-30 cursor-pointer"
              />
              <p className="text-xs text-slate-500 mt-2">
                When active, incoming requests will randomly encounter upstream failures with exponential backoff retries.
              </p>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Timeout Threshold (ms)
                </label>
                <input
                  type="number"
                  value={timeoutMs}
                  onChange={(e) => setTimeoutMs(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono"
                />
              </div>
            </div>

            {/* Live Status Summary */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Active Simulator Profile
                </span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Simulated Service:</span>
                    <span className="font-bold font-mono text-slate-900">CreditBureau</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Current Mode:</span>
                    <span className="font-bold text-indigo-600 font-mono">{forceMode || 'PROBABILISTIC'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Invocations:</span>
                    <span className="font-bold text-slate-900">{dependencies?.service?.totalCalls || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Successful Calls:</span>
                    <span className="font-bold text-emerald-600">{metrics.successfulCalls ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Failed / Retried:</span>
                    <span className="font-bold text-rose-600">{metrics.failedCalls ?? 0}</span>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <button
                  type="submit"
                  disabled={savingChaos}
                  className="w-full mt-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  {savingChaos ? 'Applying...' : 'Apply Live Chaos Configuration'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Recent Dependency Invocations Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Recent External Bureau Gateway Logs
          </h3>
          <span className="text-xs text-slate-400 font-semibold">Latest 20 Invocations</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <th className="py-3 px-6">Timestamp</th>
                <th className="py-3 px-6">Request ID</th>
                <th className="py-3 px-6">Endpoint</th>
                <th className="py-3 px-6">Attempt</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6">Latency</th>
                <th className="py-3 px-6">Outcome / Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {(dependencies?.recentCalls || []).map((call, idx) => (
                <tr key={call._id || idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-6 font-mono text-slate-400">
                    {new Date(call.createdAt).toLocaleTimeString()}
                  </td>
                  <td className="py-3 px-6 font-mono font-bold text-slate-900">{call.requestId}</td>
                  <td className="py-3 px-6 font-mono text-slate-500">{call.endpoint}</td>
                  <td className="py-3 px-6 font-mono font-semibold">#{call.attemptNumber}</td>
                  <td className="py-3 px-6">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        call.isSuccess
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {call.statusCode || (call.isSuccess ? 200 : 503)}
                    </span>
                  </td>
                  <td className="py-3 px-6 font-mono">{call.durationMs}ms</td>
                  <td className="py-3 px-6 text-slate-600 truncate max-w-xs">
                    {call.errorMessage || (call.isSuccess ? 'Verified by Bureau' : 'Failed')}
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

export default SystemHealthPage;
