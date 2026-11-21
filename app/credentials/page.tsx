'use client';

const typeBadgeStyle: Record<string, { bg: string; color: string }> = {
  env: { bg: 'rgba(99,102,241,0.12)', color: '#818cf8' },
  static: { bg: 'rgba(251,191,36,0.1)', color: '#fbbf24' },
  file: { bg: 'rgba(52,211,153,0.1)', color: '#34d399' },
};

const providers = [
  {
    type: 'env',
    title: 'Environment Variable',
    description:
      'Credentials are read directly from the process environment. The plugin receives the value of the named variable at discovery time.',
    example: `{
  "config": {
    "credential": {
      "type": "env",
      "key": "AWS_ACCESS_KEY_ID"
    }
  }
}`,
  },
  {
    type: 'file',
    title: 'Filesystem File',
    description:
      'Credentials are read from a file on the filesystem — useful for mounted secrets (Kubernetes secrets, Docker secrets, PEM files, kubeconfigs).',
    example: `{
  "config": {
    "credential": {
      "type": "file",
      "path": "/run/secrets/api_key"
    }
  }
}`,
  },
  {
    type: 'static',
    title: 'Inline Static Value',
    description:
      'An inline credential value stored directly in the scope config. Values are encrypted at rest using Ed25519 keys and never logged.',
    example: `{
  "config": {
    "credential": {
      "type": "static",
      "value": "ghp_xxxxxxxxxxxxxxxxxxxx"
    }
  }
}`,
  },
];

export default function CredentialsPage() {
  return (
    <main className="flex-1 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Credentials</h1>
        <p className="text-sm mt-1" style={{ color: '#71717a' }}>
          Credentials are configured as environment variables or inline scope config — not stored
          as managed objects.
        </p>
      </div>

      {/* Info banner */}
      <div
        className="mb-8 rounded-xl border px-5 py-4 flex gap-4"
        style={{
          background: 'rgba(99,102,241,0.06)',
          borderColor: 'rgba(99,102,241,0.2)',
        }}
      >
        <div className="mt-0.5 flex-shrink-0">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#818cf8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-medium" style={{ color: '#818cf8' }}>
            How credentials work in Zerelio
          </div>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: '#71717a' }}>
            Each discovery scope includes a <span className="font-mono text-indigo-400">credential</span> block
            inside its <span className="font-mono text-indigo-400">config</span> JSON. The Zerelio
            orchestrator resolves the credential at runtime using one of the three providers below and
            injects it into the plugin's execution context. No credential values are stored in the
            database — only the provider type and reference key.
          </p>
        </div>
      </div>

      {/* Provider cards */}
      <div className="grid gap-5">
        {providers.map((p) => {
          const badge = typeBadgeStyle[p.type];
          return (
            <div
              key={p.type}
              className="rounded-xl border p-6"
              style={{ background: '#1a1a1a', borderColor: '#262626' }}
            >
              {/* Card header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: '#262626' }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={badge.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-white">{p.title}</h2>
                    <span
                      className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      {p.type}
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: '#71717a' }}>
                    {p.description}
                  </p>
                </div>
              </div>

              {/* Code example */}
              <div>
                <div
                  className="text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: '#52525b' }}
                >
                  Scope config example
                </div>
                <pre
                  className="rounded-lg p-4 font-mono text-xs leading-relaxed overflow-x-auto"
                  style={{ background: '#111', color: '#a1a1aa' }}
                >
                  {p.example.split('\n').map((line, idx) => {
                    // Colour-code JSON keys vs values
                    const keyMatch = line.match(/^(\s*)"([^"]+)"(\s*:\s*)(.*)$/);
                    if (keyMatch) {
                      return (
                        <span key={idx}>
                          {keyMatch[1]}
                          <span style={{ color: '#6366f1' }}>&quot;{keyMatch[2]}&quot;</span>
                          {keyMatch[3]}
                          <span style={{ color: '#71717a' }}>{keyMatch[4]}</span>
                          {'\n'}
                        </span>
                      );
                    }
                    return (
                      <span key={idx} style={{ color: '#52525b' }}>
                        {line}
                        {'\n'}
                      </span>
                    );
                  })}
                </pre>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div
        className="mt-6 flex items-center gap-2 text-xs rounded-lg px-4 py-3 border"
        style={{ background: '#1a1a1a', borderColor: '#262626', color: '#52525b' }}
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Static values encrypted at rest · Ed25519 JWT auth · zerelio/console
      </div>
    </main>
  );
}
