'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/components/AuthProvider';
import { getApiUrl } from '@/app/lib/api';

interface OIDCStatus {
  enabled: boolean;
  authorize_url?: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oidcStatus, setOidcStatus] = useState<OIDCStatus | null>(null);

  useEffect(() => {
    fetch(`${getApiUrl()}/api/v1/auth/oidc/status`)
      .then((r) => r.json())
      .then((d: OIDCStatus) => setOidcStatus(d))
      .catch(() => setOidcStatus({ enabled: false }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSSOLogin = () => {
    const returnUrl = encodeURIComponent('/');
    window.location.href = `${getApiUrl()}/api/v1/auth/oidc/authorize?return_url=${returnUrl}`;
  };

  return (
    <div
      className="flex-1 flex items-center justify-center"
      style={{ background: '#0a0a0a' }}
    >
      <div className="w-full max-w-sm px-4">
        {/* Brand */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#6366f1' }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
            </svg>
          </div>
          <div>
            <div className="text-lg font-semibold text-white leading-none">Zerelio</div>
            <div className="text-xs mt-0.5" style={{ color: '#52525b' }}>
              Infrastructure Discovery
            </div>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border p-8"
          style={{ background: '#1a1a1a', borderColor: '#262626' }}
        >
          <h1 className="text-xl font-semibold text-white mb-1">Sign in</h1>
          <p className="text-sm mb-6" style={{ color: '#71717a' }}>
            Enter your credentials to access the console
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: '#a1a1aa' }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-zinc-600 outline-none transition-colors"
                style={{ background: '#111', border: '1px solid #262626' }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = '#6366f1')
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = '#262626')
                }
              />
            </div>

            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: '#a1a1aa' }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-zinc-600 outline-none transition-colors"
                style={{ background: '#111', border: '1px solid #262626' }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = '#6366f1')
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = '#262626')
                }
              />
            </div>

            {error && (
              <div
                className="text-xs rounded-lg px-3 py-2.5"
                style={{
                  background: 'rgba(248,113,113,0.1)',
                  color: '#f87171',
                  border: '1px solid rgba(248,113,113,0.2)',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: '#6366f1' }}
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {oidcStatus?.enabled && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: '#262626' }} />
                <span className="text-xs" style={{ color: '#52525b' }}>
                  or
                </span>
                <div className="flex-1 h-px" style={{ background: '#262626' }} />
              </div>
              <button
                onClick={handleSSOLogin}
                className="w-full py-2.5 rounded-lg text-sm font-medium transition-colors border"
                style={{
                  borderColor: '#262626',
                  color: '#a1a1aa',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#6366f1';
                  (e.currentTarget as HTMLElement).style.color = '#818cf8';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#262626';
                  (e.currentTarget as HTMLElement).style.color = '#a1a1aa';
                }}
              >
                Sign in with SSO
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
