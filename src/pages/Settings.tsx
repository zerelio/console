import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export function Settings() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ name: '', email: '', role: '' });
  const [loading, setLoading] = useState(true);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwChanging, setPwChanging] = useState(false);
  const [pwMsg, setPwMsg] = useState('');

  // API tokens
  const [tokens, setTokens] = useState<{id: string; name: string; created: string; last_used: string}[]>([]);
  const [tokensLoading, setTokensLoading] = useState(true);
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenValue, setNewTokenValue] = useState('');
  const [tokenCreating, setTokenCreating] = useState(false);
  const [tokenMsg, setTokenMsg] = useState('');
  const [tokenRevoking, setTokenRevoking] = useState<string | null>(null);

  // Theme
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('zerelio_theme') as 'dark' | 'light') || 'dark';
  });

  // Notification preferences
  const [notifyDiscovery, setNotifyDiscovery] = useState(true);
  const [notifyDrift, setNotifyDrift] = useState(true);
  const [notifyChanges, setNotifyChanges] = useState(false);
  const [defaultLanding, setDefaultLanding] = useState('/');
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsMsg, setPrefsMsg] = useState('');

  useEffect(() => {
    document.title = 'Settings - Zerelio';
    async function loadProfile() {
      // Try /auth/me first
      try {
        const r = await fetch('/api/v1/auth/me');
        if (r.ok) {
          const d = await r.json();
          const data = d.data || d;
          setProfile({ name: data.name || data.email || 'User', email: data.email || '', role: data.role || '' });
          setLoading(false);
          return;
        }
      } catch {}

      // Decode JWT from zerelio_at to get email/sub
      let jwtEmail = '';
      try {
        const token = localStorage.getItem('zerelio_at') || '';
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          jwtEmail = payload.email || payload.sub || '';
        }
      } catch {}

      if (jwtEmail) {
        // Try to get role from /admin/users
        try {
          const usersRes = await fetch('/api/v1/admin/users');
          if (usersRes.ok) {
            const ud = await usersRes.json();
            const users: any[] = ud.data ?? ud ?? [];
            const me = Array.isArray(users) ? users.find((u: any) => u.email === jwtEmail) : null;
            setProfile({ name: me?.name || jwtEmail, email: jwtEmail, role: me?.role || '' });
            setLoading(false);
            return;
          }
        } catch {}
        setProfile({ name: jwtEmail, email: jwtEmail, role: '' });
      } else {
        setProfile({ name: 'Profile unavailable', email: 'check API connection', role: '' });
      }
      setLoading(false);
    }
    loadProfile();
    loadTokens();
    loadPreferences();
  }, []);

  async function loadPreferences() {
    setPrefsLoading(true);
    try {
      const res = await fetch('/api/v1/auth/preferences');
      const d = await res.json();
      const data = d.data || d;
      setNotifyDiscovery(data.notify_discovery_complete !== 'false');
      setNotifyDrift(data.notify_drift_detected !== 'false');
      setNotifyChanges(data.notify_changes === 'true');
      setDefaultLanding(data.default_landing_page || '/');
    } catch {}
    finally { setPrefsLoading(false); }
  }

  async function savePreferences() {
    setPrefsSaving(true);
    setPrefsMsg('');
    try {
      const res = await fetch('/api/v1/auth/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notify_discovery_complete: String(notifyDiscovery),
          notify_drift_detected: String(notifyDrift),
          notify_changes: String(notifyChanges),
          default_landing_page: defaultLanding,
        }),
      });
      if (res.ok) setPrefsMsg('Preferences saved');
      else setPrefsMsg('Error saving preferences');
    } catch { setPrefsMsg('Error: connection failed'); }
    finally { setPrefsSaving(false); }
  }

  async function loadTokens() {
    setTokensLoading(true);
    try {
      const res = await fetch('/api/v1/admin/tokens');
      const d = await res.json();
      const data = d.data || d || [];
      setTokens(Array.isArray(data) ? data : []);
    } catch { setTokens([]); }
    finally { setTokensLoading(false); }
  }

  async function handleCreateToken() {
    if (!newTokenName.trim()) return;
    setTokenCreating(true);
    setTokenMsg('');
    try {
      const res = await fetch('/api/v1/admin/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTokenName }),
      });
      const d = await res.json();
      const data = d.data || d;
      if (res.ok && data.token) {
        setNewTokenValue(data.token);
        setTokenMsg('Token created. Copy it now — it won\'t be shown again.');
        await loadTokens();
      } else {
        setTokenMsg('Error: ' + (data.error || 'create failed'));
      }
    } catch (e: any) {
      setTokenMsg('Error: ' + (e.message || 'connection failed'));
    }
    finally { setTokenCreating(false); }
  }

  async function handleRevokeToken(id: string) {
    if (!window.confirm('Revoke this token? Any services using it will lose access.')) return;
    setTokenRevoking(id);
    try {
      const res = await fetch(`/api/v1/admin/tokens/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) await loadTokens();
    } catch {}
    finally { setTokenRevoking(null); }
  }

  function handleThemeChange(t: 'dark' | 'light') {
    setTheme(t);
    localStorage.setItem('zerelio_theme', t);
    document.documentElement.setAttribute('data-theme', t);
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) { setPwMsg('New passwords do not match'); return; }
    if (newPassword.length < 8) { setPwMsg('Password must be at least 8 characters'); return; }
    setPwChanging(true);
    setPwMsg('');
    try {
      const res = await fetch('/api/v1/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const d = await res.json();
      const data = d.data || d;
      if (res.ok) {
        setPwMsg('Password changed successfully');
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      } else {
        setPwMsg('Error: ' + (data.error || 'change failed'));
      }
    } catch (e: any) {
      setPwMsg('Error: ' + (e.message || 'connection failed'));
    } finally { setPwChanging(false); }
  }

  return (
    <div className="p-8 space-y-8 animate-fade animate-slide-up max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Personal Settings</h1>
        <p className="text-[#8b8b8e] mt-1">Manage your account preferences</p>
      </div>

      {/* Profile */}
      <section className="rounded-xl p-6 space-y-4" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>Profile</h2>
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              <div className="h-10 rounded-lg bg-[hsl(var(--muted))] animate-pulse" />
              <div className="h-10 rounded-lg bg-[hsl(var(--muted))] animate-pulse" />
            </div>
          ) : (
            <>
              <div>
                <label className="text-sm block mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Email</label>
                <input type="email" value={profile.email} disabled
                  className="w-full px-3 py-2 rounded-lg text-sm opacity-50"
                  style={{ background: 'hsl(var(--input))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }} />
              </div>
              {profile.role && (
                <div>
                  <label className="text-sm block mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Role</label>
                  <input type="text" value={profile.role} disabled
                    className="w-full px-3 py-2 rounded-lg text-sm opacity-50 capitalize"
                    style={{ background: 'hsl(var(--input))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }} />
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Theme */}
      <section className="rounded-xl p-6 space-y-4" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>Appearance</h2>
        <div className="flex gap-3">
          <button onClick={() => handleThemeChange('dark')}
            className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all border ${theme === 'dark' ? 'border-[#6c5ce7] bg-[#6c5ce7]/5 text-[#6c5ce7]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--muted-foreground))/40]'}`}>
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
              Dark
            </div>
          </button>
          <button onClick={() => handleThemeChange('light')}
            className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all border ${theme === 'light' ? 'border-[#6c5ce7] bg-[#6c5ce7]/5 text-[#6c5ce7]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--muted-foreground))/40]'}`}>
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
              Light
            </div>
          </button>
        </div>
      </section>

      {/* API Tokens */}
      <section className="rounded-xl p-6 space-y-4" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>API Tokens</h2>
          <button onClick={() => { setShowTokenForm(true); setNewTokenValue(''); }} className="text-xs px-3 py-1.5 bg-[#6c5ce7] text-white rounded-lg font-medium hover:bg-[#5a4bd1]">+ New Token</button>
        </div>

        {tokensLoading ? (
          <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-10 rounded-lg bg-[hsl(var(--muted))] animate-pulse" />)}</div>
        ) : tokens.length === 0 && !showTokenForm ? (
          <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>No API tokens created yet.</p>
        ) : (
          <div className="space-y-2">
            {tokens.map(t => (
              <div key={t.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>Created {new Date(t.created).toLocaleDateString()}</p>
                </div>
                <button onClick={() => handleRevokeToken(t.id)} disabled={tokenRevoking === t.id}
                  className="text-xs px-2 py-1 rounded text-[#ff4757] hover:bg-[hsl(0,85%,60%,0.1)] disabled:opacity-50">
                  {tokenRevoking === t.id ? 'Revoking...' : 'Revoke'}
                </button>
              </div>
            ))}
          </div>
        )}

        {showTokenForm && (
          <div className="p-4 rounded-lg space-y-3" style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
            {newTokenValue ? (
              <div className="space-y-3">
                <div className="px-3 py-2 rounded-lg text-sm font-mono break-all bg-[hsl(var(--background))] border border-[hsl(var(--border))]" style={{ color: 'hsl(var(--foreground))' }}>{newTokenValue}</div>
                <p className="text-xs text-[#ffa502]">Copy this token now. You won't be able to see it again.</p>
                <button onClick={() => { navigator.clipboard.writeText(newTokenValue); setTokenMsg('Copied!'); }}
                  className="px-3 py-1.5 bg-[#6c5ce7] text-white rounded-lg text-xs font-medium">Copy to Clipboard</button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Token Name</label>
                  <input type="text" value={newTokenName} onChange={e => setNewTokenName(e.target.value)}
                    placeholder="e.g. ci-cd-token" className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{ background: 'hsl(var(--input))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
                </div>
                <button onClick={handleCreateToken} disabled={tokenCreating || !newTokenName.trim()}
                  className="px-4 py-2 bg-[#6c5ce7] hover:bg-[#5a4bd1] disabled:opacity-50 text-white rounded-lg text-sm font-medium">
                  {tokenCreating ? 'Creating...' : 'Create Token'}
                </button>
              </div>
            )}
            {tokenMsg && <p className={`text-sm ${tokenMsg.startsWith('Error') ? 'text-[#ff4757]' : 'text-[#2ed573]'}`}>{tokenMsg}</p>}
          </div>
        )}
      </section>

      {/* Notification Preferences */}
      <section className="rounded-xl p-6 space-y-4" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>Notifications</h2>
        {prefsLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 rounded-lg bg-[hsl(var(--muted))] animate-pulse" />)}</div>
        ) : (
          <div className="space-y-3">
            <label className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">Discovery Complete</p>
                <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>Notify when a discovery run finishes</p>
              </div>
              <input type="checkbox" checked={notifyDiscovery} onChange={e => setNotifyDiscovery(e.target.checked)}
                className="rounded border-[hsl(var(--border))] text-[#6c5ce7] focus:ring-[#6c5ce7]/30" />
            </label>
            <label className="flex items-center justify-between py-2" style={{ borderTop: '1px solid hsl(var(--border))' }}>
              <div>
                <p className="text-sm font-medium">Drift Detected</p>
                <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>Notify when infrastructure drift is detected</p>
              </div>
              <input type="checkbox" checked={notifyDrift} onChange={e => setNotifyDrift(e.target.checked)}
                className="rounded border-[hsl(var(--border))] text-[#6c5ce7] focus:ring-[#6c5ce7]/30" />
            </label>
            <label className="flex items-center justify-between py-2" style={{ borderTop: '1px solid hsl(var(--border))' }}>
              <div>
                <p className="text-sm font-medium">Changes Detected</p>
                <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>Notify when resources change</p>
              </div>
              <input type="checkbox" checked={notifyChanges} onChange={e => setNotifyChanges(e.target.checked)}
                className="rounded border-[hsl(var(--border))] text-[#6c5ce7] focus:ring-[#6c5ce7]/30" />
            </label>
            <div className="pt-2" style={{ borderTop: '1px solid hsl(var(--border))' }}>
              <label className="text-sm block mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Default Landing Page</label>
              <select value={defaultLanding} onChange={e => setDefaultLanding(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: 'hsl(var(--input))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                <option value="/">Dashboard</option>
                <option value="/search">Search</option>
                <option value="/graph">Graph</option>
                <option value="/changes">Changes</option>
                <option value="/docs">Documentation</option>
              </select>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button onClick={savePreferences} disabled={prefsSaving}
                className="px-4 py-2 bg-[#6c5ce7] hover:bg-[#5a4bd1] disabled:opacity-50 text-white rounded-lg text-sm font-medium">
                {prefsSaving ? 'Saving...' : 'Save Preferences'}
              </button>
              {prefsMsg && <span className={`text-sm ${prefsMsg.startsWith('Error') ? 'text-[#ff4757]' : 'text-[#2ed573]'}`}>{prefsMsg}</span>}
            </div>
          </div>
        )}
      </section>

      {/* Change Password */}
      <section className="rounded-xl p-6 space-y-4" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>Change Password</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm block mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Current Password</label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'hsl(var(--input))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
          </div>
          <div>
            <label className="text-sm block mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>New Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'hsl(var(--input))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
          </div>
          <div>
            <label className="text-sm block mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'hsl(var(--input))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
          </div>
          <button onClick={handleChangePassword} disabled={pwChanging || !currentPassword || !newPassword || !confirmPassword}
            className="px-4 py-2 bg-[#6c5ce7] hover:bg-[#5a4bd1] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all">
            {pwChanging ? 'Changing...' : 'Change Password'}
          </button>
          {pwMsg && <p className={`text-sm ${pwMsg.startsWith('Error') ? 'text-[#ff4757]' : 'text-[#2ed573]'}`}>{pwMsg}</p>}
        </div>
      </section>

      {/* System */}
      <section className="rounded-xl p-6 space-y-4" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>System</h2>
        <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>LLM configuration, cloud connectors, webhooks, and user management are in the Admin panel.</p>
        <button onClick={() => navigate('/admin')}
          className="px-4 py-2 bg-[#6c5ce7] hover:bg-[#5a4bd1] text-white rounded-lg text-sm font-medium transition-all">
          Go to Admin Panel
        </button>
      </section>
    </div>
  );
}
