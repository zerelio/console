const runs = [
  {
    id: "run-5a2f3b",
    scope: "Production AWS",
    plugin: "aws",
    pluginIcon: "☁️",
    status: "completed",
    startedAt: "2026-11-21 12:08:14",
    duration: "1m 23s",
    resourcesFound: 847,
    relationships: 1203,
    events: 1204,
    errors: 0,
  },
  {
    id: "run-7c1e9d",
    scope: "Staging K8s",
    plugin: "k8s",
    pluginIcon: "⚙️",
    status: "completed",
    startedAt: "2026-11-21 12:02:05",
    duration: "0m 45s",
    resourcesFound: 429,
    relationships: 876,
    events: 876,
    errors: 0,
  },
  {
    id: "run-2b8d4c",
    scope: "GitHub Org",
    plugin: "github",
    pluginIcon: "🐙",
    status: "completed",
    startedAt: "2026-11-21 11:58:33",
    duration: "2m 10s",
    resourcesFound: 312,
    relationships: 455,
    events: 456,
    errors: 0,
  },
];

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
        style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80" }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        completed
      </span>
    );
  }
  if (status === "running") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
        style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
        running
      </span>
    );
  }
  return (
    <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "#262626", color: "#71717a" }}>
      {status}
    </span>
  );
}

export default function RunsPage() {
  const totalResources = runs.reduce((s, r) => s + r.resourcesFound, 0);
  const totalEvents = runs.reduce((s, r) => s + r.events, 0);

  return (
    <main className="flex-1 p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Run History</h1>
          <p className="text-sm mt-1" style={{ color: "#71717a" }}>
            Discovery run log · {runs.length} recent runs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="text-xs px-3 py-1.5 rounded-md border transition-colors"
            style={{ borderColor: "#2a2a2a", color: "#71717a" }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Runs", value: runs.length.toString(), sub: "this session" },
          { label: "Resources Found", value: totalResources.toLocaleString(), sub: "across all runs" },
          { label: "Events Processed", value: totalEvents.toLocaleString(), sub: "ResourceEvent · RelationshipEvent" },
        ].map(({ label, value, sub }) => (
          <div
            key={label}
            className="rounded-xl border px-5 py-4"
            style={{ background: "#1a1a1a", borderColor: "#262626" }}
          >
            <div className="text-xs mb-1" style={{ color: "#52525b" }}>{label}</div>
            <div className="text-2xl font-semibold text-white">{value}</div>
            <div className="text-xs mt-1" style={{ color: "#3f3f46" }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "#1a1a1a", borderColor: "#262626" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid #262626" }}>
              {["Run ID", "Scope", "Plugin", "Status", "Started", "Duration", "Resources", "Events", "Errors"].map((h) => (
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
            {runs.map((run, i) => (
              <tr
                key={run.id}
                style={{ borderBottom: i < runs.length - 1 ? "1px solid #1f1f1f" : "none" }}
                className="hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-5 py-3.5 font-mono text-xs" style={{ color: "#6366f1" }}>
                  {run.id}
                </td>
                <td className="px-5 py-3.5 font-medium text-white text-sm">{run.scope}</td>
                <td className="px-5 py-3.5">
                  <span className="flex items-center gap-2 text-xs" style={{ color: "#a1a1aa" }}>
                    {run.pluginIcon} {run.plugin}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={run.status} />
                </td>
                <td className="px-5 py-3.5 text-xs font-mono" style={{ color: "#71717a" }}>
                  {run.startedAt}
                </td>
                <td className="px-5 py-3.5 text-xs font-mono" style={{ color: "#a1a1aa" }}>
                  {run.duration}
                </td>
                <td className="px-5 py-3.5 text-sm font-mono font-semibold" style={{ color: "#818cf8" }}>
                  {run.resourcesFound.toLocaleString()}
                </td>
                <td className="px-5 py-3.5 text-xs font-mono" style={{ color: "#71717a" }}>
                  {run.events.toLocaleString()}
                </td>
                <td className="px-5 py-3.5 text-xs font-mono" style={{ color: run.errors > 0 ? "#f87171" : "#3f3f46" }}>
                  {run.errors}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
