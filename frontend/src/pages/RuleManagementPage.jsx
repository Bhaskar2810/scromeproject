import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Badge from '../components/common/Badge';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import Modal from '../components/common/Modal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Sliders, Plus, History, ToggleLeft, ToggleRight, ShieldCheck, Edit3 } from 'lucide-react';

const RuleManagementPage = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState('');
  const [versionsModalOpen, setVersionsModalOpen] = useState(false);
  const [activeRuleVersions, setActiveRuleVersions] = useState([]);
  const [selectedRuleCode, setSelectedRuleCode] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New Rule form state
  const [ruleCode, setRuleCode] = useState('');
  const [workflowCode, setWorkflowCode] = useState('APPLICATION_APPROVAL');
  const [name, setName] = useState('');
  const [priority, setPriority] = useState(5);
  const [operator, setOperator] = useState('AND');
  const [field, setField] = useState('amount');
  const [comparison, setComparison] = useState('lte');
  const [conditionValue, setConditionValue] = useState('50000');
  const [actionOutcome, setActionOutcome] = useState('AUTO_APPROVE');
  const [actionReason, setActionReason] = useState('Application meets threshold requirements');

  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'admin';

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await api.get('/rules', {
        params: { workflowCode: selectedWorkflow || undefined }
      });
      setRules(res.data.data || []);
    } catch (err) {
      console.error('Failed to load rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [selectedWorkflow]);

  const handleToggleActivate = async (rule) => {
    if (!isAdmin) {
      toast.error('Only administrators can toggle rule status');
      return;
    }
    try {
      await api.post(`/rules/${rule._id}/activate`, { isActive: !rule.isActive });
      toast.success(`Rule ${rule.ruleCode} ${!rule.isActive ? 'activated' : 'deactivated'}`);
      fetchRules();
    } catch (err) {
      toast.error('Failed to update rule status');
    }
  };

  const viewVersions = async (code) => {
    try {
      setSelectedRuleCode(code);
      const res = await api.get(`/rules/${code}/versions`);
      setActiveRuleVersions(res.data.data || []);
      setVersionsModalOpen(true);
    } catch (err) {
      toast.error('Failed to retrieve rule versions');
    }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ruleCode,
        workflowCode,
        name,
        priority: Number(priority),
        conditions: {
          operator,
          rules: [
            {
              field,
              operator: comparison,
              value: isNaN(conditionValue) ? conditionValue : Number(conditionValue)
            }
          ]
        },
        action: {
          outcome: actionOutcome,
          reason: actionReason
        }
      };

      await api.post('/rules', payload);
      toast.success(`Rule ${ruleCode} created with Version 1`);
      setCreateModalOpen(false);
      setRuleCode('');
      setName('');
      fetchRules();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create rule');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Business Rules Engine</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure threshold rules, priority ordering, operators, and versioned policy criteria
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedWorkflow}
            onChange={(e) => setSelectedWorkflow(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700"
          >
            <option value="">All Workflows</option>
            <option value="APPLICATION_APPROVAL">APPLICATION_APPROVAL</option>
            <option value="INSURANCE_CLAIM_PROCESSING">INSURANCE_CLAIM</option>
          </select>
          {isAdmin && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Rule</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <div
              key={rule._id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-slate-300 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                    Priority {rule.priority}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{rule.name}</h3>
                  <span className="text-xs font-mono text-slate-400">({rule.ruleCode})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-slate-500">v{rule.version || 1}</span>
                  <Badge status={rule.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </div>
              </div>

              <p className="text-xs text-slate-600 mb-3">{rule.description || 'Configured business rule condition'}</p>

              {/* Conditions Box */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-3 text-xs font-mono">
                <div className="text-slate-500 font-semibold mb-1 text-[11px] uppercase tracking-wider">
                  Condition Criteria [{rule.conditions?.operator || 'AND'} Group]
                </div>
                <div className="space-y-1">
                  {(rule.conditions?.rules || []).map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-slate-800">
                      <span className="font-bold text-indigo-700">{c.field}</span>
                      <span className="text-amber-600 font-bold">[{c.operator}]</span>
                      <span className="font-bold">{JSON.stringify(c.value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action & Reason */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-500">Outcome Action:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      rule.action?.outcome === 'AUTO_APPROVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : rule.action?.outcome === 'REJECT'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {rule.action?.outcome}
                  </span>
                  <span className="text-slate-600 italic">"{rule.action?.reason}"</span>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => viewVersions(rule.ruleCode)}
                    className="flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    <History className="w-3.5 h-3.5" /> Versions
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleToggleActivate(rule)}
                      className="flex items-center gap-1 font-bold text-slate-600 hover:text-slate-900"
                    >
                      {rule.isActive ? (
                        <>
                          <ToggleRight className="w-5 h-5 text-emerald-600" /> Deactivate
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-5 h-5 text-slate-400" /> Activate
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Versions Modal */}
      <Modal
        isOpen={versionsModalOpen}
        onClose={() => setVersionsModalOpen(false)}
        title={`Rule Version History: ${selectedRuleCode}`}
      >
        <div className="space-y-3">
          {activeRuleVersions.map((v) => (
            <div key={v.version} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                  Version {v.version}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {new Date(v.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-800 mt-1">{v.changeSummary}</p>
              <div className="mt-2 text-[11px] font-mono bg-white p-2 rounded border border-slate-200">
                Action: {v.action?.outcome} — "{v.action?.reason}"
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Create Rule Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Configurable Business Rule"
      >
        <form onSubmit={handleCreateRule} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Rule Code *
              </label>
              <input
                type="text"
                value={ruleCode}
                onChange={(e) => setRuleCode(e.target.value.toUpperCase())}
                placeholder="e.g. RULE_CREDIT_SCORE_PASS"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Workflow Code *
              </label>
              <input
                type="text"
                value={workflowCode}
                onChange={(e) => setWorkflowCode(e.target.value.toUpperCase())}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Rule Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Auto-approve prime credit score"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Priority (1-100) *
              </label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Condition Configuration
            </span>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Logic Group</label>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs bg-white"
                >
                  <option value="AND">AND</option>
                  <option value="OR">OR</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Field Path</label>
                <input
                  type="text"
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Comparison</label>
                <select
                  value={comparison}
                  onChange={(e) => setComparison(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs bg-white"
                >
                  <option value="lte">&lt;= (Less Equal)</option>
                  <option value="lt">&lt; (Less Than)</option>
                  <option value="gte">&gt;= (Greater Equal)</option>
                  <option value="gt">&gt; (Greater Than)</option>
                  <option value="eq">== (Equal)</option>
                  <option value="ne">!= (Not Equal)</option>
                  <option value="exists">Exists</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Threshold / Value</label>
                <input
                  type="text"
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs font-mono"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Action Outcome *
              </label>
              <select
                value={actionOutcome}
                onChange={(e) => setActionOutcome(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="AUTO_APPROVE">AUTO_APPROVE</option>
                <option value="MANUAL_REVIEW">MANUAL_REVIEW</option>
                <option value="REJECT">REJECT</option>
                <option value="NEXT_STAGE">NEXT_STAGE</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Outcome Explanation *
              </label>
              <input
                type="text"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Reason printed in decision trace"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md"
            >
              Publish Rule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RuleManagementPage;
