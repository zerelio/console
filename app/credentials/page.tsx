const credentials = [
  {
    id: "aws-keys",
    name: "AWS Production Keys",
    type: "env",
    plugin: "aws",
    pluginIcon: "☁️",
    keys: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"],
    maskedValues: ["AKIA••••••••••XXYZ", "••••••••••••••••••••••••", "us-east-1"],
    lastUsed: "2 min ago",
    status: "active",
    description: "IAM access keys for Production AWS account (123456789012)",
  },
  {
    id: "gh-token",
    name: "GitHub Token",
    type: "static",
    plugin: "github",
    pluginIcon: "🐙",
    keys: ["GITHUB_TOKEN"],
    maskedValues: ["ghp_••••••••••••••••••••••••••••••••••••••"],
    lastUsed: "12 min ago",
    status: "active",
    description: "GitHub PAT with read:org, repo, and read:user scopes",
  },
  {
    id: "slack-token",
    name: "Slack Bot Token",
    type: "env",
    plugin: "slack",
    pluginIcon: "💬",
    keys: ["SLACK_BOT_TOKEN"],
    maskedValues: ["xoxb-••••••••••-••••••••••-••••••••••••••••"],
    lastUsed: "5 min ago",
    status: "active",
    description: "Slack Bot OAuth token for Zerelio discovery app",
  },
];

const typeBadgeStyle: Record<string, { bg: string; color: string }> = {
  env:    { bg: "rgba(99,102,241,0.12)",  color: "#818cf8" },
  static: { bg: "rgba(251,191,36,0.1)",   color: "#fbbf24" },
  file:   { bg: "rgba(52,211,153,0.1)",   color: "#34d399" },
};

export default function CredentialsPage() {
  return (
    <main className="flex-1 p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Credentials</h1>
          <p className="text-sm mt-1" style={{ color: "#71717a" }}>
            Credential sets injected into scopes at discovery runtime
          </p>
        </div>
        <button
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: "#6366f1" }}
        >
          + Add Credential
        </button>
      </div>

      {/* Type legend */}
      <div className="flex gap-4 mb-6">
        {[
          { type: "env",    desc: "Injected via environment variable" },
          { type: "static", desc: "Hard-coded static value (encrypted at rest)" },
          { type: "file",   desc: "Mounted credential file (e.g. kubeconfig, pem)" },
        ].map(({ type, desc }) => (
          <div
            key={type}
            className="flex items-center gap-2 text-xs rounded-lg px-3 py-1.5 border"
            style={{ background: "#1a1a1a", borderColor: "#262626" }}
          >
            <span
              className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded"
              style={typeBadgeStyle[type]}
            >
              {type}
            </span>
            <span style={{ color: "#71717a" }}>{desc}</span>
          </div>
        ))}
      </div>

      {/* Credential cards */}
      <div className="grid gap-5">
        {credentials.map((cred) => {
          const badge = typeBadgeStyle[cred.type] ?? typeBadgeStyle.env;
          return (
            <div
              key={cred.id}
              className="rounded-xl border p-6"
              style={{ background: "#1a1a1a", borderColor: "#262626" }}
            >
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ background: "#262626" }}
                  >
                    {cred.pluginIcon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-white">{cred.name}</h2>
                      <span
                        className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded"
                        style={badge}
                      >
                        {cred.type}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: "#71717a" }}>
                      {cred.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs" style={{ color: "#52525b" }}>Last used</div>
                    <div className="text-xs mt-0.5" style={{ color: "#a1a1aa" }}>{cred.lastUsed}</div>
                  </div>
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80" }}
                  >
                    <span className="w-1 h-1 rounded-full bg-green-400" />
                    {cred.status}
                  </span>
                  <button
                    className="text-xs px-3 py-1.5 rounded-md border transition-colors"
                    style={{ borderColor: "#2a2a2a", color: "#71717a" }}
                  >
                    Rotate
                  </button>
                  <button
                    className="text-xs px-3 py-1.5 rounded-md border transition-colors"
                    style={{ borderColor: "#2a2a2a", color: "#71717a" }}
                  >
                    Edit
                  </button>
                </div>
              </div>

              {/* Keys table */}
              <div
                className="rounded-lg border overflow-hidden"
                style={{ borderColor: "#262626" }}
              >
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #262626", background: "#111" }}>
                      <th className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider" style={{ color: "#52525b" }}>
                        Key
                      </th>
                      <th className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider" style={{ color: "#52525b" }}>
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {cred.keys.map((key, i) => (
                      <tr
                        key={key}
                        style={{ borderBottom: i < cred.keys.length - 1 ? "1px solid #1f1f1f" : "none" }}
                      >
                        <td className="px-4 py-2.5 font-mono font-semibold" style={{ color: "#6366f1" }}>
                          {key}
                        </td>
                        <td className="px-4 py-2.5 font-mono" style={{ color: "#52525b" }}>
                          {cred.maskedValues[i]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: "#3f3f46" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Encrypted at rest · Ed25519 JWT auth · zerelio/console
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
