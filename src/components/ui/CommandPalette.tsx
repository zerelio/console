import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const PAGES = [
  { path: '/', label: 'Dashboard', keywords: 'home overview' },
  { path: '/search', label: 'Search', keywords: 'find browse resources' },
  { path: '/connectors', label: 'Connectors', keywords: 'cloud providers integrations' },
  { path: '/discovery', label: 'Discovery', keywords: 'scan run' },
  { path: '/resources', label: 'Resources', keywords: 'assets inventory' },
  { path: '/docs', label: 'Documentation', keywords: 'docs documents generate' },
  { path: '/runbooks', label: 'Runbooks', keywords: 'runbook operations' },
  { path: '/graph', label: 'Graph', keywords: 'map topology visualize' },
  { path: '/changes', label: 'Changes', keywords: 'audit activity' },
  { path: '/settings', label: 'Settings', keywords: 'preferences account password' },
  { path: '/admin', label: 'Admin', keywords: 'configuration license users' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
        setQuery('');
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
        setQuery('');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const filtered = query.trim()
    ? PAGES.filter(p =>
        p.label.toLowerCase().includes(query.toLowerCase()) ||
        p.keywords.toLowerCase().includes(query.toLowerCase())
      )
    : PAGES;

  function handleSelect(path: string) {
    navigate(path);
    setOpen(false);
    setQuery('');
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={() => { setOpen(false); setQuery(''); }}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden"
        style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
          <svg className="w-4 h-4 shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search pages..."
            className="flex-1 text-sm outline-none bg-transparent"
            style={{ color: 'hsl(var(--foreground))' }}
            onKeyDown={e => {
              if (e.key === 'Enter' && filtered.length > 0) handleSelect(filtered[0].path);
              if (e.key === 'Escape') { setOpen(false); setQuery(''); }
            }} />
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}>esc</span>
        </div>
        <div className="max-h-72 overflow-y-auto p-2 space-y-0.5">
          {filtered.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'hsl(var(--muted-foreground))' }}>No results</p>
          ) : filtered.map(p => (
            <button key={p.path} onClick={() => handleSelect(p.path)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-all hover:bg-[hsl(var(--border))]"
              style={{ color: 'hsl(var(--foreground))' }}>
              <span className="flex-1">{p.label}</span>
              <span className="text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>{p.path}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
