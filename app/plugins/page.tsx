const plugins = [
  { id: "aws",        name: "AWS",        version: "1.3.2", status: "enabled", lastDiscovered: "2 min ago",  resources: 847, events: 1204, latency: "1.2s" },
  { id: "slack",      name: "Slack",      version: "0.9.1", status: "enabled", lastDiscovered: "5 min ago",  resources: 23,  events: 48,   latency: "0.3s" },
  { id: "github",     name: "GitHub",     version: "1.1.0", status: "enabled", lastDiscovered: "8 min ago",  resources: 312, events: 456,  latency: "0.9s" },
  { id: "grafana",    name: "Grafana",    version: "0.7.4", status: "enabled", lastDiscovered: "12 min ago", resources: 56,  events: 103,  latency: "0.4s" },
  { id: "pagerduty",  name: "PagerDuty",  version: "0.5.2", status: "enabled", lastDiscovered: "15 min ago", resources: 18,  events: 29,   latency: "0.5s" },
  { id: "dns",        name: "DNS",        version: "1.0.3", status: "enabled", lastDiscovered: "20 min ago", resources: 134, events: 201,  latency: "0.2s" },
  { id: "k8s",        name: "Kubernetes", version: "2.0.1", status: "enabled", lastDiscovered: "25 min ago", resources: 429, events: 876,  latency: "0.8s" },
];

const pluginIcons: Record<string, string> = {
  aws: "☁️", slack: "💬", github: "🐙", grafana: "📊",
  pagerduty: "🚨", dns: "🌐", k8s: "⚙️",
};

export default function PluginsPage() {
  return (
    <main className="flex-1 p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Plugins</h1>
          <p className="text-sm mt-1" style={{ color: "#71717a" }}>
            {plugins.length} plugins registered · all operational
          </p>
        </div>
        <button
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: "#6366f1" }}
        >
          + Register Plugin
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "#1a1a1a", borderColor: "#262626" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid #262626" }}>
              {["Plugin", "Version", "Status", "Resources", "Events", "Latency", "Last Discovered", "Actions"].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "#52525b" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plugins.map((p, i) => (
              <tr
                key={p.id}
                style={{ borderBottom: i < plugins.length - 1 ? "1px solid #1f1f1f" : "none" }}
                className="hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{pluginIcons[p.id]}</span>
                    <div>
                      <div className="font-medium text-white">{p.name}</div>
                      <div className="text-xs mt-0.5 font-mono" style={{ color: "#52525b" }}>
                        zerelio/{p.id}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: "#262626", color: "#a1a1aa" }}>
                    v{p.version}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80" }}
                  >
                    <span className="w-1 h-1 rounded-full bg-green-400" />
                    {p.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 font-mono text-sm" style={{ color: "#e5e7eb" }}>
                  {p.resources.toLocaleString()}
                </td>
                <td className="px-5 py-3.5 font-mono text-sm" style={{ color: "#71717a" }}>
                  {p.events.toLocaleString()}
                </td>
                <td className="px-5 py-3.5 font-mono text-xs" style={{ color: "#71717a" }}>
                  {p.latency}
                </td>
                <td className="px-5 py-3.5 text-xs" style={{ color: "#71717a" }}>
                  {p.lastDiscovered}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <button
                      className="text-xs px-3 py-1 rounded-md border transition-colors hover:border-indigo-500/50 hover:text-indigo-400"
                      style={{ borderColor: "#2a2a2a", color: "#71717a" }}
                    >
                      Discover
                    </button>
                    <button
                      className="text-xs px-3 py-1 rounded-md border transition-colors"
                      style={{ borderColor: "#2a2a2a", color: "#52525b" }}
                    >
                      Config
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* gRPC transport note */}
      <div
        className="mt-4 flex items-center gap-2 text-xs rounded-lg px-4 py-3 border"
        style={{ background: "rgba(99,102,241,0.05)", borderColor: "rgba(99,102,241,0.2)", color: "#818cf8" }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
        </svg>
        Plugins connect via gRPC (hashicorp/go-plugin). Events: ResourceEvent · RelationshipEvent · ProgressEvent · ErrorEvent
      </div>
    </main>
  );
}
