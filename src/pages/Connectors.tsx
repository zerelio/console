import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AuthMethod {
  id: string;
  label: string;
  description: string;
  fields: { key: string; label: string; type: string }[];
}

interface ProviderConfig {
  auth_methods: AuthMethod[];
}

const PROVIDER_META: Record<string, { color: string; description: string }> = {
  aws: { color: '#ff9900', description: 'Amazon Web Services' },
  azure: { color: '#0078d4', description: 'Microsoft Azure' },
  gcp: { color: '#4285f4', description: 'Google Cloud Platform' },
  kubernetes: { color: '#326ce5', description: 'Container Orchestration' },
  github: { color: '#6e7681', description: 'Source Control' },
  grafana: { color: '#f46800', description: 'Monitoring & Dashboards' },
  prometheus: { color: '#e6522c', description: 'Metrics & Alerting' },
  jira: { color: '#0052cc', description: 'Issue Tracking' },
  confluence: { color: '#172b4d', description: 'Documentation' },
  slack: { color: '#4a154b', description: 'Communication' },
  elasticsearch: { color: '#00bfb3', description: 'Search & Analytics' },
  datadog: { color: '#632ca6', description: 'Infrastructure Monitoring' },
  cloudflare: { color: '#f38020', description: 'CDN & Security' },
  pagerduty: { color: '#04ac38', description: 'Incident Management' },
  newrelic: { color: '#1ce783', description: 'Application Monitoring' },
  servicenow: { color: '#81b5a1', description: 'IT Service Management' },
  vsphere: { color: '#107c10', description: 'Virtualization' },
  mongodb: { color: '#47a248', description: 'Document Database' },
  mysql: { color: '#4479a1', description: 'Relational Database' },
  postgresql: { color: '#336791', description: 'Relational Database' },
  codegraph: { color: '#a855f7', description: 'Code Structure (CodeGraph)' },
  terraform: { color: '#844fba', description: 'Terraform / OpenTofu State Import' },
};

