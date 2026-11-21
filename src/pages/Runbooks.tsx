import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GlassCard } from '../components/ui/GlassCard';

interface LLMProfile {
  name: string;
  provider: string;
  model: string;
  is_default: boolean;
}

interface ResourceNode {
  id: string;
  name: string;
  type: string;
  provider: string;
  region: string;
}

export function Runbooks() {
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState<string | null>(localStorage.getItem('kt_runbook_gen_status'));
  const [genError, setGenError] = useState<string | null>(sessionStorage.getItem('kt_runbook_gen_error'));
  const [prevErrors, setPrevErrors] = useState<string[]>([]);
  const [runbooks, setRunbooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<LLMProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState('');
  const [resources, setResources] = useState<ResourceNode[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResource, setSelectedResource] = useState<ResourceNode | null>(null);
  const [, setShowResourcePicker] = useState(false);
  const [generateAll, setGenerateAll] = useState(false);
  const [genProgress, setGenProgress] = useState({ current: 0, total: 0 });
  const [showConfirmAll, setShowConfirmAll] = useState(false);
  const [streamContent, setStreamContent] = useState<string>('');
  const [streamProgress, setStreamProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    document.title = 'Runbooks - Zerelio';
    // Load persisted errors from session storage
    const savedErrors = sessionStorage.getItem('kt_runbook_error_history');
    if (savedErrors) {
      try { setPrevErrors(JSON.parse(savedErrors)); } catch {}
    }
    Promise.all([
      fetch('/api/v1/runbooks').then(r => r.json()).then(d => {
        const list = d && Array.isArray(d.data) ? d.data : d && Array.isArray(d) ? d : d && d.runbooks ? d.runbooks : [];
        setRunbooks(list);
      }).catch(() => console.warn("Runbooks: failed to load")),
      fetch('/api/v1/admin/llm/profiles').then(r => r.json()).then(d => {
        const list: LLMProfile[] = d && d.data ? d.data : Array.isArray(d) ? d : [];
        setProfiles(list);
        const def = list.find(p => p.is_default);
        if (def) setSelectedProfile(def.name);
        else if (list.length > 0) setSelectedProfile(list[0].name);
        else setSelectedProfile('');
      }).catch(() => console.warn("Runbooks: profiles unavailable")),
      fetch('/api/v1/graph/export').then(r => r.json()).then(d => {
        const gd = d && d.data ? d.data : d;
        const nodes: ResourceNode[] = (gd.nodes || []).map((n: any) => ({
          id: n.id || n.ID,
          name: n.name || n.Name || n.id,
          type: n.type || n.Type || 'unknown',
          provider: n.provider || n.Provider || '',
          region: n.region || n.Region || '',
        }));
        setResources(nodes);
      }).catch(() => console.warn("Runbooks: resources unavailable")),
    ]).finally(() => setLoading(false));
  }, []);

  // Persist error history to session storage
  useEffect(() => {
    sessionStorage.setItem('kt_runbook_error_history', JSON.stringify(prevErrors));
  }, [prevErrors]);

  const filteredResources = resources.filter(r =>
    !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resourceTypeCounts: Record<string, number> = {};
  resources.forEach(r => { resourceTypeCounts[r.type] = (resourceTypeCounts[r.type] || 0) + 1; });
  const resourceTypes = Object.keys(resourceTypeCounts).sort();
  const [typeFilter, setTypeFilter] = useState('');

  const typedFiltered = typeFilter
    ? filteredResources.filter(r => r.type === typeFilter)
    : filteredResources;

  async function handleGenerate() {
    if (!selectedResource) return;
    setGenerating(true);
    setGenStatus(`Creating runbook for ${selectedResource.name}...`);
    localStorage.setItem('kt_runbook_gen_status', `Creating runbook for ${selectedResource.name}...`);
    setGenError(null);
    setStreamContent('');
    setStreamProgress(0);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (selectedProfile) headers["X-KT-LLM-Profile"] = selectedProfile;
      const res = await fetch("/api/v1/runbooks", {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: selectedResource.name,
          template: "standard",
          resource_ids: [selectedResource.id],
        }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      const data = await res.json();
      const rb = data.runbook || (data.data && data.data.runbook);
      if (!rb) {
        const errMsg = 'Failed to create runbook';
        setGenError(errMsg);
        setPrevErrors(prev => [...prev, errMsg]);
        sessionStorage.setItem('kt_runbook_gen_error', errMsg);
        setGenerating(false);
        return;
      }
      if (rb.content && rb.content.includes('Configure an LLM provider')) {
        const errMsg = 'LLM generation failed. Check your API key and endpoint in Admin settings.';
        setGenError(errMsg);
        setPrevErrors(prev => [...prev, errMsg]);
        sessionStorage.setItem('kt_runbook_gen_error', errMsg);
        setGenerating(false);
        return;
      }

      // Stream content via SSE
      setGenStatus('Generating runbook content...');
      setRunbooks(prev => [rb, ...prev]);
      setExpandedId(rb.id);

      const streamRes = await fetch(`/api/v1/runbooks/${rb.id}/stream`, { signal: controller.signal });
      if (!streamRes.ok || !streamRes.body) {
        // Fallback: use the content from the POST response
        setGenStatus('Generated');
        setGenerating(false);
        return;
      }

      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let totalTokens = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (controller.signal.aborted) { reader.cancel(); return; }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const payload = line.slice(6).trim();
            if (payload === '[DONE]') continue;
            try {
              const parsed = JSON.parse(payload);
              if (parsed.type === 'token' && parsed.content) {
                fullContent += parsed.content;
                totalTokens++;
                setStreamContent(fullContent);
                // Show indeterminate pulse during streaming - real progress from backend
                if (totalTokens <= 5) setStreamProgress(0.1);
              } else if (parsed.type === 'done') {
                setStreamProgress(1);
              }
            } catch {}
          }
        }
      }

      // Update the runbook in the list with the streamed content
      setRunbooks(prev => prev.map(r => r.id === rb.id ? { ...r, content: fullContent || r.content } : r));
      setGenStatus('Generation complete');
      setStreamProgress(1);
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.warn("Runbooks: generate failed", e);
      const errMsg = 'Connection failed: ' + (e.message || 'unable to reach server');
      setGenError(errMsg);
      setPrevErrors(prev => [...prev, errMsg]);
      sessionStorage.setItem('kt_runbook_gen_error', errMsg);
    }
    finally {
      localStorage.removeItem('kt_runbook_gen_status');
      setGenStatus(null);
      setGenerating(false);
      abortRef.current = null;
    }
  }

  async function handleGenerateAll() {
    setGenerating(true);
    setGenerateAll(true);
    setGenError(null);
    setGenStatus(`Generating runbooks for ${resources.length} resources...`);
    setGenProgress({ current: 0, total: resources.length });

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (selectedProfile) headers["X-KT-LLM-Profile"] = selectedProfile;

    let completed = 0;
    let errors = 0;

    for (const resource of resources) {
      setGenStatus(`Generating (${completed + 1}/${resources.length}): ${resource.name}...`);
      setGenProgress({ current: completed + errors, total: resources.length });
      try {
        const res = await fetch("/api/v1/runbooks", {
          method: "POST",
          headers,
          body: JSON.stringify({
            title: resource.name,
            template: "standard",
            resource_ids: [resource.id],
          }),
        });
        const data = await res.json();
        const rb = data.runbook || (data.data && data.data.runbook);
        if (rb && rb.content && !rb.content.includes('Configure an LLM provider')) {
          setRunbooks(prev => [rb, ...prev]);
          completed++;
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    }

    setGenerating(false);
    setGenerateAll(false);
    setGenStatus(`Generated ${completed}/${resources.length} runbooks (${errors} failed)`);
    if (errors > 0) {
      setGenError(`${errors} resources failed. Check your LLM configuration.`);
    }
  }

  const providerColor = (p: string) => {
    const colors: Record<string, string> = { aws: '#ff9900', azure: '#0078d4', gcp: '#4285f4', kubernetes: '#326ce5', github: '#6e5494', grafana: '#f46800', prometheus: '#e6522c', cloudflare: '#f38020', datadog: '#632ca6', default: '#6c5ce7' };
    return colors[p.toLowerCase()] || colors.default;
  };

  if (loading) {
    return (
      <div className="p-8 space-y-4 animate-fade">
        {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-[hsl(var(--card))] animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-fade animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Runbooks</h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-1">Per-resource operational runbooks ({resources.length} resources)</p>
        </div>
        <div className="flex items-center gap-3">
          {profiles.length > 1 && (
            <select value={selectedProfile} onChange={e => setSelectedProfile(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))]">
              {profiles.map(p => (
                <option key={p.name} value={p.name}>{p.name} ({p.model})</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {genStatus && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6c5ce7]/10 border border-[#6c5ce7]/25 text-sm text-[#6c5ce7]">
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>{genStatus}</span>
          <span className="ml-auto text-[11px] text-[#8b8b8e]">This status persists even if you navigate away</span>
        </div>
      )}

      {/* Resource selector */}
      <div className="rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-[#5c5c5e] mb-2 block">Resource</label>
        {selectedResource ? (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: providerColor(selectedResource.provider) }} />
              <span className="text-sm font-medium">{selectedResource.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#6c5ce7]/10 text-[#6c5ce7]">{selectedResource.type}</span>
              <span className="text-xs text-[#5c5c5e]">{selectedResource.provider}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={handleGenerate} disabled={generating || !selectedResource}
                className="px-4 py-1.5 bg-[#6c5ce7] hover:bg-[#5a4bd1] disabled:opacity-50 text-white rounded-lg text-xs font-medium">
                {generating && !generateAll ? 'Generating...' : 'Generate'}
              </button>
              <button onClick={() => { setSelectedResource(null); setShowResourcePicker(true); }}
                className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                Change
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Search bar */}
            <div className="flex gap-2">
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search resources..." autoFocus
                className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none" style={{ background: 'hsl(var(--input))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm" style={{ background: 'hsl(var(--input))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                <option value="">All types</option>
                {resourceTypes.map(t => <option key={t} value={t}>{t} ({resourceTypeCounts[t]})</option>)}
              </select>
            </div>
            {/* Resource list */}
            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {typedFiltered.length === 0 ? (
                <p className="text-sm text-[#5c5c5e] py-4 text-center">No resources match your search</p>
              ) : typedFiltered.map(r => (
                <button key={r.id} onClick={() => { setSelectedResource(r); setShowResourcePicker(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-left hover:bg-[hsl(var(--border))] transition-all">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: providerColor(r.provider) }} />
                  <span className="truncate flex-1">{r.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#6c5ce7]/10 text-[#6c5ce7] shrink-0">{r.type}</span>
                  <span className="text-[10px] text-[#5c5c5e] shrink-0">{r.provider}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Generate All button */}
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => { if (generating || resources.length === 0) return; if (resources.length > 5) { setShowConfirmAll(true); } else { handleGenerateAll(); } }} disabled={generating || resources.length === 0}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
              style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
              {generating && generateAll ? `Generating ${genProgress.current}/${genProgress.total}...` : `Generate All (${resources.length})`}
            </button>
            {generateAll && (
              <div className="flex-1">
                <div className="h-2 rounded-full bg-[hsl(var(--border))] overflow-hidden">
                  <div className="h-full rounded-full bg-[#6c5ce7] transition-all duration-300"
                    style={{ width: genProgress.total > 0 ? `${(genProgress.current / genProgress.total) * 100}%` : '0%' }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Persistent error history */}
      {prevErrors.length > 0 && !generating && (
        <div className="space-y-2">
          {prevErrors.map((err, i) => (
            <div key={i} className="flex items-start gap-2 px-4 py-2.5 rounded-xl border text-sm" style={{ background: 'hsl(0,85%,60%,0.1)', borderColor: 'hsl(0,85%,60%,0.3)' }}>
              <span className="text-[#ff4757] font-medium shrink-0">Error:</span>
              <span className="flex-1 text-[hsl(var(--foreground))]">{err}</span>
              <button onClick={() => setPrevErrors(prev => prev.filter((_, j) => j !== i))} className="text-[10px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] shrink-0">Dismiss</button>
            </div>
          ))}
        </div>
      )}

      {/* Generation progress */}
      {(generating || genStatus) && (
        <div className="rounded-xl p-4 border text-sm bg-[hsl(var(--card))] border-[hsl(var(--border))]">
          {generating ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border-2 border-[#6c5ce7] border-t-transparent animate-spin" />
                <span className="text-[hsl(var(--foreground))]">{genStatus || 'Generating...'}</span>
                <button
                  onClick={() => { abortRef.current?.abort(); setGenerating(false); setGenStatus(null); }}
                  className="ml-auto text-xs px-2.5 py-1 rounded-lg font-medium"
                  style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>
                  Cancel
                </button>
              </div>
              {!generateAll && (
                <div className="h-1.5 rounded-full bg-[hsl(var(--border))] overflow-hidden">
                  <div className="h-full rounded-full bg-[#6c5ce7] transition-all duration-500 ease-out"
                    style={{ width: `${Math.max(streamProgress * 100, 5)}%` }} />
                </div>
              )}
              {streamContent && (
                <div className="max-h-48 overflow-y-auto rounded-lg bg-[hsl(var(--background))] p-3 text-xs leading-relaxed text-[hsl(var(--muted-foreground))] font-mono">
                  {streamContent}
                </div>
              )}
            </div>
          ) : genStatus ? (
            <div className="flex items-center gap-2">
              <span className="text-[#2ed573] shrink-0">✓</span>
              <span className="text-[hsl(var(--foreground))]">{genStatus}</span>
            </div>
          ) : null}
        </div>
      )}

      {/* Generation error (current) */}
      {genError && !generating && (
        <div className="rounded-xl p-4 border text-sm" style={{ background: 'hsl(0,85%,60%,0.1)', borderColor: 'hsl(0,85%,60%,0.3)' }}>
          <div className="flex items-start gap-2">
            <span className="text-[#ff4757] font-medium shrink-0">Error:</span>
            <span className="flex-1 text-[hsl(var(--foreground))]">{genError}</span>
            <button onClick={() => { setGenError(null); sessionStorage.removeItem('kt_runbook_gen_error'); }} className="text-[10px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] shrink-0">Dismiss</button>
          </div>
        </div>
      )}

      {/* Runbook list */}
      <div className="space-y-3">
        {runbooks.length === 0 ? (
          <div className="rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-12 text-center">
            <h3 className="font-medium mb-2">No runbooks yet</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Select a resource above and generate a runbook.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(() => {
            const providers = resources.map(r => r.provider).filter((p, i, a) => p && a.indexOf(p) === i).sort();
            return [...providers, ''];
          })().map(cat => {
              const catRbs = runbooks.filter(rb => {
                const p = (rb.resource_ids && rb.resource_ids[0] && resources.find(r => r.id === rb.resource_ids[0])?.provider || '').toLowerCase();
                return cat ? p.startsWith(cat) : !p;
              });
              if (catRbs.length === 0) return null;
              return (
                <div key={cat}>
                  {cat && <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5c5c5e] mb-1.5 px-1">{cat}</h3>}
                  <div className="space-y-2">
                    {catRbs.map((rb: any) => {
                      const resId = rb.resource_ids && rb.resource_ids[0];
                      const res = resources.find(r => r.id === resId);
                      const isStreaming = expandedId === rb.id && generating && !generateAll;
                      const displayContent = isStreaming && streamContent ? streamContent : rb.content;
                      return (
                        <div key={rb.id}>
                          <GlassCard className="!p-0 cursor-pointer overflow-hidden hover:border-[#6c5ce7]/30 transition-all"
                            onClick={() => setExpandedId(expandedId === rb.id ? null : rb.id)}>
                            <div className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {res && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: providerColor(res.provider) }} />}
                                <div>
                                  <h3 className="font-medium text-sm">{rb.title || rb.service_name || 'Untitled Runbook'}</h3>
                                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#5c5c5e]">
                                    {res && <span>{res.type}</span>}
                                    {res && <span>·</span>}
                                    <span>{displayContent ? `${displayContent.length.toLocaleString()} chars` : 'no content'}</span>
                                    {isStreaming && <span className="text-[#6c5ce7] animate-pulse">streaming...</span>}
                                  </div>
                                </div>
                              </div>
                              <span className="text-xs text-[#5c5c5e]">{expandedId === rb.id ? '▲' : '▼'}</span>
                            </div>
                          </GlassCard>
                          {expandedId === rb.id && (
                            <div className="mx-4 px-4 py-3 rounded-b-xl bg-[hsl(var(--background))] border-x border-b border-[hsl(var(--border))] max-h-[70vh] overflow-auto">
                              <div className="text-sm leading-relaxed">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}
                                  components={{
                                    h1: ({children}) => <h1 className="text-base font-bold mb-2 mt-4 text-[hsl(var(--foreground))]">{children}</h1>,
                                    h2: ({children}) => <h2 className="text-sm font-bold mb-1.5 mt-3 text-[hsl(var(--foreground))]">{children}</h2>,
                                    h3: ({children}) => <h3 className="text-xs font-bold mb-1 mt-2 text-[hsl(var(--foreground))]">{children}</h3>,
                                    p: ({children}) => <p className="mb-2 text-[hsl(var(--muted-foreground))]">{children}</p>,
                                    ul: ({children}) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
                                    ol: ({children}) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
                                    li: ({children}) => <li className="text-[hsl(var(--muted-foreground))]">{children}</li>,
                                    code: ({children}) => <code className="text-[10px] bg-[hsl(var(--muted))] px-1 py-0.5 rounded">{children}</code>,
                                    pre: ({children}) => <pre className="text-[10px] bg-[hsl(var(--muted))] p-2 rounded-lg mb-2 overflow-x-auto">{children}</pre>,
                                    table: ({children}) => <table className="w-full text-xs mb-2 border-collapse">{children}</table>,
                                    th: ({children}) => <th className="border border-[hsl(var(--border))] px-2 py-1 text-left font-semibold">{children}</th>,
                                    td: ({children}) => <td className="border border-[hsl(var(--border))] px-2 py-1">{children}</td>,
                                    strong: ({children}) => <strong className="font-semibold text-[hsl(var(--foreground))]">{children}</strong>,
                                    a: ({href, children}) => <a href={href} className="text-[#6c5ce7] underline" target="_blank" rel="noreferrer">{children}</a>,
                                  }}>
                                  {displayContent || '*No content*'}
                                </ReactMarkdown>
                                {isStreaming && (
                                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[hsl(var(--border))]">
                                    <div className="w-3 h-3 rounded-full border-2 border-[#6c5ce7] border-t-transparent animate-spin" />
                                    <span className="text-[10px] text-[#6c5ce7]">Generating...</span>
                                    <div className="flex-1 h-1 rounded-full bg-[hsl(var(--border))] overflow-hidden ml-2">
                                      <div className="h-full rounded-full bg-[#6c5ce7] transition-all duration-500 ease-out"
                                        style={{ width: `${Math.max(streamProgress * 100, 5)}%` }} />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Generate All confirmation dialog */}
      {showConfirmAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowConfirmAll(false)}>
          <div className="w-96 rounded-xl border shadow-2xl p-6 space-y-4" style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold">Generate All Runbooks</h3>
            <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>This will generate runbooks for all {resources.length} discovered resources. This may use a significant amount of LLM tokens.</p>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setShowConfirmAll(false)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}>Cancel</button>
              <button onClick={() => { setShowConfirmAll(false); handleGenerateAll(); }} className="px-4 py-2 bg-[#6c5ce7] hover:bg-[#5a4bd1] text-white rounded-lg text-sm font-medium">Generate {resources.length} Runbooks</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
