import { useState, useEffect, useCallback } from 'react';

interface Policy {
  id: string;
  name: string;
  description: string;
  framework: string;
  severity: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface EvidenceRecord {
  id: string;
  name: string;
  description: string;
  evidence_type: string;
  file_size: number;
  content_hash: string;
  resource_count: number;
  audit_count: number;
  created_by: string;
  created_at: string;
}

interface FrameworkCoverage {
  framework: string;
  total_controls: number;
  passing: number;
  failing: number;
  score: number;
}

function cardStyle(): React.CSSProperties {
  return { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' };
}

function inputStyle(): React.CSSProperties {
  return { background: 'hsl(var(--input))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' };
}

export function Compliance() {
  const [tab, setTab] = useState<'dashboard' | 'policies' | 'evidence'>('dashboard');
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [coverage, setCoverage] = useState<FrameworkCoverage[]>([]);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [evaluting, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<string>('');
  const [creatingEvidence, setCreatingEvidence] = useState(false);
  const [newPolicy, setNewPolicy] = useState({ name: '', description: '', framework: 'custom', severity: 'medium', rego_source: '' });

  const fetchPolicies = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/admin/compliance/policies');
      const d = await res.json();
      setPolicies((d.data || d).policies || []);
    } catch {}
  }, []);

  const fetchCoverage = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/admin/compliance/summary');
      const d = await res.json();
      setCoverage((d.data || d).summary || []);
    } catch {}
  }, []);

  const fetchEvidence = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/admin/evidence');
      const d = await res.json();
      setEvidence((d.data || d).records || []);
    } catch {}
  }, []);

  useEffect(() => { fetchPolicies(); fetchCoverage(); fetchEvidence(); }, [fetchPolicies, fetchCoverage, fetchEvidence]);

  async function handleEvaluate() {
    setEvaluating(true);
    setEvalResult('');
    try {
      const res = await fetch('/api/v1/admin/compliance/evaluate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const d = await res.json();
      const data = d.data || d;
      if (data.run) setEvalResult(`Run ${(data.run as any).id}: ${(data.run as any).passed} passed, ${(data.run as any).failed} failed, ${(data.run as any).warnings} warnings`);
      fetchPolicies();
      fetchCoverage();
    } catch { setEvalResult('Evaluation failed'); }
    finally { setEvaluating(false); }
  }

  async function handleCreateEvidence() {
    setCreatingEvidence(true);
    try { await fetch('/api/v1/admin/evidence/snapshot', { method: 'POST' }); await fetchEvidence(); } catch {}
    finally { setCreatingEvidence(false); }
  }

  async function handleCreatePolicy() {
    if (!newPolicy.name || !newPolicy.rego_source) return;
    try {
      await fetch('/api/v1/admin/compliance/policies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newPolicy) });
      setNewPolicy({ name: '', description: '', framework: 'custom', severity: 'medium', rego_source: '' });
      await fetchPolicies();
    } catch {}
  }

  async function handleTogglePolicy(id: string, enabled: boolean) {
    try {
      await fetch(`/api/v1/admin/compliance/policies/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !enabled }) });
      await fetchPolicies();
    } catch {}
  }

  const sevColor = (s: string) => s === 'critical' ? '#ff4757' : s === 'high' ? '#ffa502' : s === 'medium' ? '#1e90ff' : '#8b8b8e';
  const sevBg = (s: string) => sevColor(s) + '20';

  return (
    <div className="p-8 animate-fade max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Compliance</h1>
          <p className="text-[#8b8b8e] mt-1">Manage policies, evaluate infrastructure, and collect evidence</p>
        </div>
        <div className="flex gap-2">
          {['dashboard', 'policies', 'evidence'].map((t) => (
            <button key={t} onClick={() => setTab(t as any)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize"
              style={tab === t ? { background: '#6c5ce7', color: '#fff', border: 'none' } : { background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'dashboard' && (
        <>
          {/* Framework coverage cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {coverage.length === 0 ? (
              <div className="col-span-4 rounded-xl p-6 text-center" style={cardStyle()}>
                <p className="text-sm text-[#8b8b8e]">No policies evaluated yet. Run an evaluation to see coverage.</p>
              </div>
            ) : coverage.map((fc) => (
              <div key={fc.framework} className="rounded-xl p-4" style={cardStyle()}>
                <p className="text-xs text-[#8b8b8e] uppercase tracking-wider">{fc.framework === 'soc2' ? 'SOC 2' : fc.framework === 'pcidss' ? 'PCI DSS' : fc.framework === 'iso27001' ? 'ISO 27001' : fc.framework === 'gdpr' ? 'GDPR' : fc.framework}</p>
                <p className="text-2xl font-semibold mt-1">{fc.score}%</p>
                <p className="text-xs text-[#8b8b8e] mt-0.5">{fc.passing}/{fc.total_controls} passing</p>
                <div className="w-full h-1.5 rounded-full bg-[#5c5c5e]/20 mt-2 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${fc.score}%`, background: fc.score >= 80 ? '#2ed573' : fc.score >= 50 ? '#ffa502' : '#ff4757' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="rounded-xl p-4 mb-6" style={cardStyle()}>
            <p className="text-xs text-[#8b8b8e] uppercase tracking-wider mb-3">Actions</p>
            <div className="flex gap-3">
              <button onClick={handleEvaluate} disabled={evaluting}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: '#6c5ce7', color: '#fff', border: 'none' }}>
                {evaluting ? 'Evaluating…' : 'Run Evaluation'}
              </button>
              <button onClick={handleCreateEvidence} disabled={creatingEvidence}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
                {creatingEvidence ? 'Creating…' : 'New Evidence Snapshot'}
              </button>
              <a href="/api/v1/admin/compliance/report" download
                className="px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center"
                style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))', color: 'inherit', textDecoration: 'none' }}>
                Download Report
              </a>
            </div>
            {evalResult && <p className="mt-3 text-xs text-[#2ed573]">{evalResult}</p>}
          </div>
        </>
      )}

      {tab === 'policies' && (
        <>
          {/* New policy form */}
          <div className="rounded-xl p-4 mb-6" style={cardStyle()}>
            <p className="text-xs text-[#8b8b8e] uppercase tracking-wider mb-3">New Policy</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-[#8b8b8e] block mb-1">Name</label>
                <input type="text" value={newPolicy.name} onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })} className="w-full px-2 py-1.5 rounded-lg text-xs" style={inputStyle()} />
              </div>
              <div>
                <label className="text-xs text-[#8b8b8e] block mb-1">Framework</label>
                <select value={newPolicy.framework} onChange={(e) => setNewPolicy({ ...newPolicy, framework: e.target.value })} className="w-full px-2 py-1.5 rounded-lg text-xs" style={inputStyle()}>
                  <option value="custom">Custom</option>
                  <option value="soc2">SOC 2</option>
                  <option value="pcidss">PCI DSS</option>
                  <option value="iso27001">ISO 27001</option>
                  <option value="gdpr">GDPR</option>
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label className="text-xs text-[#8b8b8e] block mb-1">Description</label>
              <input type="text" value={newPolicy.description} onChange={(e) => setNewPolicy({ ...newPolicy, description: e.target.value })} className="w-full px-2 py-1.5 rounded-lg text-xs" style={inputStyle()} />
            </div>
            <div className="mb-3">
              <label className="text-xs text-[#8b8b8e] block mb-1">Rego Source</label>
              <textarea rows={5} value={newPolicy.rego_source} onChange={(e) => setNewPolicy({ ...newPolicy, rego_source: e.target.value })} className="w-full px-2 py-1.5 rounded-lg text-xs font-mono" style={inputStyle()} placeholder="package zerelio.soc2&#10;result[&quot;my_rule&quot;] = { ... }" />
            </div>
            <button onClick={handleCreatePolicy} disabled={!newPolicy.name || !newPolicy.rego_source}
              className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-30"
              style={{ background: '#6c5ce7', color: '#fff', border: 'none' }}>
              Create Policy
            </button>
          </div>

          {/* Policy list */}
          <div className="space-y-2">
            {policies.length === 0 ? (
              <div className="rounded-xl p-6 text-center" style={cardStyle()}>
                <p className="text-sm text-[#8b8b8e]">No policies defined. Create one above or run an evaluation to seed built-in policies.</p>
              </div>
            ) : policies.map((p) => (
              <div key={p.id} className="rounded-xl p-4 flex items-center justify-between" style={cardStyle()}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{p.name}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: sevBg(p.severity), color: sevColor(p.severity) }}>{p.severity}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#5c5c5e]/10 text-[#5c5c5e]">{p.framework}</span>
                  </div>
                  {p.description && <p className="text-xs text-[#8b8b8e] mt-0.5">{p.description}</p>}
                </div>
                <button onClick={() => handleTogglePolicy(p.id, p.enabled)}
                  className="px-3 py-1 rounded-lg text-xs font-medium shrink-0 ml-3"
                  style={{ background: p.enabled ? '#2ed57320' : '#5c5c5e20', color: p.enabled ? '#2ed573' : '#8b8b8e', border: 'none' }}>
                  {p.enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'evidence' && (
        <div className="rounded-xl p-4" style={cardStyle()}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[#8b8b8e] uppercase tracking-wider">Evidence Snapshots</p>
            <button onClick={handleCreateEvidence} disabled={creatingEvidence}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: '#6c5ce7', color: '#fff', border: 'none' }}>
              {creatingEvidence ? 'Creating…' : 'New Snapshot'}
            </button>
          </div>
          {evidence.length === 0 ? (
            <p className="text-xs text-[#8b8b8e] py-8 text-center">No evidence snapshots yet.</p>
          ) : (
            <div className="space-y-2">
              {evidence.map((ev) => (
                <div key={ev.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'hsl(var(--input))' }}>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{ev.name}</p>
                    <p className="text-[10px] text-[#8b8b8e]">{ev.resource_count} resources · {ev.audit_count} audits · {ev.created_by}</p>
                  </div>
                  <a href={`/api/v1/admin/evidence/${ev.id}/download`} className="text-xs text-[#6c5ce7] hover:underline shrink-0 ml-3">Download</a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
