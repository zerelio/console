const scopes = [
  {
    id: "prod-aws",
    name: "Production AWS",
    plugin: "aws",
    pluginIcon: "☁️",
    config: { region: "us-east-1", account_id: "123456789012", include_tags: true },
    schedule: "Every 5 min",
    credential: "AWS Production Keys",
    lastRun: "2 min ago",
    lastDuration: "1m 23s",
    resourcesFound: 847,
    status: "active",
  },
  {
    id: "staging-k8s",
    name: "Staging K8s",
    plugin: "k8s",
    pluginIcon: "⚙️",
    config: { cluster: "zerelio-staging", namespace: "default", include_secrets: false },
    schedule: "Every 15 min",
    credential: "K8s ServiceAccount",
    lastRun: "8 min ago",
    lastDuration: "0m 45s",
    resourcesFound: 429,
    status: "active",
  },
  {
    id: "github-org",
    name: "GitHub Org",
    plugin: "github",
    pluginIcon: "🐙",
    config: { org: "zerelio", include_archived: false, include_forks: true },
    schedule: "Every 30 min",
    credential: "GitHub Token",
    lastRun: "12 min ago",
    lastDuration: "2m 10s",
    resourcesFound: 312,
    status: "active",
  },
];

export default function ScopesPage() {
  return (
    <main className="flex-1 p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Scopes</h1>
          <p className="text-sm mt-1" style={{ color: "#71717a" }}>
            Discovery scopes define what a plugin discovers and how often
          </p>
        </div>
        <button
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: "#6366f1" }}
        >
          + New Scope
        </button>
      </div>

      {/* Scope cards */}
      <div className="grid gap-5">
        {scopes.map((scope) => (
          <div
            key={scope.id}
            className="rounded-xl border p-6"
            style={{ background: "#1a1a1a", borderColor: "#262626" }}
          >
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ background: "#262626" }}
                >
                  {scope.pluginIcon}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">{scope.name}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-mono" style={{ color: "#52525b" }}>
                      plugin: {scope.plugin}
                    </span>
                    <span className="text-xs" style={{ color: "#52525b" }}>·</span>
                    <span className="text-xs" style={{ color: "#52525b" }}>
                      🕒 {scope.schedule}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80" }}
                >
                  <span className="w-1 h-1 rounded-full bg-green-400" />
                  {scope.status}
                </span>
                <button
                  className="text-xs px-3 py-1.5 rounded-md text-white transition-opacity hover:opacity-90"
                  style={{ background: "#6366f1" }}
                >
                  ▶ Run Now
                </button>
                <button
                  className="text-xs px-3 py-1.5 rounded-md border transition-colors"
                  style={{ borderColor: "#2a2a2a", color: "#71717a" }}
                >
                  Edit
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Config */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#52525b" }}>
                  Config
                </div>
                <div
                  className="rounded-lg p-3 font-mono text-xs space-y-1"
                  style={{ background: "#111", color: "#a1a1aa" }}
                >
                  {Object.entries(scope.config).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <span style={{ color: "#6366f1" }}>{k}</span>
                      <span style={{ color: "#71717a" }}>{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Credential */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#52525b" }}>
                  Credential
                </div>
                <div
                  className="rounded-lg p-3 text-xs"
                  style={{ background: "#111", color: "#a1a1aa" }}
                >
                  <div className="flex items-center gap-2">
                    <span style={{ color: "#52525b" }}>🔑</span>
                    <span>{scope.credential}</span>
                  </div>
                  <div className="mt-1.5 text-xs" style={{ color: "#3f3f46" }}>
                    Injected at runtime
                  </div>
                </div>
              </div>

              {/* Last run */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#52525b" }}>
                  Last Run
                </div>
                <div
                  className="rounded-lg p-3 text-xs space-y-2"
                  style={{ background: "#111" }}
                >
                  <div className="flex justify-between">
                    <span style={{ color: "#52525b" }}>when</span>
                    <span style={{ color: "#a1a1aa" }}>{scope.lastRun}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "#52525b" }}>duration</span>
                    <span className="font-mono" style={{ color: "#a1a1aa" }}>{scope.lastDuration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "#52525b" }}>resources</span>
                    <span className="font-mono" style={{ color: "#818cf8" }}>{scope.resourcesFound.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
