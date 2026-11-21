import { useState, useEffect, useMemo, useCallback } from 'react';

type FacetCounts = {
  types: Record<string, number>;
  providers: Record<string, number>;
  regions: Record<string, number>;
};

export function Resources() {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Facet selections
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);

  // Mobile sidebar toggle
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [bulkTagStatus, setBulkTagStatus] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [bulkDeleteStatus, setBulkDeleteStatus] = useState<string | null>(null);

  // Derive field values from results (handles both camelCase and PascalCase)
  const getField = (r: any, key: string): string => {
    const pascal = key[0].toUpperCase() + key.slice(1);
    return r[key] || r[pascal] || '';
  };

  // Compute facet counts from full loaded resources
  const facetCounts: FacetCounts = useMemo(() => {
    const types: Record<string, number> = {};
    const providers: Record<string, number> = {};
    const regions: Record<string, number> = {};
    for (const r of resources) {
      const t = getField(r, 'type') || 'unknown';
      const p = getField(r, 'provider') || 'unknown';
      const reg = getField(r, 'region') || 'unknown';
      types[t] = (types[t] || 0) + 1;
      providers[p] = (providers[p] || 0) + 1;
      regions[reg] = (regions[reg] || 0) + 1;
    }
    return { types, providers, regions };
  }, [resources]);

  const sortedTypes = useMemo(() => Object.keys(facetCounts.types).sort(), [facetCounts.types]);
  const sortedProviders = useMemo(() => Object.keys(facetCounts.providers).sort(), [facetCounts.providers]);
  const sortedRegions = useMemo(() => Object.keys(facetCounts.regions).sort(), [facetCounts.regions]);

  const hasAnyFacets = sortedTypes.length > 0 || sortedProviders.length > 0 || sortedRegions.length > 0;

  // Build the search URL with all active filters
  function buildSearchUrl(): string {
    let url = '/api/v1/search?limit=100';
    if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
    for (const t of selectedTypes) url += `&type=${encodeURIComponent(t)}`;
    for (const p of selectedProviders) url += `&provider=${encodeURIComponent(p)}`;
    for (const r of selectedRegions) url += `&region=${encodeURIComponent(r)}`;
    return url;
  }

  const loadResources = useCallback(async () => {
    setLoading(true);
    try {
      const url = buildSearchUrl();
      const res = await fetch(url).then(r => r.json());
      const data = (res && res.data) || res || {};
      setResources(Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : []);
    } catch (e) { console.warn("Resources: fetch failed", e); }
    finally { setLoading(false); }
  }, [searchQuery, selectedTypes, selectedProviders, selectedRegions]);

  // Auto-reload when facets or search change
  useEffect(() => { loadResources(); }, [searchQuery, selectedTypes, selectedProviders, selectedRegions]);

  // Initial load
  useEffect(() => { loadResources(); }, []);

  // Toggle functions
  function toggleType(t: string) {
    setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }
  function toggleProvider(p: string) {
    setSelectedProviders(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  }
  function toggleRegion(r: string) {
    setSelectedRegions(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  }

  // Clear all filters
  function clearAllFilters() {
    setSelectedTypes([]);
    setSelectedProviders([]);
    setSelectedRegions([]);
    setSearchQuery('');
  }

  // Active filter chips
  const activeChips: { label: string; group: string; value: string; onRemove: () => void }[] = useMemo(() => {
    const chips: { label: string; group: string; value: string; onRemove: () => void }[] = [];
    if (searchQuery) chips.push({ label: `Search: "${searchQuery}"`, group: 'search', value: searchQuery, onRemove: () => setSearchQuery('') });
    for (const t of selectedTypes) chips.push({ label: `Type: ${t}`, group: 'type', value: t, onRemove: () => toggleType(t) });
    for (const p of selectedProviders) chips.push({ label: `Provider: ${p}`, group: 'provider', value: p, onRemove: () => toggleProvider(p) });
    for (const r of selectedRegions) chips.push({ label: `Region: ${r}`, group: 'region', value: r, onRemove: () => toggleRegion(r) });
    return chips;
  }, [searchQuery, selectedTypes, selectedProviders, selectedRegions]);

  function getProps(r: any): Record<string, string> {
    return r.properties || r.Properties || {};
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  // Facet sidebar content (shared between desktop sidebar and mobile drawer)
  const facetSidebar = (
    <div className="space-y-5">
      {/* Type facet */}
      {sortedTypes.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1.5">Type</h3>
          <div className="space-y-0.5 max-h-44 overflow-y-auto">
            {sortedTypes.map(t => (
              <label key={t}
                className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[hsl(var(--muted))] cursor-pointer text-xs">
                <input type="checkbox" checked={selectedTypes.includes(t)}
                  onChange={() => toggleType(t)}
                  className="rounded border-[hsl(var(--border))] text-[#6c5ce7] focus:ring-[#6c5ce7]/30 focus:ring-offset-0" />
                <span className="flex-1 truncate" title={t}>{t}</span>
                <span className="text-[hsl(var(--muted-foreground))] shrink-0">({facetCounts.types[t]})</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Provider facet */}
      {sortedProviders.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1.5">Provider</h3>
          <div className="space-y-0.5 max-h-44 overflow-y-auto">
            {sortedProviders.map(p => (
              <label key={p}
                className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[hsl(var(--muted))] cursor-pointer text-xs">
                <input type="checkbox" checked={selectedProviders.includes(p)}
                  onChange={() => toggleProvider(p)}
                  className="rounded border-[hsl(var(--border))] text-[#6c5ce7] focus:ring-[#6c5ce7]/30 focus:ring-offset-0" />
                <span className="flex-1 truncate" title={p}>{p}</span>
                <span className="text-[hsl(var(--muted-foreground))] shrink-0">({facetCounts.providers[p]})</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Region facet */}
      {sortedRegions.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1.5">Region</h3>
          <div className="space-y-0.5 max-h-44 overflow-y-auto">
            {sortedRegions.map(r => (
              <label key={r}
                className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[hsl(var(--muted))] cursor-pointer text-xs">
                <input type="checkbox" checked={selectedRegions.includes(r)}
                  onChange={() => toggleRegion(r)}
                  className="rounded border-[hsl(var(--border))] text-[#6c5ce7] focus:ring-[#6c5ce7]/30 focus:ring-offset-0" />
                <span className="flex-1 truncate" title={r}>{r}</span>
                <span className="text-[hsl(var(--muted-foreground))] shrink-0">({facetCounts.regions[r]})</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {!hasAnyFacets && !loading && (
        <p className="text-xs text-[hsl(var(--muted-foreground))] italic">No facets available</p>
      )}
    </div>
  );

  return (
    <div className="p-8 space-y-6 animate-fade animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Resources</h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-1">Browse discovered infrastructure resources</p>
      </div>

      {/* Sticky filter bar */}
      <div className="sticky top-0 z-10 bg-[hsl(var(--background))] pb-4 space-y-3 -mx-8 px-8"
        style={{ boxShadow: '0 1px 0 hsl(var(--border))' }}>

        {/* Search + action row */}
        <div className="flex gap-3 flex-wrap pt-2">
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search resources..."
            className="flex-1 min-w-[200px] px-4 py-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:border-[#6c5ce7]/50"
            onKeyDown={e => e.key === 'Enter' && loadResources()} />
          <button onClick={loadResources} disabled={loading}
            className="px-5 py-3 bg-[#6c5ce7] hover:bg-[#5a4bd1] disabled:opacity-50 text-white rounded-xl text-sm font-medium">
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          {/* Mobile sidebar toggle */}
          {hasAnyFacets && (
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden px-3 py-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl text-[hsl(var(--muted-foreground))] text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeChips.map((chip, i) => (
              <span key={`${chip.group}-${chip.value}-${i}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#6c5ce7]/10 text-[#6c5ce7] text-xs font-medium">
                {chip.label}
                <button onClick={chip.onRemove} className="hover:text-[#5a4bd1] ml-0.5" aria-label={`Remove ${chip.label}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </span>
            ))}
            <button onClick={clearAllFilters}
              className="text-[10px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] underline">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Main layout: sidebar + results */}
      <div className="flex gap-6">
        {/* Facet sidebar - desktop */}
        {hasAnyFacets && (
          <aside className="hidden lg:block w-52 shrink-0">
            <div className="sticky top-32 space-y-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Filters</span>
                {activeChips.length > 0 && (
                  <button onClick={clearAllFilters}
                    className="text-[10px] text-[#6c5ce7] hover:underline">
                    Reset
                  </button>
                )}
              </div>
              {facetSidebar}
            </div>
          </aside>
        )}

        {/* Mobile facet sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
            <div className="absolute right-0 top-0 bottom-0 w-64 bg-[hsl(var(--background))] border-l border-[hsl(var(--border))] p-5 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold">Filters</span>
                <button onClick={() => setSidebarOpen(false)}
                  className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              {facetSidebar}
            </div>
          </div>
        )}

        {/* Results */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-12 rounded-lg bg-[hsl(var(--card))] animate-pulse" />)}</div>
          ) : resources.length === 0 ? (
            <div className="text-center py-16 text-[#5c5c5e]">
              <p className="text-lg">No resources found</p>
              <p className="text-sm mt-1">Run discovery to populate your infrastructure catalog</p>
              {activeChips.length > 0 && (
                <button onClick={clearAllFilters}
                  className="mt-3 text-sm text-[#6c5ce7] hover:underline">
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={selectedIds.size === resources.length && resources.length > 0}
                    onChange={() => {
                      if (selectedIds.size === resources.length) {
                        setSelectedIds(new Set());
                      } else {
                        setSelectedIds(new Set(resources.map(r => r.id || r.ID || '').filter(Boolean)));
                      }
                    }}
                    className="rounded border-[hsl(var(--border))] text-[#6c5ce7] focus:ring-[#6c5ce7]/30 focus:ring-offset-0" />
                  <p className="text-xs text-[#5c5c5e]">
                    {resources.length} resource{resources.length !== 1 ? 's' : ''}
                    {activeChips.length > 0 && ` (filtered)`}
                    {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
                  </p>
                </div>
                {activeChips.length > 0 && (
                  <button onClick={clearAllFilters}
                    className="text-[10px] text-[#6c5ce7] hover:underline hidden sm:block">
                    Clear filters
                  </button>
                )}
              </div>

              {/* Bulk action bar */}
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6c5ce7]/10 border border-[#6c5ce7]/20 mb-2">
                  <span className="text-xs font-semibold text-[#6c5ce7]">{selectedIds.size} selected</span>
                  <div className="w-px h-4 bg-[#6c5ce7]/20" />
                  <button onClick={() => setTagDialogOpen(true)} className="px-2.5 py-1 text-[10px] font-medium rounded-md bg-[#6c5ce7] text-white hover:bg-[#5a4bd1] transition-all">Tag</button>
                  <button onClick={() => setDeleteConfirmOpen(true)} className="px-2.5 py-1 text-[10px] font-medium rounded-md bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/20 transition-all">Delete</button>
                  <button onClick={() => {
                    const exportData = resources.filter(r => selectedIds.has(r.id || r.ID || '')).map(r => ({
                      id: r.id || r.ID || '',
                      name: r.name || r.Name || '',
                      type: r.type || r.Type || '',
                      provider: r.provider || r.Provider || '',
                      region: r.region || r.Region || '',
                      properties: getProps(r),
                    }));
                    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = 'resources-export.json'; a.click();
                    URL.revokeObjectURL(url);
                  }} className="px-2.5 py-1 text-[10px] font-medium rounded-md bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:opacity-80 transition-all">Export</button>
                  <button onClick={() => setSelectedIds(new Set())} className="ml-auto px-2 py-1 text-[10px] font-medium text-[#5c5c5e] hover:text-[hsl(var(--foreground))] transition-all">Clear</button>
                </div>
              )}

              {resources.map((r, i) => {
                const id = r.id || r.ID || '';
                const name = r.name || r.Name || id;
                const type = r.type || r.Type || 'unknown';
                const provider = r.provider || r.Provider || '';
                const region = r.region || r.Region || '';
                const props = getProps(r);
                const propCount = Object.keys(props).length;
                const isChecked = selectedIds.has(id);
                return (
                  <div key={id || i}>
                    <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] hover:border-[hsl(var(--muted-foreground))/30] transition-all cursor-pointer"
                      onClick={() => setExpandedId(expandedId === id ? null : id)}>
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Checkbox */}
                        <div onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={isChecked} onChange={() => {
                            const next = new Set(selectedIds);
                            if (isChecked) next.delete(id); else next.add(id);
                            setSelectedIds(next);
                          }} className="rounded border-[hsl(var(--border))] text-[#6c5ce7] focus:ring-[#6c5ce7]/30 focus:ring-offset-0" />
                        </div>
                        <div className="w-7 h-7 rounded-lg bg-[hsl(var(--muted))] flex items-center justify-center text-xs text-[#5c5c5e] shrink-0">
                          {provider ? provider[0].toUpperCase() : '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{name}</p>
                          <p className="text-[10px] text-[#5c5c5e] truncate">{type}{region ? ` · ${region}` : ''}{propCount > 0 ? ` · ${propCount} properties` : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        {provider && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#6c5ce7]/10 text-[#6c5ce7]">{provider}</span>}
                        <span className="text-[10px] text-[#5c5c5e]">{expandedId === id ? '▲' : '▼'}</span>
                      </div>
                    </div>
                    {expandedId === id && (
                      <div className="mx-4 px-4 py-3 rounded-b-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] border-t-0 text-xs text-[hsl(var(--muted-foreground))] space-y-1">
                        <p><span className="text-[#5c5c5e]">ID:</span> {id}</p>
                        {region && <p><span className="text-[#5c5c5e]">Region:</span> {region}</p>}
                        {propCount > 0 && (
                          <div>
                            <span className="text-[#5c5c5e]">Properties:</span>
                            {Object.entries(props).map(([k, v]) => (
                              <p key={k} className="pl-4">- {k}: {v}</p>
                            ))}
                          </div>
                        )}
                        {!propCount && !region && <p className="text-[#5c5c5e] italic">No additional details</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Bulk tag dialog */}
          {tagDialogOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setTagDialogOpen(false); setBulkTagStatus(null); }}>
              <div className="w-80 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[hsl(var(--border))]">
                  <span className="text-sm font-semibold">Tag {selectedIds.size} resources</span>
                  <button onClick={() => { setTagDialogOpen(false); setBulkTagStatus(null); }} className="text-xs text-[#5c5c5e] hover:text-white">✕</button>
                </div>
                <div className="p-4 space-y-3">
                  <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Enter tags, comma-separated (e.g. production, critical)" className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-xs text-[hsl(var(--foreground))] placeholder-[#5c5c5e] focus:outline-none focus:border-[#6c5ce7]/50" />
                  {bulkTagStatus && <p className={`text-[11px] ${bulkTagStatus.includes('failed') || bulkTagStatus.includes('Error') ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>{bulkTagStatus}</p>}
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setTagDialogOpen(false); setBulkTagStatus(null); }} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:opacity-80 transition-all">Cancel</button>
                    <button onClick={async () => {
                      const tags = tagInput.split(',').map((t: string) => t.trim()).filter(Boolean);
                      if (tags.length === 0) { setBulkTagStatus('Please enter at least one tag.'); return; }
                      setBulkTagStatus('Applying tags...');
                      try {
                        const res = await fetch('/api/v1/resources/bulk/tag', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ ids: Array.from(selectedIds), tags }),
                        });
                        const data = await res.json();
                        if (data.data?.status === 'tagged' || data.status === 'tagged') {
                          setBulkTagStatus(`Tags applied to ${selectedIds.size} resources.`);
                          setTimeout(() => { setTagDialogOpen(false); setBulkTagStatus(null); }, 1200);
                        } else { setBulkTagStatus('Failed to apply tags.'); }
                      } catch { setBulkTagStatus('Network error applying tags.'); }
                    }} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#6c5ce7] text-white hover:bg-[#5a4bd1] transition-all">Apply</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bulk delete confirm dialog */}
          {deleteConfirmOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setDeleteConfirmOpen(false); setBulkDeleteStatus(null); }}>
              <div className="w-80 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[hsl(var(--border))]">
                  <span className="text-sm font-semibold">Delete resources</span>
                  <button onClick={() => { setDeleteConfirmOpen(false); setBulkDeleteStatus(null); }} className="text-xs text-[#5c5c5e] hover:text-white">✕</button>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-sm text-[#e1e1e3]">Are you sure you want to delete {selectedIds.size} resource{selectedIds.size !== 1 ? 's' : ''}?</p>
                  <p className="text-xs text-[#ef4444]">This action cannot be undone.</p>
                  {bulkDeleteStatus && <p className={`text-[11px] ${bulkDeleteStatus.includes('failed') || bulkDeleteStatus.includes('Error') ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>{bulkDeleteStatus}</p>}
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setDeleteConfirmOpen(false); setBulkDeleteStatus(null); }} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:opacity-80 transition-all">Cancel</button>
                    <button onClick={async () => {
                      setBulkDeleteStatus('Deleting...');
                      try {
                        const res = await fetch('/api/v1/resources/bulk/delete', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ ids: Array.from(selectedIds) }),
                        });
                        const data = await res.json();
                        if (data.data?.status === 'deleted' || data.status === 'deleted') {
                          setBulkDeleteStatus(`Deleted ${selectedIds.size} resources.`);
                          setSelectedIds(new Set());
                          setTimeout(() => { setDeleteConfirmOpen(false); setBulkDeleteStatus(null); loadResources(); }, 1000);
                        } else { setBulkDeleteStatus('Failed to delete resources.'); }
                      } catch { setBulkDeleteStatus('Network error deleting resources.'); }
                    }} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#ef4444] text-white hover:bg-[#dc2626] transition-all">Delete</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
