import { useState, createContext, useContext, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Sidebar } from './components/layout/Sidebar';
import { KnowledgePanel } from './components/knowledge/KnowledgePanel';
import { CommandPalette } from './components/ui/CommandPalette';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Runbooks } from './pages/Runbooks';
import { Graph } from './pages/Graph';
import { Changes } from './pages/Changes';
import { Settings } from './pages/Settings';
import { Admin } from './pages/Admin';
import { Connectors } from './pages/Connectors';
import { Discovery } from './pages/Discovery';
import { Resources } from './pages/Resources';
import { Docs } from './pages/Docs';
import { Search } from './pages/Search';
import { DocView } from './pages/DocView';
import { NotFound } from './pages/NotFound';
import { Onboarding } from './pages/Onboarding';
import { Webhooks } from './pages/Webhooks';
import { AuditLog } from './pages/AuditLog';
import { Compliance } from './pages/Compliance';

interface KnowledgeContextValue {
  setOpen: (open: boolean) => void;
  setResourceId: (id: string | undefined) => void;
  setSuggested: (q: string[]) => void;
}

export const KnowledgeContext = createContext<KnowledgeContextValue>({
  setOpen: () => {},
  setResourceId: () => {},
  setSuggested: () => {},
});

export function useKnowledge() {
  return useContext(KnowledgeContext);
}

function SSOCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');

    if (error) {
      navigate('/login?error=' + encodeURIComponent(error), { replace: true });
      return;
    }

    if (token) {
      localStorage.setItem('zerelio_at', token);
      window.location.href = '/';
    } else {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#6c5ce7] border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-sm text-[#8b8b8e]">Completing sign in...</p>
      </div>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showKnowledge, setShowKnowledge] = useState(false);
  const [knowledgeResourceId, setKnowledgeResourceId] = useState<string | undefined>();
  const [knowledgeSuggested, setKnowledgeSuggested] = useState<string[]>([]);

  // Migrate kt_* keys from KnowledgeTree → Zerelio
  ['onboarded','announcement','theme','recent_pages'].forEach(k => {
    const old = localStorage.getItem('kt_' + k);
    if (old !== null && !localStorage.getItem('zerelio_' + k)) {
      localStorage.setItem('zerelio_' + k, old);
      localStorage.removeItem('kt_' + k);
    }
  });

  // Cmd+Shift+K to toggle KnowledgePanel
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        setShowKnowledge(prev => !prev);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen" style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
        <Routes>
          <Route path="/sso/callback" element={<SSOCallback />} />
          <Route path="*" element={<Login />} />
        </Routes>
      </div>
    );
  }

  // Onboarding check: show wizard if user hasn't completed onboarding
  const needsOnboarding = !localStorage.getItem('zerelio_onboarded');
  const isOnboardingRoute = location.pathname === '/onboarding';
  if (needsOnboarding && !isOnboardingRoute) {
    return (
      <div className="h-screen" style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
        <Routes>
          <Route path="/sso/callback" element={<SSOCallback />} />
          <Route path="*" element={<Onboarding />} />
        </Routes>
      </div>
    );
  }

  return (
    <KnowledgeContext.Provider value={{
      setOpen: setShowKnowledge,
      setResourceId: setKnowledgeResourceId,
      setSuggested: setKnowledgeSuggested,
    }}>
    <div className="flex h-screen" style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
      <Sidebar onToggleKnowledge={() => setShowKnowledge(!showKnowledge)} />
      <CommandPalette />
      <main className="flex-1 overflow-auto relative">
        {/* Route transition progress bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 z-50 pointer-events-none">
          <div id="route-progress" className="h-full bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] transition-all duration-300 ease-out" style={{ width: '0%', opacity: 0 }} />
        </div>
        {/* Announcement banner placeholder */}
        {localStorage.getItem('zerelio_announcement') && (
          <div className="mx-4 mt-4 px-4 py-2 rounded-lg text-xs flex items-center justify-between bg-[#6c5ce7]/10 border border-[#6c5ce7]/20" style={{ color: 'hsl(var(--foreground))' }}>
            <span>{localStorage.getItem('zerelio_announcement')}</span>
            <button onClick={() => localStorage.removeItem('zerelio_announcement')} className="text-[#5c5c5e] hover:text-[hsl(var(--foreground))]">✕</button>
          </div>
        )}
        {/* Breadcrumb nav - hidden for dashboard and login */}
        {location.pathname !== '/' && (
          <div className="absolute top-0 left-0 right-0 z-40 px-8 pt-3 pb-1 pointer-events-none">
            <nav className="flex items-center gap-1.5 text-[11px] pointer-events-auto" style={{ color: 'hsl(var(--muted-foreground))' }}>
              <button onClick={() => navigate('/')} className="hover:text-[hsl(var(--foreground))] transition-colors">Dashboard</button>
              {location.pathname.split('/').filter(Boolean).map((part, i, parts) => {
                const path = '/' + parts.slice(0, i + 1).join('/');
                const label = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ');
                return (
                  <span key={path} className="flex items-center gap-1.5">
                    <span className="text-[#5c5c5e]">/</span>
                    <button onClick={() => navigate(path)} className="hover:text-[hsl(var(--foreground))] transition-colors capitalize">{decodeURIComponent(label)}</button>
                  </span>
                );
              })}
            </nav>
          </div>
        )}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/connectors" element={<Connectors />} />
          <Route path="/discovery" element={<Discovery />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/search" element={<Search />} />
          <Route path="/docs/:id" element={<DocView />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/runbooks" element={<Runbooks />} />
          <Route path="/graph" element={<Graph />} />
          <Route path="/changes" element={<Changes />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<ProtectedRoute role="admin"><Admin /></ProtectedRoute>} />
          <Route path="/admin/webhooks" element={<ProtectedRoute role="admin"><Webhooks /></ProtectedRoute>} />
          <Route path="/admin/audit" element={<ProtectedRoute role="admin"><AuditLog /></ProtectedRoute>} />
          <Route path="/admin/compliance" element={<ProtectedRoute role="admin"><Compliance /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <KnowledgePanel
        open={showKnowledge}
        onClose={() => setShowKnowledge(false)}
        resourceId={knowledgeResourceId}
        suggestedQuestions={knowledgeSuggested}
      />
    </div>
    </KnowledgeContext.Provider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

// Immediately restore theme before first React render to prevent flash
const _savedTheme = localStorage.getItem('zerelio_theme');
document.documentElement.setAttribute('data-theme', _savedTheme === 'light' ? 'light' : 'dark');
