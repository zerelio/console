import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  path: string;
  icon: React.ComponentType<{ active: boolean }>;
  label: string;
  roles: string[];
}

const navItems: NavItem[] = [
  { path: '/', icon: LayoutIcon, label: 'Dashboard', roles: ['admin', 'editor', 'viewer'] },
  { path: '/search', icon: SearchIcon, label: 'Search', roles: ['admin', 'editor', 'viewer'] },
  { path: '/connectors', icon: PlugIcon, label: 'Connectors', roles: ['admin', 'editor', 'viewer'] },
  { path: '/discovery', icon: ActivityIcon, label: 'Discovery', roles: ['admin', 'editor', 'viewer'] },
  { path: '/resources', icon: BoxIcon, label: 'Resources', roles: ['admin', 'editor', 'viewer'] },
  { path: '/docs', icon: DocIcon, label: 'Documentation', roles: ['admin', 'editor', 'viewer'] },
  { path: '/runbooks', icon: BookIcon, label: 'Runbooks', roles: ['admin', 'editor', 'viewer'] },
  { path: '/graph', icon: GraphIcon, label: 'Graph', roles: ['admin', 'editor', 'viewer'] },
  { path: '/changes', icon: ClockIcon, label: 'Changes', roles: ['admin', 'editor', 'viewer'] },
  { path: '/settings', icon: SettingsIcon, label: 'Settings', roles: ['admin', 'editor', 'viewer'] },
  { path: '/admin', icon: ShieldIcon, label: 'Admin', roles: ['admin'] },
];

const THEME_KEY = 'kt_theme';

export function Sidebar({ onToggleKnowledge }: { onToggleKnowledge?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, hasRole } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem(THEME_KEY) as 'dark' | 'light') || 'dark';
  });
  const [failedScopes, setFailedScopes] = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Track recent pages
  useEffect(() => {
    const path = location.pathname;
    if (path === '/') return;
    const recent = JSON.parse(localStorage.getItem('kt_recent_pages') || '[]');
    const filtered = recent.filter((p: string) => p !== path);
    filtered.unshift(path);
    localStorage.setItem('kt_recent_pages', JSON.stringify(filtered.slice(0, 3)));
  }, [location.pathname]);

  const recentPages = JSON.parse(localStorage.getItem('kt_recent_pages') || '[]');

  useEffect(() => {
    fetch('/api/v1/discovery/scopes')
      .then(r => r.json())
      .then(d => {
        const scopes = d?.data ?? (Array.isArray(d) ? d : []);
        setFailedScopes(scopes.filter((s: any) => (s.last_run_status || '') === 'FAILED').length);
      })
      .catch(() => {});
  }, []);

  const visibleNavItems = navItems.filter(item => item.roles.some(r => hasRole(r)));

  function toggleTheme() {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-56'} transition-all duration-300 border-r border-[hsl(var(--border))] flex flex-col bg-[hsl(var(--sidebar))]`}>
      {/* Header with logo + theme toggle */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-[hsl(var(--sidebar-border))]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe] flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">Z</span>
          </div>
          {!collapsed && <span className="font-semibold text-sm tracking-tight" style={{ color: 'hsl(var(--sidebar-foreground))' }}>Zerelio</span>}
        </div>
        {/* Theme toggle — always visible */}
        <button onClick={toggleTheme} className="w-7 h-7 rounded-lg hover:bg-[hsl(var(--sidebar-accent))] flex items-center justify-center shrink-0 transition-all" title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? (
            <svg className="w-4 h-4 text-[#8b8b8e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-[#666]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
          )}
        </button>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {visibleNavItems.map((item) => {
          const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
          const badge = item.path === '/discovery' && failedScopes > 0 ? failedScopes : null;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                active
                  ? 'bg-[#6c5ce7]/10 text-[#6c5ce7]'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--sidebar-accent))]'
              }`}
            >
              <item.icon active={active} />
              {!collapsed && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span>{item.label}</span>
                  {badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-red-500/15 text-red-400">
                      {badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-2 border-t border-[hsl(var(--sidebar-border))] space-y-1">
        {/* Recent pages */}
        {!collapsed && recentPages.length > 0 && (
          <div className="px-1 pb-1">
            <p className="text-[10px] font-medium tracking-wider mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Recent</p>
            {recentPages.slice(0, 3).map((p: string) => {
              const found = navItems.find(n => p.startsWith(n.path) && n.path !== '/');
              if (!found) return null;
              return (
                <button key={p} onClick={() => navigate(p)} className="w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] transition-all hover:bg-[hsl(var(--sidebar-accent))]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  <found.icon active={false} />
                  <span>{found.label}</span>
                </button>
              );
            })}
          </div>
        )}
        {/* Knowledge Q&A toggle */}
        <button
          onClick={onToggleKnowledge}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--sidebar-accent))] transition-all"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
          </svg>
          {!collapsed && <span>Ask AI</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--sidebar-accent))] transition-all"
        >
          {collapsed ? '→' : '◀ Collapse'}
        </button>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-[hsl(0,85%,60%)] hover:text-[hsl(0,85%,70%)] hover:bg-[hsl(0,85%,60%,0.1)] transition-all"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}

function LayoutIcon({ active: _active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function SearchIcon({ active: _active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function PlugIcon({ active: _active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0zM15 12l-3-3m3 3l-3 3" />
    </svg>
  );
}

function ActivityIcon({ active: _active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
    </svg>
  );
}

function BoxIcon({ active: _active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function DocIcon({ active: _active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function BookIcon({ active: _active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function GraphIcon({ active: _active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
    </svg>
  );
}

function ClockIcon({ active: _active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SettingsIcon({ active: _active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ShieldIcon({ active: _active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}
