import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Send, Key, Sparkles, AlertCircle, ArrowLeft } from 'lucide-react';

const CreateRequestPage = () => {
  const [workflows, setWorkflows] = useState([]);
  const [workflowCode, setWorkflowCode] = useState('APPLICATION_APPROVAL');
  const [applicantName, setApplicantName] = useState('');
  const [amount, setAmount] = useState('');
  const [income, setIncome] = useState('');
  const [taxId, setTaxId] = useState('');
  const [idProof, setIdProof] = useState('DOC-PASSPORT-DEFAULT');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [loading, setLoading] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const res = await api.get('/workflows?isActive=true');
        setWorkflows(res.data.data || []);
      } catch (err) {
        console.error('Failed to load workflows', err);
      }
    };
    fetchWorkflows();
  }, []);

  const generateIdempotencyKey = () => {
    const randomKey = `IDEMP-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    setIdempotencyKey(randomKey);
  };

  const setScenarioPreset = (scenario) => {
    generateIdempotencyKey();
    if (scenario === 'auto-approve') {
      setApplicantName('Eva Green');
      setAmount('35000');
      setIncome('85000');
      setTaxId('111-22-3333');
      setIdProof('DOC-PASSPORT-4412');
    } else if (scenario === 'manual-review') {
      setApplicantName('Liam Neeson');
      setAmount('120000');
      setIncome('95000');
      setTaxId('222-33-4444');
      setIdProof('DOC-DL-9912');
    } else if (scenario === 'auto-reject') {
      setApplicantName('Marcus Vane');
      setAmount('450000');
      setIncome('150000');
      setTaxId('555-66-7777');
      setIdProof('DOC-STATE-ID-01');
    } else if (scenario === 'missing-docs') {
      setApplicantName('Anonymous Traveler');
      setAmount('15000');
      setIncome('40000');
      setTaxId('');
      setIdProof('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!applicantName || !amount) {
      toast.error('Applicant name and Amount are mandatory');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        applicantName,
        amount: Number(amount),
        income: income ? Number(income) : undefined,
        taxId: taxId || undefined,
        documents: {
          idProof: idProof || undefined
        }
      };

      const res = await api.post('/requests', {
        workflowCode,
        idempotencyKey: idempotencyKey || undefined,
        payload
      });

      toast.success(`Request ${res.data.data.requestId} created with status: ${res.data.data.status}`);
      navigate(`/requests/${res.data.data.requestId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate('/requests')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Requests
          </button>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">New Business Request Intake</h2>
          <p className="text-sm text-slate-500">Submit a structured business payload for automated decisioning</p>
        </div>
      </div>

      {/* Quick Preset Buttons */}
      <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2 text-indigo-950 font-bold text-xs uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>Demo Scenario Presets</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setScenarioPreset('auto-approve')}
            className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-xs font-semibold text-indigo-700 hover:bg-indigo-100/50 shadow-2xs"
          >
            Scenario 1: Auto-Approve (≤$50k)
          </button>
          <button
            type="button"
            onClick={() => setScenarioPreset('manual-review')}
            className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-xs font-semibold text-indigo-700 hover:bg-indigo-100/50 shadow-2xs"
          >
            Scenario 3: Manual Review ($120k)
          </button>
          <button
            type="button"
            onClick={() => setScenarioPreset('auto-reject')}
            className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-xs font-semibold text-indigo-700 hover:bg-indigo-100/50 shadow-2xs"
          >
            Scenario 2: Auto-Reject (&gt;$200k)
          </button>
          <button
            type="button"
            onClick={() => setScenarioPreset('missing-docs')}
            className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-xs font-semibold text-indigo-700 hover:bg-indigo-100/50 shadow-2xs"
          >
            Mandatory Doc Check Fail
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Target Workflow *
            </label>
            <select
              value={workflowCode}
              onChange={(e) => setWorkflowCode(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {workflows.map((wf) => (
                <option key={wf.code} value={wf.code}>
                  {wf.name} ({wf.code})
                </option>
              ))}
              <option value="APPLICATION_APPROVAL">Retail Loan & Credit Application (APPLICATION_APPROVAL)</option>
              <option value="INSURANCE_CLAIM_PROCESSING">Automated Insurance Claim (INSURANCE_CLAIM_PROCESSING)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Idempotency Key (Optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={idempotencyKey}
                onChange={(e) => setIdempotencyKey(e.target.value)}
                placeholder="Unique key e.g. IDEMP-12345"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={generateIdempotencyKey}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 whitespace-nowrap"
              >
                Generate
              </button>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
            Business Payload (Application Details)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Applicant Legal Name *
              </label>
              <input
                type="text"
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Requested Amount ($ USD) *
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 45000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Stated Annual Income ($ USD)
              </label>
              <input
                type="number"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                placeholder="e.g. 85000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tax Identifier (SSN / TIN)
              </label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="e.g. 123-45-6789"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Identification Document Reference ID
              </label>
              <input
                type="text"
                value={idProof}
                onChange={(e) => setIdProof(e.target.value)}
                placeholder="e.g. DOC-PASSPORT-4412 (leave empty to trigger doc rejection rule)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => navigate('/requests')}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{loading ? 'Executing Decision Pipeline...' : 'Submit & Execute'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateRequestPage;