// PROVIDER_CONFIGS maps each plugin to its auth methods and fields.
// Every field key must match the plugin's Go struct json tag exactly.
// Source: plugins/<name>/plugin.go type *Config struct.
const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  aws: { auth_methods: [
    { id: 'access_key', label: 'Access Key', description: 'IAM user access keys', fields: [
      { key: 'access_key_id', label: 'Access Key ID', type: 'text' },
      { key: 'secret_access_key', label: 'Secret Access Key', type: 'password' },
      { key: 'session_token', label: 'Session Token (optional)', type: 'password' },
      { key: 'region', label: 'Region', type: 'text' },
      { key: 'regions', label: 'Regions (comma-separated, optional)', type: 'text' },
      { key: 'profile', label: 'AWS Profile (optional)', type: 'text' },
    ]},
    { id: 'assume_role', label: 'STS AssumeRole', description: 'Cross-account via role ARN (uses default cred chain for base session)', fields: [
      { key: 'region', label: 'Region', type: 'text' },
      { key: 'assume_role_arn', label: 'Role ARN', type: 'text' },
      { key: 'account_id', label: 'Target Account ID', type: 'text' },
      { key: 'access_key_id', label: 'Access Key ID (optional)', type: 'text' },
      { key: 'secret_access_key', label: 'Secret Access Key (optional)', type: 'password' },
    ]},
  ]},
  azure: { auth_methods: [
    { id: 'service_principal', label: 'Service Principal', description: 'Azure AD app + client secret', fields: [
      { key: 'subscription_id', label: 'Subscription ID', type: 'text' },
      { key: 'tenant_id', label: 'Tenant ID', type: 'text' },
      { key: 'client_id', label: 'Client ID', type: 'text' },
      { key: 'client_secret', label: 'Client Secret', type: 'password' },
    ]},
    { id: 'managed_identity', label: 'Managed Identity', description: 'Azure Managed Identity (VM/App Service identity)', fields: [
      { key: 'subscription_id', label: 'Subscription ID', type: 'text' },
    ]},
  ]},
  gcp: { auth_methods: [
    { id: 'credentials_file', label: 'Credentials File', description: 'Path to service account JSON key file on disk', fields: [
      { key: 'project_id', label: 'Project ID', type: 'text' },
      { key: 'credentials_file', label: 'Credentials File Path', type: 'text' },
    ]},
  ]},
  kubernetes: { auth_methods: [
    { id: 'kubeconfig', label: 'Kubeconfig', description: 'Path to kubeconfig file', fields: [
      { key: 'kubeconfig_path', label: 'Kubeconfig Path', type: 'text' },
      { key: 'context', label: 'Context (optional)', type: 'text' },
      { key: 'namespaces', label: 'Namespaces (comma-separated, optional)', type: 'text' },
    ]},
  ]},
  github: { auth_methods: [
    { id: 'pat', label: 'Personal Access Token', description: 'Classic PAT or fine-grained token', fields: [
      { key: 'token', label: 'GitHub Token', type: 'password' },
      { key: 'org', label: 'Organization', type: 'text' },
    ]},
    { id: 'github_app', label: 'GitHub App', description: 'Install a GitHub App for org-wide access', fields: [
      { key: 'app_id', label: 'App ID', type: 'text' },
      { key: 'installation_id', label: 'Installation ID', type: 'text' },
      { key: 'private_key', label: 'Private Key (PEM)', type: 'textarea' },
      { key: 'org', label: 'Organization', type: 'text' },
    ]},
  ]},
  grafana: { auth_methods: [
    { id: 'api_key', label: 'API Key', description: 'Grafana service account token', fields: [
      { key: 'base_url', label: 'Grafana URL', type: 'text' },
      { key: 'api_key', label: 'API Key', type: 'password' },
    ]},
  ]},
  prometheus: { auth_methods: [
    { id: 'base_url', label: 'Base URL', description: 'Prometheus server URL', fields: [
      { key: 'base_url', label: 'Prometheus URL', type: 'text' },
    ]},
  ]},
  jira: { auth_methods: [
    { id: 'basic', label: 'Basic Auth', description: 'Email + API token', fields: [
      { key: 'base_url', label: 'Jira URL', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'api_token', label: 'API Token', type: 'password' },
    ]},
  ]},
  confluence: { auth_methods: [
    { id: 'basic', label: 'Basic Auth', description: 'Email + API token', fields: [
      { key: 'base_url', label: 'Confluence URL', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'api_token', label: 'API Token', type: 'password' },
    ]},
  ]},
  slack: { auth_methods: [
    { id: 'bot_token', label: 'Bot Token', description: 'Slack bot user OAuth token', fields: [
      { key: 'bot_token', label: 'Bot Token', type: 'password' },
    ]},
  ]},
  elasticsearch: { auth_methods: [
    { id: 'api_key', label: 'API Key', description: 'Elasticsearch API key', fields: [
      { key: 'base_url', label: 'Elasticsearch URL', type: 'text' },
      { key: 'api_key', label: 'API Key', type: 'password' },
    ]},
  ]},
  datadog: { auth_methods: [
    { id: 'api_app_keys', label: 'API + App Keys', description: 'Datadog API and application keys', fields: [
      { key: 'api_key', label: 'API Key', type: 'password' },
      { key: 'app_key', label: 'App Key', type: 'password' },
      { key: 'site', label: 'Site', type: 'text' },
    ]},
  ]},
  cloudflare: { auth_methods: [
    { id: 'api_token', label: 'API Token', description: 'Cloudflare API token with Zone:Read', fields: [
      { key: 'api_token', label: 'API Token', type: 'password' },
      { key: 'email', label: 'Account Email (optional)', type: 'text' },
    ]},
  ]},
  pagerduty: { auth_methods: [
    { id: 'api_token', label: 'API Token', description: 'PagerDuty API token', fields: [
      { key: 'api_token', label: 'API Token', type: 'password' },
    ]},
  ]},
  newrelic: { auth_methods: [
    { id: 'api_key', label: 'API Key', description: 'New Relic User API key', fields: [
      { key: 'api_key', label: 'API Key', type: 'password' },
    ]},
  ]},
  servicenow: { auth_methods: [
    { id: 'basic', label: 'Basic Auth', description: 'Instance credentials', fields: [
      { key: 'instance_url', label: 'Instance URL', type: 'text' },
      { key: 'username', label: 'Username', type: 'text' },
      { key: 'password', label: 'Password', type: 'password' },
    ]},
  ]},
  vsphere: { auth_methods: [
    { id: 'basic', label: 'Basic Auth', description: 'vCenter credentials', fields: [
      { key: 'vcenter_url', label: 'vCenter URL', type: 'text' },
      { key: 'username', label: 'Username', type: 'text' },
      { key: 'password', label: 'Password', type: 'password' },
    ]},
  ]},
  codegraph: { auth_methods: [
    { id: 'local', label: 'Local Path', description: 'Local repository path', fields: [
      { key: 'repo_path', label: 'Repository Path', type: 'text' },
      { key: 'context_dir', label: 'Context Directory (optional)', type: 'text' },
    ]},
  ]},
  mongodb: { auth_methods: [
    { id: 'connection_string', label: 'Connection String', description: 'MongoDB connection URI', fields: [
      { key: 'connection_string', label: 'Connection String', type: 'password' },
    ]},
  ]},
  mysql: { auth_methods: [
    { id: 'basic', label: 'Basic Auth', description: 'Host + user + password', fields: [
      { key: 'host', label: 'Host', type: 'text' },
      { key: 'port', label: 'Port', type: 'text' },
      { key: 'user', label: 'User', type: 'text' },
      { key: 'password', label: 'Password', type: 'password' },
    ]},
  ]},
  postgresql: { auth_methods: [
    { id: 'basic', label: 'Basic Auth', description: 'Host + user + password', fields: [
      { key: 'host', label: 'Host', type: 'text' },
      { key: 'port', label: 'Port', type: 'text' },
      { key: 'user', label: 'User', type: 'text' },
      { key: 'password', label: 'Password', type: 'password' },
    ]},
  ]},
};

