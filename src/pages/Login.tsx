import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface SSOProvider {
  name: string;
  label: string;
}

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ssoProviders, setSsoProviders] = useState<SSOProvider[]>([]);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from || '/';

  useEffect(() => {
    document.title = 'Login - Zerelio';
    fetch('/api/v1/auth/sso/status')
      .then(r => r.json())
      .then(d => {
        const data = d.data || d;
        setSsoProviders(data?.providers || []);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-center h-full animate-fade animate-slide-up">
      <div className="w-full max-w-sm mx-auto p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe] flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-lg font-bold">Z</span>
          </div>
          <h1 className="text-xl font-semibold">Zerelio</h1>
          <p className="text-sm text-[#8b8b8e] mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-900/20 border border-red-900/40 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm text-[#8b8b8e] block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              className="w-full px-3 py-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:border-[#6c5ce7]/50"
            />
          </div>

          <div>
            <label className="text-sm text-[#8b8b8e] block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="admin123"
              required
              className="w-full px-3 py-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:border-[#6c5ce7]/50"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-[#6c5ce7] hover:bg-[#5a4bd1] disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-[#6c5ce7]/20"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {ssoProviders.length > 0 && (
          <>
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px" style={{ background: 'hsl(var(--border))' }} />
              <span className="text-xs text-[#5c5c5e]">or</span>
              <div className="flex-1 h-px" style={{ background: 'hsl(var(--border))' }} />
            </div>
            <div className="space-y-2">
              {ssoProviders.map(p => (
                <button key={p.name} onClick={() => { window.location.href = '/api/v1/auth/sso/' + p.name; }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                  Continue with {p.label}
                </button>
              ))}
            </div>
          </>
        )}

        <p className="text-xs text-[#5c5c5e] text-center mt-6">
          Demo credentials: admin@example.com / admin123
        </p>
      </div>
    </div>
  );
}
