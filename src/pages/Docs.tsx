import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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

const TEMPLATES = ['architecture', 'runbook', 'full'] as const;
type TemplateType = typeof TEMPLATES[number];

export function Docs() {
  const [docs, setDocs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(sessionStorage.getItem('zerelio_doc_gen_error'));
  const [genStatus, setGenStatus] = useState<string | null>(localStorage.getItem('zerelio_doc_gen_status'));

  // Selectors
  const [profiles, setProfiles] = useState<LLMProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState('');
  const [resources, setResources] = useState<ResourceNode[]>([]);
  const [resourceSearch, setResourceSearch] = useState('');
  const [selectedResourceIds, setSelectedResourceIds] = useState<Set<string>>(new Set());
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('architecture');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');
  const [filterDocType, setFilterDocType] = useState('');
  const [docTitle, setDocTitle] = useState('');

  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = 'Documentation - Zerelio';
    loadDocs();
    fetchProfilesAndResources();
  }, []);

  function loadDocs() {
    setLoading(true);
    fetch('/api/v1/docs')
      .then(r => r.json())
      .then(d => setDocs(d && Array.isArray(d.data) ? d.data : d && Array.isArray(d.docs) ? d.docs : d && Array.isArray(d) ? d : []))
      .catch(() => console.warn("Docs: failed to load doc list"))
      .finally(() => setLoading(false));
  }

  function fetchProfilesAndResources() {
    Promise.all([
      fetch('/api/v1/admin/llm/profiles').then(r => r.json()).then(d => {
        const list: LLMProfile[] = d && d.data ? d.data : Array.isArray(d) ? d : [];
        setProfiles(list);
        const def = list.find(p => p.is_default);
        if (def) setSelectedProfile(def.name);
        else if (list.length > 0) setSelectedProfile(list[0].name);
      }).catch(() => console.warn("Docs: profiles unavailable")),
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
      }).catch(() => console.warn("Docs: resources unavailable")),
    ]);
  }

  const docTypes = useMemo(() => {
    const types = new Set<string>();
    docs.forEach((d: any) => { if (d.type) types.add(d.type); });
    return Array.from(types).sort();
  }, [docs]);

  const filtered = docs.filter((d: any) => {
    const q = search.toLowerCase();
    if (!(d.title || d.name || '').toLowerCase().includes(q)) return false;
    if (filterDocType && d.type !== filterDocType) return false;
    return true;
  });

  const resourceTypeCounts: Record<string, number> = {};
  resources.forEach(r => { resourceTypeCounts[r.type] = (resourceTypeCounts[r.type] || 0) + 1; });
  const resourceTypes = Object.keys(resourceTypeCounts).sort();

  const filteredResources = resources.filter(r => {
    const matchesSearch = !resourceSearch ||
      r.name.toLowerCase().includes(resourceSearch.toLowerCase()) ||
      r.id.toLowerCase().includes(resourceSearch.toLowerCase()) ||
      r.type.toLowerCase().includes(resourceSearch.toLowerCase());
    const matchesType = !resourceTypeFilter || r.type === resourceTypeFilter;
    return matchesSearch && matchesType;
  });

  function toggleResource(id: string) {
    setSelectedResourceIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem('zerelio_doc_gen_draft', JSON.stringify({
        resourceIds: Array.from(next),
        template: selectedTemplate,
        title: docTitle,
      }));
      return next;
    });
  }

  function handleOpenDialog() {
    setGenError(null);
    // Restore previous state from localStorage
    const saved = localStorage.getItem('zerelio_doc_gen_draft');
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setSelectedResourceIds(new Set(s.resourceIds || []));
        setSelectedTemplate(s.template || 'architecture');
        setDocTitle(s.title || '');
      } catch {}
    } else {
      setSelectedResourceIds(new Set());
      setSelectedTemplate('architecture');
      setDocTitle('');
    }
    setResourceSearch('');
    setResourceTypeFilter('');
    setShowDialog(true);
  }

  function handleCloseDialog() {
    if (generating) return; // don't close while generating
    setShowDialog(false);
    setGenError(null);
    sessionStorage.removeItem('zerelio_doc_gen_error');
  }

  async function handleGenerate() {
    if (selectedResourceIds.size === 0) return;
    setGenerating(true);
    setGenError(null);
    setGenStatus('Generating documentation...');
    localStorage.setItem('zerelio_doc_gen_status', 'Generating...');
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (selectedProfile) headers["X-Zerelio-LLM-Profile"] = selectedProfile;
      const res = await fetch("/api/v1/docs/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: docTitle || (selectedTemplate === 'architecture' ? 'Architecture Documentation' :
                 selectedTemplate === 'runbook' ? 'Runbook' : 'Full Documentation'),
          doc_type: selectedTemplate,
          resources: Array.from(selectedResourceIds),
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `Server error: ${res.status}`);
      }
      const data = await res.json();
      // Refresh docs list to show the new doc(s)
      await loadDocs();
      setShowDialog(false);
      localStorage.removeItem('zerelio_doc_gen_status');
      setGenStatus(null);
      // Navigate to the new doc - backend returns {doc: {...}}
      const newId = data.doc && data.doc.id ? data.doc.id : (data.data && data.data.id && data.data.id) || (data.data && data.data.doc && data.data.doc.id);
      if (newId) navigate(`/docs/${newId}`);
    } catch (e: any) {
      console.warn("Docs: generate failed", e);
      const errMsg = e.message || 'Generation failed';
      setGenError(errMsg);
      sessionStorage.setItem('zerelio_doc_gen_error', errMsg);
    } finally {
      setGenerating(false);
      localStorage.removeItem('zerelio_doc_gen_status');
      setGenStatus(null);
    }
  }

  const providerColor = (p: string) => {
    const colors: Record<string, string> = { aws: '#ff9900', azure: '#0078d4', gcp: '#4285f4', kubernetes: '#326ce5', github: '#6e5494', grafana: '#f46800', prometheus: '#e6522c', cloudflare: '#f38020', datadog: '#632ca6', default: '#6c5ce7' };
    return colors[p.toLowerCase()] || colors.default;
  };

  if (loading) {
    return (
      <div className="p-8 space-y-4 animate-fade">
        <div className="h-10 w-64 rounded-lg bg-[#121214] animate-pulse" />
        {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl bg-[#121214] animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="flex h-full animate-fade">
      {/* Doc list sidebar */}
      <GlassCard className="w-72 !p-4 space-y-3 overflow-auto shrink-0 !rounded-none !border-l-0 !border-t-0 !border-b-0">
        <div className="relative">
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-[#5c5c5e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search docs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-[#121214] border border-[#1a1a1e] rounded-lg text-sm text-[#e1e1e3] placeholder:text-[#5c5c5e] focus:outline-none focus:border-[#6c5ce7]/50 transition-colors"
          />
        </div>

        {/* Type filter */}
        {docTypes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <button onClick={() => setFilterDocType('')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${!filterDocType ? 'bg-[#6c5ce7] text-white' : 'text-[#5c5c5e] hover:text-[#8b8b8e] hover:bg-[#121214]'}`}>
              All
            </button>
            {docTypes.map(t => (
              <button key={t} onClick={() => setFilterDocType(t)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${filterDocType === t ? 'bg-[#6c5ce7] text-white' : 'text-[#5c5c5e] hover:text-[#8b8b8e] hover:bg-[#121214]'}`}>
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-0.5">
          {filtered.map((doc: any) => (
            <button
              key={doc.id || doc.name}
              onClick={() => navigate(`/docs/${doc.id || doc.name}`)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#8b8b8e] hover:text-[#e1e1e3] hover:bg-[#121214] transition-all"
            >
              {doc.title || doc.name || 'Untitled'}
              <span className="block text-[10px] text-[#5c5c5e] mt-0.5">{doc.type || 'doc'}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-[#5c5c5e] px-3 py-8 text-center">
              {search ? 'No docs match your search' : 'No documentation generated yet'}
            </p>
          )}
        </div>
      </GlassCard>

      {/* Content area */}
      <div className="flex-1 flex flex-col p-8">
        {/* Header */}
        <GlassCard className="!p-6 !py-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Documentation</h1>
            <p className="text-sm text-[#8b8b8e] mt-1">Browse and generate documentation from discovered infrastructure</p>
          </div>
          <button onClick={handleOpenDialog}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#6c5ce7] hover:bg-[#5a4bd1] text-white rounded-xl font-medium transition-all text-sm shadow-lg shadow-[#6c5ce7]/20">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Generate
          </button>
        </div>
        {genStatus && (
          <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#6c5ce7]/10 border border-[#6c5ce7]/25 text-sm text-[#6c5ce7]">
            <svg className="w-4 h-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>{genStatus}</span>
            <span className="ml-auto text-[11px] text-[#8b8b8e]">Visible across pages</span>
          </div>
        )}
        </GlassCard>

        {/* Empty state */}
        <GlassCard className="flex-1 flex items-center justify-center !p-0">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6c5ce7]/20 to-[#a29bfe]/10 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-[#6c5ce7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-2">Select a document</h2>
            <p className="text-sm text-[#8b8b8e]">Choose a document from the sidebar or generate new ones from discovered infrastructure.</p>
          </div>
        </GlassCard>
      </div>

      {/* Generate dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={generating ? () => {} : handleCloseDialog}>
          <div ref={dialogRef} className="animate-scale-in w-full max-w-lg mx-4 rounded-xl border shadow-2xl" style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
              <div>
                <h2 className="text-lg font-semibold">Generate Documentation</h2>
                <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>Select resources and a template to generate docs.</p>
              </div>
              <button onClick={handleCloseDialog} disabled={generating}
                className="p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed" style={{background: generating ? 'transparent' : undefined, color: generating ? 'hsl(var(--muted-foreground))' : undefined}}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4 space-y-5">
              {/* Title */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: '#5c5c5e' }}>
                  Title {generating && <span className="text-[#6c5ce7] animate-pulse ml-2">Generating...</span>}
                </label>
                <input type="text" value={docTitle} onChange={e => setDocTitle(e.target.value)}
                  placeholder="Architecture Documentation"
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={{ background: 'hsl(var(--input))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
              </div>

              {/* Resource selector */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: '#5c5c5e' }}>
                  Resources ({selectedResourceIds.size} selected)
                </label>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={resourceSearch} onChange={e => setResourceSearch(e.target.value)}
                    placeholder="Search resources..." autoFocus
                    className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none" style={{ background: 'hsl(var(--input))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
                  <select value={resourceTypeFilter} onChange={e => setResourceTypeFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg text-sm" style={{ background: 'hsl(var(--input))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                    <option value="">All types</option>
                    {resourceTypes.map(t => <option key={t} value={t}>{t} ({resourceTypeCounts[t]})</option>)}
                  </select>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-0.5 rounded-lg border p-1" style={{ borderColor: 'hsl(var(--border))' }}>
                  {filteredResources.length === 0 ? (
                    <p className="text-sm text-center py-4" style={{ color: '#5c5c5e' }}>No resources match</p>
                  ) : filteredResources.map(r => (
                    <label key={r.id}
                      className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm cursor-pointer hover:bg-[hsl(var(--border))] transition-all">
                      <input type="checkbox" checked={selectedResourceIds.has(r.id)} onChange={() => toggleResource(r.id)}
                        className="rounded border-[#5c5c5e] text-[#6c5ce7] focus:ring-[#6c5ce7] focus:ring-offset-0"
                        style={{ accentColor: '#6c5ce7' }} />
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: providerColor(r.provider) }} />
                      <span className="truncate flex-1">{r.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0" style={{ background: '#6c5ce710', color: '#6c5ce7' }}>{r.type}</span>
                      <span className="text-[10px] shrink-0" style={{ color: '#5c5c5e' }}>{r.provider}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Template selector */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: '#5c5c5e' }}>Template</label>
                <div className="flex gap-2">
                  {TEMPLATES.map(t => (
                    <button key={t} onClick={() => setSelectedTemplate(t)}
                      className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                        selectedTemplate === t
                          ? 'bg-[#6c5ce7] text-white border-[#6c5ce7]'
                          : 'hover:bg-[hsl(var(--border))]'
                      }`}
                      style={selectedTemplate !== t ? { background: 'hsl(var(--secondary))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' } : undefined}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* LLM Profile selector */}
              {profiles.length > 0 && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: '#5c5c5e' }}>LLM Profile</label>
                  <select value={selectedProfile} onChange={e => setSelectedProfile(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: 'hsl(var(--input))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                    {profiles.map(p => (
                      <option key={p.name} value={p.name}>{p.name} ({p.provider}/{p.model})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Error */}
              {genError && (
                <div className="rounded-lg p-3 text-sm" style={{ background: 'hsl(0,85%,60%,0.1)', border: '1px solid hsl(0,85%,60%,0.3)' }}>
                  <div className="flex items-start gap-2">
                    <span className="text-[#ff4757] font-medium shrink-0">Error:</span>
                    <span className="text-[hsl(var(--foreground))]">{genError}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-2">
              {generating ? (
                <div className="flex items-center gap-2 text-sm" style={{color: 'hsl(var(--muted-foreground))'}}>
                  <div className="w-4 h-4 rounded-full border-2 border-[#6c5ce7]/30 border-t-[#6c5ce7] animate-spin" />
                  Generating documentation... This may take a minute.
                </div>
              ) : (
                <>
                  <button onClick={handleCloseDialog}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                    Cancel
                  </button>
                  <button onClick={handleGenerate} disabled={selectedResourceIds.size === 0}
                    className="flex items-center gap-2 px-5 py-2 bg-[#6c5ce7] hover:bg-[#5a4bd1] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                    </svg>
                    Generate
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