// ─── Main Component ─────────────────────────────────────────────────────────

export function Connectors() {
  const [scopes, setScopes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedAuthMethod, setSelectedAuthMethod] = useState('');
  const [scheduleCron, setScheduleCron] = useState('');
  const [config, setConfig] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [runningScopes, setRunningScopes] = useState<Set<string>>(new Set());
  const [customName, setCustomName] = useState('');
  const [tfImporting, setTfImporting] = useState(false);
  const [tfResult, setTfResult] = useState<{ imported: number; cross_refs: number; drift_items: number } | null>(null);
  const [tfError, setTfError] = useState('');
  const [providerSearch, setProviderSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const pollingRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // Clean up polling on unmount
  useEffect(() => {
    document.title = 'Connectors - Zerelio';
    loadScopes();
    return () => {
      Object.values(pollingRef.current).forEach(clearInterval);
    };
  }, []);

  async function loadScopes() {
    try {
      const res = await fetch('/api/v1/discovery/scopes').then(r => r.json());
      setScopes(res && Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : []);
    } catch (e) {
      console.warn("Connectors: load scopes failed", e);
      setMessage('Error: Cannot connect to API server. Make sure the backend is running on port 8080.');
    }
    finally { setLoading(false); }
  }

  async function handleCreate() {
    if (selectedProvider === 'terraform') {
      fileInputRef.current?.click();
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      // auth_method is a UI-only concept — the backend accepts config fields directly
      const body: any = {
        name: customName || selectedProvider,
        plugin_name: selectedProvider,
        config,
        schedule: scheduleCron || "",
      };
      const res = await fetch('/api/v1/discovery/scopes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setMessage('Connector created');
        setCustomName('');
        setShowForm(false);
        setSelectedProvider('');
        setConfig({});
        loadScopes();
      } else {
        const errData = await res.json().catch(() => ({}));
        setMessage("Error: " + ((errData as Record<string,any>).error || errData.data?.error || JSON.stringify(errData)));
      }
    } catch (e: any) {
      setMessage('Error: ' + e.message);
    } finally { setSaving(false); }
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/v1/discovery/scopes/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plugin_name: selectedProvider,
          config,
        }),
      });
      const d = await res.json();
      const data = d.data || d;
      if (data.success) {
        setTestResult('success: ' + (data.message || 'Connection OK'));
      } else {
        const errMsg = data.errors?.join('; ') || data.message || 'Connection failed';
        setTestResult('error: ' + errMsg);
      }
    } catch (e: any) {
      setTestResult('error: ' + (e.message || 'Unable to reach server'));
    } finally { setTesting(false); }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/v1/discovery/scopes/${id}`, { method: 'DELETE' });
      if (!res.ok) console.warn("Connectors: delete returned", res.status);
      loadScopes();
    } catch (e) { console.warn("Connectors: delete failed", e); }
  }

  async function handleRun(id: string) {
    try {
      await fetch('/api/v1/discovery/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope_id: id }),
      });
      setMessage('Discovery started');
      navigate(`/discovery?scope=${id}`);
      setRunningScopes(prev => new Set(prev).add(id));

      const startTime = Date.now();
      const interval = setInterval(async () => {
        if (Date.now() - startTime > 30000) {
          clearInterval(interval);
          setRunningScopes(prev => { const next = new Set(prev); next.delete(id); return next; });
          delete pollingRef.current[id];
          return;
        }
        try {
          const runsRes = await fetch('/api/v1/discovery/runs?limit=5').then(r => r.json());
          const runs = Array.isArray(runsRes) ? runsRes : runsRes.data ?? [];
          const latest = runs.find((r: any) => (r.scope_id || r.scopeId || r.ScopeID) === id);
          if (latest) {
            const status = latest.status || latest.Status || '';
            if (status === 'COMPLETED' || status === 'FAILED') {
              clearInterval(interval);
              setRunningScopes(prev => { const next = new Set(prev); next.delete(id); return next; });
              delete pollingRef.current[id];
              loadScopes();
            }
          }
        } catch { /* poll silently */ }
      }, 2000);
      pollingRef.current[id] = interval;
      loadScopes();
    } catch (e) { console.warn("Connectors: run discovery failed", e); }
  }

  async function handleTerraformImport(files: FileList | null) {
    if (!files || files.length === 0) return;
    setTfImporting(true);
    setTfError('');
    setTfResult(null);
    try {
      const fd = new FormData();
      fd.append('state', files[0]);
      const res = await fetch('/api/v1/terraform/import', { method: 'POST', body: fd });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error((errData as Record<string,any> | null)?.error || `Upload failed (${res.status})`);
      }
      const data = await res.json();
      setTfResult({
        imported: data.imported ?? data.data?.imported ?? 0,
        cross_refs: data.cross_refs ?? data.data?.cross_refs ?? 0,
        drift_items: data.drift_items ?? data.data?.drift_items ?? 0,
      });
      setShowForm(false);
      setSelectedProvider('');
    } catch (e: any) {
      setTfError(e.message || 'Import failed');
    } finally {
      setTfImporting(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function resetForm() {
    setShowForm(false);
    setSelectedProvider('');
    setSelectedAuthMethod('');
    setConfig({});
    setCustomName('');
    setTestResult(null);
    setTfResult(null);
    setTfError('');
  }

  const providerList = [...Object.keys(PROVIDER_CONFIGS), 'terraform'].sort();
  const filteredProviders = providerList.filter(p =>
    p.toLowerCase().includes(providerSearch.toLowerCase()) ||
    (PROVIDER_META[p]?.description || '').toLowerCase().includes(providerSearch.toLowerCase())
  );

  const isTerraform = selectedProvider === 'terraform';
  const cfg = selectedProvider && !isTerraform ? PROVIDER_CONFIGS[selectedProvider] : null;
  const authMethods = cfg?.auth_methods || [];
  const activeAuthMethod = authMethods.find(a => a.id === selectedAuthMethod) || authMethods[0];
  const activeFields = activeAuthMethod?.fields || [];

  // Reset auth method when provider changes
  useEffect(() => {
    setSelectedAuthMethod('');
    setConfig({});
    setTestResult(null);
    setTfResult(null);
    setTfError('');
  }, [selectedProvider]);

  // ── Connector health stats ──
  // The backend returns Scope.Status (active/paused/error) but not per-run
  // status on the scope object. Health is computed from scope status.
  const totalScopes = scopes.length;
  const healthyScopes = scopes.filter((s: any) => (s.status || s.Status || '') !== 'error');
  const errorScopes = scopes.filter((s: any) => (s.status || s.Status || '') === 'error');
  const neverRunScopes = scopes.filter((s: any) => !(s.last_run || s.LastRun));

  if (loading) return <div className="p-8 space-y-4">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-[hsl(var(--card))] animate-shimmer" />)}</div>;

  return (
    <div className="p-8 space-y-6 animate-fade animate-slide-up max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cloud Connectors</h1>
          <p className="text-[#8b8b8e] mt-1">Connect providers to discover infrastructure</p>
        </div>
        <button onClick={() => { if (!showForm) { resetForm(); setShowForm(true); } else { resetForm(); } }}
          className="px-4 py-2 bg-[#6c5ce7] hover:bg-[#5a4bd1] text-white rounded-lg text-sm font-medium">
          {showForm ? 'Cancel' : '+ Add Connector'}
        </button>
      </div>

      {message && <div className={`px-4 py-2 rounded-lg text-sm ${message.startsWith('Error') ? 'bg-[hsl(0,85%,60%,0.2)] text-[hsl(0,85%,60%)]' : 'bg-[hsl(143,64%,50%,0.2)] text-[hsl(143,64%,50%)]'}`}>{message}</div>}

      {/* Connector health dashboard */}
      {totalScopes > 0 && (
        <div className="grid grid-cols-4 gap-3">
          <HealthCard label="Total" value={totalScopes} color="#6c5ce7" />
          <HealthCard label="Active" value={healthyScopes.length} color="#2ed573" />
          <HealthCard label="Never Run" value={neverRunScopes.length} color="#ffa502" />
          <HealthCard label="Errors" value={errorScopes.length} color="#ff4757" showZero={true} />
        </div>
      )}

      {/* Add Connector form */}
      {showForm && (
        <div className="rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] overflow-hidden animate-scale-in">
          {/* Provider grid header */}
          <div className="p-4 border-b border-[hsl(var(--border))] space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5c5c5e]">New Connector</h2>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5c5c5e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text" value={providerSearch} onChange={e => setProviderSearch(e.target.value)}
                placeholder="Search providers..."
                className="w-full pl-8 pr-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-xs text-[hsl(var(--foreground))] placeholder-[#5c5c5e] focus:outline-none focus:border-[#6c5ce7]/50"
              />
            </div>
          </div>

          {/* Provider grid / config form */}
          <div className="p-4">
            {!selectedProvider ? (
              <div>
                {filteredProviders.length === 0 ? (
                  <p className="text-xs text-[#5c5c5e] text-center py-6">No providers match your search.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
                    {filteredProviders.map(p => (
                      <button key={p} onClick={() => { setSelectedProvider(p); setConfig({}); setCustomName(''); }}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-xs transition-all border ${
                          selectedProvider === p
                            ? 'border-[#6c5ce7] bg-[#6c5ce7]/5'
                            : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--muted-foreground))/40]'
                        }`}>
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PROVIDER_META[p]?.color || '#6c5ce7' }} />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[hsl(var(--foreground))] truncate">{p}</p>
                          <p className="text-[9px] text-[#5c5c5e] truncate">{PROVIDER_META[p]?.description || ''}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : isTerraform ? (
              /* ── Terraform state file upload ── */
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[hsl(var(--background))] border border-[#844fba]/40">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: '#844fba' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">terraform</p>
                    <p className="text-[10px] text-[#5c5c5e]">Terraform / OpenTofu State Import</p>
                  </div>
                  <button onClick={() => { setSelectedProvider(''); setConfig({}); }} className="text-[10px] text-[#6c5ce7] hover:underline shrink-0">Change</button>
                </div>

                {/* Security warning */}
                <div className="px-4 py-3 rounded-lg text-sm bg-[hsl(39,100%,55%,0.15)] text-[hsl(39,100%,50%)] border border-[hsl(39,100%,55%,0.25)]">
                  <span className="font-medium">Security notice:</span> Terraform state files may contain sensitive data (passwords, keys, secrets). All data is processed in-memory and never stored in plaintext.
                </div>

                {/* File upload */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'hsl(var(--muted-foreground))'; }}
                  onDragLeave={(e) => { e.currentTarget.style.borderColor = ''; }}
                  onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = ''; handleTerraformImport(e.dataTransfer.files); }}
                  className="border-2 border-dashed border-[hsl(var(--border))] rounded-xl p-8 text-center cursor-pointer hover:border-[hsl(var(--muted-foreground))/40] transition-colors"
                >
                  <input ref={fileInputRef} type="file" accept=".tfstate,.json" className="hidden" onChange={(e) => handleTerraformImport(e.target.files)} />
                  {tfImporting ? (
                    <div className="flex flex-col items-center gap-2">
                      <svg className="animate-spin h-8 w-8 text-[#6c5ce7]" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <p className="text-sm text-[#8b8b8e]">Importing state file...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-8 h-8 text-[#5c5c5e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <p className="text-sm text-[#8b8b8e]">Drop a <code className="text-[#6c5ce7] text-xs px-1.5 py-0.5 rounded bg-[#6c5ce7]/10">.tfstate</code> or <code className="text-[#6c5ce7] text-xs px-1.5 py-0.5 rounded bg-[#6c5ce7]/10">.json</code> file here, or click to browse</p>
                    </div>
                  )}
                </div>

                {tfError && <div className="px-4 py-2 rounded-lg text-sm bg-[hsl(0,85%,60%,0.2)] text-[hsl(0,85%,60%)]">{tfError}</div>}

                {tfResult && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] p-3 text-center">
                        <p className="text-2xl font-semibold text-[hsl(var(--foreground))]">{tfResult.imported}</p>
                        <p className="text-xs text-[#8b8b8e] mt-1">Resources Imported</p>
                      </div>
                      <div className="rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] p-3 text-center">
                        <p className="text-2xl font-semibold text-[hsl(var(--foreground))]">{tfResult.cross_refs}</p>
                        <p className="text-xs text-[#8b8b8e] mt-1">Cross-References</p>
                      </div>
                      <div className="rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] p-3 text-center">
                        <p className="text-2xl font-semibold text-[hsl(var(--foreground))]">{tfResult.drift_items}</p>
                        <p className="text-xs text-[#8b8b8e] mt-1">Drift Items</p>
                      </div>
                    </div>
                    <button onClick={() => navigate('/graph')}
                      className="w-full px-4 py-2 bg-[#6c5ce7] hover:bg-[#5a4bd1] text-white rounded-lg text-sm font-medium">
                      View in Graph
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* ── Standard connector config form ── */
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[hsl(var(--background))] border border-[#6c5ce7]/40">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PROVIDER_META[selectedProvider]?.color || '#6c5ce7' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">{selectedProvider}</p>
                    <p className="text-[10px] text-[#5c5c5e]">{PROVIDER_META[selectedProvider]?.description || ''}</p>
                  </div>
                  <button onClick={() => { setSelectedProvider(''); setConfig({}); }} className="text-[10px] text-[#6c5ce7] hover:underline shrink-0">Change</button>
                </div>

                {/* Auth method selector */}
                {authMethods.length > 1 && (
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#5c5c5e] mb-2 block">Authentication Method</label>
                    <div className="flex flex-wrap gap-2">
                      {authMethods.map(a => (
                        <button key={a.id} onClick={() => { setSelectedAuthMethod(a.id); setConfig({}); }}
                          className={`flex-1 min-w-[120px] px-3 py-2 rounded-lg text-left text-xs transition-all border ${
                            (selectedAuthMethod || authMethods[0].id) === a.id
                              ? 'border-[#6c5ce7] bg-[#6c5ce7]/5'
                              : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--muted-foreground))/40]'
                          }`}>
                          <p className="font-medium text-[hsl(var(--foreground))]">{a.label}</p>
                          <p className="text-[9px] text-[#5c5c5e] mt-0.5">{a.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm text-[#8b8b8e] block mb-1">Connector Name</label>
                  <input type="text" value={customName} onChange={e => setCustomName(e.target.value)}
                    placeholder={`My ${selectedProvider} connector`}
                    className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))]" />
                </div>

                {activeFields.map(f => (
                  <div key={f.key}>
                    <label className="text-sm text-[#8b8b8e] block mb-1">{f.label}</label>
                    {f.type === 'textarea' ? (
                      <textarea value={config[f.key] || ''} onChange={e => setConfig({...config, [f.key]: e.target.value})}
                        className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] h-24" />
                    ) : (
                      <input type={f.type} value={config[f.key] || ''} onChange={e => setConfig({...config, [f.key]: e.target.value})}
                        placeholder={f.key} className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))]" />
                    )}
                  </div>
                ))}

                {/* Schedule */}
                <div>
                  <label className="text-xs mb-1 block" style={{color: 'hsl(var(--muted-foreground))'}}>Schedule (optional)</label>
                  <select value={scheduleCron} onChange={e => setScheduleCron(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm" style={{background: 'hsl(var(--input))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))'}}>
                    <option value="">Manual only</option>
                    <option value="0 */6 * * *">Every 6 hours</option>
                    <option value="0 */12 * * *">Every 12 hours</option>
                    <option value="0 0 * * *">Daily at midnight</option>
                    <option value="0 0 * * 0">Weekly on Sunday</option>
                    <option value="0 0 1 * *">Monthly on 1st</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCreate} disabled={saving || !selectedProvider}
                    className="px-4 py-2 bg-[#6c5ce7] hover:bg-[#5a4bd1] disabled:opacity-50 text-white rounded-lg text-sm font-medium">
                    {saving ? 'Creating...' : 'Create Connector'}
                  </button>
                  <button onClick={handleTestConnection} disabled={testing || activeFields.length === 0}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                    style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                    {testing ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>

                {testResult && (
                  <div className={`px-3 py-2 rounded-lg text-sm ${testResult.startsWith('success') ? 'bg-[hsl(143,64%,50%,0.2)] text-[hsl(143,64%,50%)]' : 'bg-[hsl(0,85%,60%,0.2)] text-[hsl(0,85%,60%)]'}`}>
                    {testResult.startsWith('success') ? '✓ ' : '✗ '}{testResult.replace(/^success: |^error: /, '')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Connector list */}
      <div className="space-y-2">
        {scopes.length === 0 ? (
          <div className="text-center py-12 text-[#5c5c5e]">
            <p className="text-lg">No connectors configured</p>
            <p className="text-sm mt-1">Add a connector to start discovering infrastructure</p>
          </div>
        ) : scopes.map((s: any) => {
          const scopeId = s.id;
          const scopePlug = s.plugin_name;
          const scopeStatus = s.status;
          const isRunning = runningScopes.has(scopeId);
          const meta = PROVIDER_META[scopePlug];
          const hasLastRun = !!s.last_run;
          const lastRunDate = hasLastRun ? new Date(s.last_run) : null;
          const isValidDate = lastRunDate && lastRunDate.getFullYear() > 2000;
          return (
          <div key={scopeId} className="flex items-center justify-between px-4 py-3 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] hover:border-[hsl(var(--muted-foreground))/30] transition-all">
            <div>
              <div className="flex items-center gap-2">
                {meta && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.color }} />}
                <span className="text-sm font-medium">{s.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#6c5ce7]/10 text-[#6c5ce7]">{scopePlug}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${scopeStatus === 'active' ? 'bg-[hsl(143,64%,50%,0.2)] text-[hsl(143,64%,50%)]' : 'bg-[hsl(35,100%,55%,0.2)] text-[hsl(35,100%,55%)]'}`}>{scopeStatus}</span>
                {isRunning && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[hsl(200,85%,60%,0.2)] text-[hsl(200,85%,60%)]">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Running
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {isValidDate && <span className="text-xs text-[#5c5c5e]">{lastRunDate.toLocaleDateString()} {lastRunDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                {!isValidDate && <span className="text-xs text-[#5c5c5e]">Never</span>}
                {s.resource_count > 0 && <span className="text-xs text-[#5c5c5e]">{s.resource_count} resources</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleRun(scopeId)} className="px-3 py-1.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] hover:border-[hsl(var(--muted-foreground))/30] text-xs rounded-lg text-[hsl(var(--foreground))]">Run</button>
              <button onClick={() => navigate(`/discovery?scope=${scopeId}`)} className="px-3 py-1.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] hover:border-[hsl(var(--muted-foreground))/30] text-xs rounded-lg text-[hsl(var(--foreground))]">View Progress</button>
              <button onClick={() => handleDelete(scopeId)} className="px-3 py-1.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] hover:border-[hsl(0,85%,60%,0.5)] text-xs rounded-lg text-[hsl(0,85%,60%)]">Delete</button>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function HealthCard({ label, value, color, showZero }: { label: string; value: number; color: string; showZero?: boolean }) {
  if (value === 0 && !showZero) return null;
  return (
    <div className="rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-4 text-center">
      <div className="text-2xl font-semibold" style={{ color }}>{value}</div>
      <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{label}</div>
    </div>
  );
}
