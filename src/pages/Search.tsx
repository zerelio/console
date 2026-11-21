import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

type FacetCounts = {
  types: Record<string, number>;
  providers: Record<string, number>;
  regions: Record<string, number>;
};

export function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [allResults, setAllResults] = useState<any[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { document.title = 'Search - Zerelio'; }, []);

  // Facet selections
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);

  // Mobile sidebar toggle
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Derive field values from results (handles both camelCase and PascalCase)
  const getField = (r: any, key: string): string => {
    const pascal = key[0].toUpperCase() + key.slice(1);
    return r[key] || r[pascal] || '';
  };

  // Compute facet counts from ALL accumulated results (not just current page)
  const facetCounts: FacetCounts = useMemo(() => {
    const types: Record<string, number> = {};
    const providers: Record<string, number> = {};
    const regions: Record<string, number> = {};
    for (const r of allResults) {
      const t = getField(r, 'type') || 'unknown';
      const p = getField(r, 'provider') || 'unknown';
      const reg = getField(r, 'region') || 'unknown';
      types[t] = (types[t] || 0) + 1;
      providers[p] = (providers[p] || 0) + 1;
      regions[reg] = (regions[reg] || 0) + 1;
    }
    return { types, providers, regions };
  }, [allResults]);

  // Group labels for cleaner display
  const typeLabels: Record<string, string> = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const t of Object.keys(facetCounts.types)) {
      labels[t] = t.split('.').slice(-1)[0] || t;
    }
    return labels;
  }, [facetCounts.types]);

  const sortedTypes = useMemo(() => Object.keys(facetCounts.types).sort(), [facetCounts.types]);
  const sortedProviders = useMemo(() => Object.keys(facetCounts.providers).sort(), [facetCounts.providers]);
  const sortedRegions = useMemo(() => Object.keys(facetCounts.regions).sort(), [facetCounts.regions]);

  const hasAnyFacets = sortedTypes.length > 0 || sortedProviders.length > 0 || sortedRegions.length > 0;

  // Build the search URL with all active filters
  function buildSearchUrl(pageNum: number): string {
    let url = `/api/v1/search?q=${encodeURIComponent(query)}&limit=50&page=${pageNum}`;
    for (const t of selectedTypes) url += `&type=${encodeURIComponent(t)}`;
    for (const p of selectedProviders) url += `&provider=${encodeURIComponent(p)}`;
    for (const r of selectedRegions) url += `&region=${encodeURIComponent(r)}`;
    return url;
  }

  const handleSearch = useCallback(async (pageNum = 1) => {
    if (!query.trim()) return;
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setSearched(true);
    setPage(pageNum);
    try {
      const url = buildSearchUrl(pageNum);
      const res = await fetch(url, { signal: controller.signal }).then(r => r.json());
      // If this request was aborted, don't update state
      if (controller.signal.aborted) return;
      const data = (res && res.data) || res || {};
      const newResults = Array.isArray(data.results) ? data.results : [];
      if (pageNum === 1) {
        setAllResults(newResults);
        setResults(newResults);
      } else {
        setAllResults(prev => [...prev, ...newResults]);
        setResults(prev => [...prev, ...newResults]);
      }
      setTotal(data.total || 0);
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.warn("Search: query failed", e);
    }
    finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [query, selectedTypes, selectedProviders, selectedRegions]);

  // Debounced search: fires automatically when query changes (300ms after typing stops)
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setAllResults([]);
      setTotal(0);
      setSearched(false);
      setLoading(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      handleSearch(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

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
  }

  // Auto-search when facets change (only if already searched)
  useEffect(() => {
    if (searched && query.trim()) {
      // Cancel any pending debounce and search immediately
      if (debounceRef.current) clearTimeout(debounceRef.current);
      handleSearch(1);
    }
  }, [selectedTypes, selectedProviders, selectedRegions]);

  // Active filter chips
  const activeChips: { label: string; group: string; value: string; onRemove: () => void }[] = useMemo(() => {
    const chips: { label: string; group: string; value: string; onRemove: () => void }[] = [];
    for (const t of selectedTypes) chips.push({ label: `Type: ${t}`, group: 'type', value: t, onRemove: () => toggleType(t) });
    for (const p of selectedProviders) chips.push({ label: `Provider: ${p}`, group: 'provider', value: p, onRemove: () => toggleProvider(p) });
    for (const r of selectedRegions) chips.push({ label: `Region: ${r}`, group: 'region', value: r, onRemove: () => toggleRegion(r) });
    return chips;
  }, [selectedTypes, selectedProviders, selectedRegions]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────────

  const searchBar = (
    <div className="flex gap-3">
      <input ref={searchInputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
        placeholder="Search by name, type, provider, region..."
        className="flex-1 px-4 py-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:border-[#6c5ce7]/50" />
      {/* Mobile sidebar toggle */}
      {searched && hasAnyFacets && (
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden px-3 py-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl text-[hsl(var(--muted-foreground))] text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );

  // Active filter chips
  const filterChips = activeChips.length > 0 ? (
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
  ) : null;

  // ─── Facet sidebar ──────────────────────────────────────────────────────────
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
                <span className="flex-1 truncate" title={t}>{typeLabels[t]}</span>
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

      {!hasAnyFacets && searched && (
        <p className="text-xs text-[hsl(var(--muted-foreground))] italic">No facets available</p>
      )}
    </div>
  );

  return (
    <div className="p-8 space-y-6 animate-fade animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Search</h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-1">Search across all discovered infrastructure</p>
      </div>

      {/* Sticky search + filter bar */}
      <div className="sticky top-0 z-10 bg-[hsl(var(--background))] pb-4 space-y-3 -mx-8 px-8 pt-2"
        style={{ boxShadow: '0 1px 0 hsl(var(--border))' }}>
        {searchBar}
        {filterChips}
      </div>

      {/* Main layout: sidebar + results */}
      <div className="flex gap-6">
        {/* Facet sidebar - desktop */}
        {searched && hasAnyFacets && (
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
            <div className="space-y-2">{[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-14 rounded-xl bg-[hsl(var(--card))] animate-pulse" />)}</div>
          ) : searched && results.length === 0 ? (
            <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">
              <p className="text-lg">No results for "{query}"</p>
              <p className="text-sm mt-1">Try different keywords, adjust your filters, or check your spelling</p>
              {activeChips.length > 0 && (
                <button onClick={clearAllFilters}
                  className="mt-3 text-sm text-[#6c5ce7] hover:underline">
                  Clear all filters
                </button>
              )}
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {results.length > 0 ? `Showing ${results.length} of ${total} result${total !== 1 ? 's' : ''}` : `${total} result${total !== 1 ? 's' : ''}`} for "{query}"
                  {activeChips.length > 0 && ` with ${activeChips.length} filter${activeChips.length !== 1 ? 's' : ''}`}
                </p>
                {activeChips.length > 0 && (
                  <button onClick={clearAllFilters}
                    className="text-[10px] text-[#6c5ce7] hover:underline hidden sm:block">
                    Clear filters
                  </button>
                )}
              </div>
              {results.map((r, i) => {
                const id = r.id || r.ID || '';
                const name = r.name || r.Name || id;
                const type = r.type || r.Type || 'unknown';
                const provider = r.provider || r.Provider || '';
                const region = r.region || r.Region || '';
                const desc = r.description || r.Description || r.properties?.description || '';
                return (
                  <div key={id || i}
                    className="px-4 py-3 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] hover:border-[hsl(var(--muted-foreground))/30] transition-all">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{highlight(name, query)}</p>
                        <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                          {type}{region ? ` · ${region}` : ''}{desc ? ` · ${desc.substring(0, 100)}` : ''}
                        </p>
                      </div>
                      {provider && (
                        <span className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full bg-[#6c5ce7]/10 text-[#6c5ce7] shrink-0 ml-3">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{background: ((String(provider)||"").toLowerCase() === "aws" ? "#ff9900" : String(provider).toLowerCase() === "azure" ? "#0078d4" : String(provider).toLowerCase() === "gcp" ? "#4285f4" : String(provider).toLowerCase() === "kubernetes" ? "#326ce5" : String(provider).toLowerCase() === "github" ? "#6e5494" : String(provider).toLowerCase() === "cloudflare" ? "#f38020" : String(provider).toLowerCase() === "datadog" ? "#632ca6" : "#6c5ce7")}} />
                          {provider}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {results.length < total && results.length > 0 && (
                <div className="flex justify-center pt-3">
                  <button onClick={() => handleSearch(page + 1)} disabled={loading}
                    className="px-5 py-2 rounded-xl border border-[hsl(var(--border))] text-sm font-medium bg-[hsl(var(--card))] hover:border-[#6c5ce7]/30 transition-all disabled:opacity-50">
                    {loading ? 'Loading...' : `Load More (${results.length} of ${total})`}
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function highlight(text: string, query: string) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'));
  return <>{parts.map((p, i) => p.toLowerCase() === query.toLowerCase() ? <span key={i} className="text-[#a29bfe]">{p}</span> : p)}</>;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
