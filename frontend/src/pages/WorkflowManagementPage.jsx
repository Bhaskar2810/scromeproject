import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Badge from '../components/common/Badge';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import Modal from '../components/common/Modal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { GitBranch, Plus, ToggleLeft, ToggleRight, History, Layers, CheckCircle2 } from 'lucide-react';

const WorkflowManagementPage = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [versionsModalOpen, setVersionsModalOpen] = useState(false);
  const [activeWorkflowVersions, setActiveWorkflowVersions] = useState([]);
  const [selectedWorkflowCode, setSelectedWorkflowCode] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New Workflow form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('FINANCE');

  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'admin';

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const res = await api.get('/workflows');
      setWorkflows(res.data.data || []);
    } catch (err) {
      console.error('Failed to load workflows', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleToggleActivate = async (wf) => {
    if (!isAdmin) {
      toast.error('Only administrators can toggle workflow state');
      return;
    }
    try {
      await api.post(`/workflows/${wf._id}/activate`, { isActive: !wf.isActive });
      toast.success(`Workflow ${wf.code} ${!wf.isActive ? 'activated' : 'deactivated'}`);
      fetchWorkflows();
    } catch (err) {
      toast.error('Failed to update workflow state');
    }
  };

  const viewVersions = async (wfCode) => {
    try {
      setSelectedWorkflowCode(wfCode);
      const res = await api.get(`/workflows/${wfCode}/versions`);
      setActiveWorkflowVersions(res.data.data || []);
      setVersionsModalOpen(true);
    } catch (err) {
      toast.error('Failed to retrieve versions');
    }
  };

  const handleCreateWorkflow = async (e) => {
    e.preventDefault();
    try {
      await api.post('/workflows', { code, name, description, category });
      toast.success(`Workflow ${code} created`);
      setCreateModalOpen(false);
      setCode('');
      setName('');
      setDescription('');
      fetchWorkflows();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating workflow');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Workflow Configuration Engine</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage business pipelines, lifecycle stages, and versioned configuration snapshots
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Workflow</span>
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {workflows.map((wf) => (
            <div
              key={wf.code}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                      <GitBranch className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{wf.name}</h3>
                      <span className="font-mono text-xs font-semibold text-slate-500">{wf.code}</span>
                    </div>
                  </div>
                  <Badge status={wf.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </div>

                <p className="text-xs text-slate-600 mb-4">{wf.description || 'No description provided.'}</p>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-4 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Category:</span>
                    <span className="font-bold text-slate-800">{wf.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Current Version:</span>
                    <span className="font-mono font-bold text-indigo-600">v{wf.currentVersion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Stages Configured:</span>
                    <span className="font-bold text-slate-800">{wf.stages?.length || 6} stages</span>
                  </div>
                </div>

                {/* Stages Pills */}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Configured Stages
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(wf.stages || []).map((stg) => (
                      <span
                        key={stg.name}
                        className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-slate-700"
                      >
                        {stg.displayName || stg.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-5 mt-5 border-t border-slate-100">
                <button
                  onClick={() => viewVersions(wf.code)}
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Version Snapshots</span>
                </button>

                {isAdmin && (
                  <button
                    onClick={() => handleToggleActivate(wf)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
                  >
                    {wf.isActive ? (
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
          ))}
        </div>
      )}

      {/* Version History Modal */}
      <Modal
        isOpen={versionsModalOpen}
        onClose={() => setVersionsModalOpen(false)}
        title={`Version Snapshot History: ${selectedWorkflowCode}`}
      >
        <div className="space-y-3">
          {activeWorkflowVersions.map((v) => (
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
              <p className="text-[11px] text-slate-500 mt-0.5">
                Published by {v.publishedBy?.fullName || v.publishedBy?.username || 'System Administrator'}
              </p>
            </div>
          ))}
        </div>
      </Modal>

      {/* Create Workflow Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Configurable Workflow"
      >
        <form onSubmit={handleCreateWorkflow} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Workflow Unique Code *
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. VENDOR_ONBOARDING"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Workflow Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Corporate Vendor Approval"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="FINANCE">FINANCE</option>
              <option value="INSURANCE">INSURANCE</option>
              <option value="HR">HR</option>
              <option value="PROCUREMENT">PROCUREMENT</option>
              <option value="COMPLIANCE">COMPLIANCE</option>
              <option value="GENERAL">GENERAL</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain business criteria and decision scope..."
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
            ></textarea>
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
              Create Workflow
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default WorkflowManagementPage;
