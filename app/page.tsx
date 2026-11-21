import Link from "next/link";

const stats = [
  {
    label: "Total Plugins",
    value: "7",
    sub: "all operational",
    href: "/plugins",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 7h-9" /><path d="M14 17H5" />
        <circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" />
      </svg>
    ),
    color: "#6366f1",
    bgColor: "rgba(99,102,241,0.1)",
  },
  {
    label: "Active Scopes",
    value: "3",
    sub: "Production AWS · Staging K8s · GitHub Org",
    href: "/scopes",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
    ),
    color: "#818cf8",
    bgColor: "rgba(129,140,248,0.1)",
  },
  {
    label: "Recent Runs",
    value: "3",
    sub: "all completed · no errors",
    href: "/runs",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
    color: "#34d399",
    bgColor: "rgba(52,211,153,0.1)",
  },
  {
    label: "System Status",
    value: "Online",
    sub: "MCP · Orchestrator · PostgreSQL",
    href: "/",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    color: "#4ade80",
    bgColor: "rgba(74,222,128,0.1)",
  },
];

const recentRuns = [
  { id: "run-5a2f3b", scope: "Production AWS", plugin: "aws", icon: "☁️", status: "completed", resources: 847, duration: "1m 23s", ago: "2m ago" },
  { id: "run-7c1e9d", scope: "Staging K8s",    plugin: "k8s",  icon: "⚙️", status: "completed", resources: 429, duration: "0m 45s", ago: "10m ago" },
  { id: "run-2b8d4c", scope: "GitHub Org",      plugin: "github", icon: "🐙", status: "completed", resources: 312, duration: "2m 10s", ago: "13m ago" },
];

const pluginSummary = [
  { id: "aws",       name: "AWS",        icon: "☁️", resources: 847,  status: "enabled" },
  { id: "k8s",       name: "Kubernetes", icon: "⚙️", resources: 429,  status: "enabled" },
  { id: "github",    name: "GitHub",     icon: "🐙", resources: 312,  status: "enabled" },
  { id: "dns",       name: "DNS",        icon: "🌐", resources: 134,  status: "enabled" },
  { id: "grafana",   name: "Grafana",    icon: "📊", resources: 56,   status: "enabled" },
  { id: "pagerduty", name: "PagerDuty",  icon: "🚨", resources: 18,   status: "enabled" },
  { id: "slack",     name: "Slack",      icon: "💬", resources: 23,   status: "enabled" },
];

const totalResources = pluginSummary.reduce((s, p) => s + p.resources, 0);

export default function DashboardPage() {
  return (
    <main className="flex-1 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8" }}>
            LIVE
          </span>
          <span className="text-xs" style={{ color: "#52525b" }}>Last updated: just now</span>
        </div>
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "#71717a" }}>
          Zerelio Infrastructure Discovery — {totalResources.toLocaleString()} resources indexed
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, sub, href, icon, color, bgColor }) => (
          <Link
            key={label}
            href={href}
            className="rounded-xl border p-5 flex flex-col gap-3 transition-all hover:border-indigo-500/30"
            style={{ background: "#1a1a1a", borderColor: "#262626" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "#52525b" }}>
                {label}
              </span>
              <span className="p-1.5 rounded-lg" style={{ background: bgColor, color }}>
                {icon}
              </span>
            </div>
            <div>
              <div className="text-3xl font-semibold" style={{ color }}>{value}</div>
              <div className="text-xs mt-1 leading-relaxed" style={{ color: "#52525b" }}>{sub}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Recent runs */}
        <div className="col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Recent Runs</h2>
            <Link href="/runs" className="text-xs transition-colors hover:text-indigo-400" style={{ color: "#52525b" }}>
              View all →
            </Link>
          </div>
          <div className="rounded-xl border overflow-hidden" style={{ background: "#1a1a1a", borderColor: "#262626" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #262626" }}>
                  {["Scope", "Plugin", "Status", "Resources", "Duration", "When"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#52525b" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run, i) => (
                  <tr
                    key={run.id}
                    style={{ borderBottom: i < recentRuns.length - 1 ? "1px solid #1f1f1f" : "none" }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-white text-sm">{run.scope}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#a1a1aa" }}>
                      {run.icon} {run.plugin}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80" }}>
                        ✓ {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm font-semibold" style={{ color: "#818cf8" }}>
                      {run.resources.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "#71717a" }}>{run.duration}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#52525b" }}>{run.ago}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Plugin resource breakdown */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Resources by Plugin</h2>
            <Link href="/plugins" className="text-xs transition-colors hover:text-indigo-400" style={{ color: "#52525b" }}>
              Manage →
            </Link>
          </div>
          <div className="rounded-xl border p-4 space-y-3" style={{ background: "#1a1a1a", borderColor: "#262626" }}>
            {pluginSummary.map((p) => {
              const pct = Math.round((p.resources / totalResources) * 100);
              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-2 text-sm" style={{ color: "#a1a1aa" }}>
                      {p.icon} {p.name}
                    </span>
                    <span className="font-mono text-xs font-semibold" style={{ color: "#818cf8" }}>
                      {p.resources.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1 rounded-full" style={{ background: "#262626" }}>
                    <div
                      className="h-1 rounded-full"
                      style={{ width: `${pct}%`, background: "linear-gradient(90deg, #6366f1, #818cf8)" }}
                    />
                  </div>
                </div>
              );
            })}
            <div
              className="pt-3 mt-3 border-t flex items-center justify-between text-xs"
              style={{ borderColor: "#262626" }}
            >
              <span style={{ color: "#52525b" }}>Total resources</span>
              <span className="font-mono font-bold" style={{ color: "#6366f1" }}>{totalResources.toLocaleString()}</span>
            </div>
          </div>

          {/* System health */}
          <div className="mt-4 rounded-xl border p-4" style={{ background: "#1a1a1a", borderColor: "#262626" }}>
            <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#52525b" }}>System Health</div>
            {[
              { name: "MCP Server",    status: "online", latency: "2ms" },
              { name: "Orchestrator",  status: "online", latency: "1ms" },
              { name: "PostgreSQL",    status: "online", latency: "4ms" },
              { name: "Auth (Ed25519 JWT)", status: "online", latency: "—" },
            ].map(({ name, status, latency }) => (
              <div key={name} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                  <span className="text-xs" style={{ color: "#a1a1aa" }}>{name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono" style={{ color: "#52525b" }}>{latency}</span>
                  <span className="text-xs" style={{ color: "#4ade80" }}>{status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
