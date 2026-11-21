import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const ADMIN_SECTIONS = [
  { id: 'users', label: 'Users' },
  { id: 'scim', label: 'SCIM' },
  { id: 'management', label: 'Management' },
  { id: 'health', label: 'System Health' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'llm', label: 'LLM Profiles' },
  { id: 'runbook-context', label: 'Runbook Context' },
  { id: 'sso', label: 'SSO' },
  { id: 'saml', label: 'SAML' },
  { id: 'rag', label: 'RAG' },
];

interface RagProfile {
  name: string;
  provider: string;
  api_key?: string;
  model: string;
  base_url?: string;
  embedding_provider?: string;
  embedding_model?: string;
  is_default: boolean;
}

interface RagHealth {
  status: string;
  docs_count: number;
  entities_count: number;
  relations_count: number;
}

interface LLMProfile {
  name: string;
  provider: string;
  api_key?: string;
  model: string;
  base_url?: string;
  is_default: boolean;
}

interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export function Admin() {
  const navigate = useNavigate();
  // License state removed — Zerelio is FOSS, no license gate
  const [config, setConfig] = useState<any>(null);
  const [profiles, setProfiles] = useState<LLMProfile[]>([]);
  const [editingProfile, setEditingProfile] = useState<LLMProfile | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingProvider, setEditingProvider] = useState('');
  const [editingApiKey, setEditingApiKey] = useState('');
  const [editingModel, setEditingModel] = useState('');
  const [editingBaseUrl, setEditingBaseUrl] = useState('');
  const [editingIsDefault, setEditingIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [testMsg, setTestMsg] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [userNewEmail, setUserNewEmail] = useState('');
  const [userNewPassword, setUserNewPassword] = useState('');
  const [userNewRole, setUserNewRole] = useState('viewer');
  const [userMsg, setUserMsg] = useState('');
  const [userSaving, setUserSaving] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editUserId, setEditUserId] = useState('');
  const [editUserRole, setEditUserRole] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [runbookContext, setRunbookContext] = useState('');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [runbookContextSaving, setRunbookContextSaving] = useState(false);
  const [runbookContextMsg, setRunbookContextMsg] = useState('');
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [copyMsg, setCopyMsg] = useState('');
  const [ssoProviders, setSsoProviders] = useState<any[]>([]);
  const [ssoConfigs, setSsoConfigs] = useState<any[]>([]);
  const [selectedSsoTemplate, setSelectedSsoTemplate] = useState<any | null>(null);
  const [ssoClientID, setSsoClientID] = useState('');
  const [ssoClientSecret, setSsoClientSecret] = useState('');
  const [ssoTenantID, setSsoTenantID] = useState('');
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [ssoSaving, setSsoSaving] = useState(false);
  const [ssoMsg, setSsoMsg] = useState('');
  const [samlConfigs, setSamlConfigs] = useState<any[]>([]);
  const [samlEnabled, setSamlEnabled] = useState(false);
  const [showSamlForm, setShowSamlForm] = useState(false);
  const [samlName, setSamlName] = useState('');
  const [samlLabel, setSamlLabel] = useState('');
  const [samlEntityID, setSamlEntityID] = useState('');
  const [samlSSOURL, setSamlSSOURL] = useState('');
  const [samlCert, setSamlCert] = useState('');
  const [samlSPCert, setSamlSPCert] = useState('');
  const [samlSPKey, setSamlSPKey] = useState('');
  const [samlSaving, setSamlSaving] = useState(false);
  const [samlMsg, setSamlMsg] = useState('');
  const [scimConfig, setScimConfig] = useState<{enabled: boolean; token: string}>({enabled: false, token: ''});
  const [scimSaving, setScimSaving] = useState(false);
  const [scimMsg, setScimMsg] = useState('');
  const [ragHealth, setRagHealth] = useState<RagHealth | null>(null);
  const [ragProfiles, setRagProfiles] = useState<RagProfile[]>([]);
  const [ragEditingProfile, setRagEditingProfile] = useState<RagProfile | null>(null);
  const [ragShowAddForm, setRagShowAddForm] = useState(false);
  const [ragEditingName, setRagEditingName] = useState('');
  const [ragEditingProvider, setRagEditingProvider] = useState('openai');
  const [ragEditingApiKey, setRagEditingApiKey] = useState('');
  const [ragEditingModel, setRagEditingModel] = useState('');
  const [ragEditingBaseUrl, setRagEditingBaseUrl] = useState('');
  const [ragEditingEmbedProvider, setRagEditingEmbedProvider] = useState('');
  const [ragEditingEmbedModel, setRagEditingEmbedModel] = useState('');
  const [ragEditingIsDefault, setRagEditingIsDefault] = useState(false);
  const [ragSaving, setRagSaving] = useState(false);
  const [ragSaveMsg, setRagSaveMsg] = useState('');
  const [ragTestQuery, setRagTestQuery] = useState('');
  const [ragTestResult, setRagTestResult] = useState('');
  const [ragTestMeta, setRagTestMeta] = useState<any>(null);
  const [ragTestConfidence, setRagTestConfidence] = useState(0);
  const [ragTesting, setRagTesting] = useState(false);
  const [_ragLoading, _setRagLoading] = useState(false);
  const [ragShowTestResult, setRagShowTestResult] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('zerelio_admin_collapsed') || '{}'); } catch { return {}; }
  });

  function toggleSection(id: string) {
    setCollapsedSections(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem('zerelio_admin_collapsed', JSON.stringify(next));
      return next;
    });
  }

  useEffect(() => {
    document.title = 'Admin - Zerelio';
    // License fetch removed — Zerelio is FOSS, no license gate
    fetch('/api/v1/admin/config').then(r => r.json()).then(d => {
      const c = (d && d.data) || d || {};
      setConfig(c);
    }).catch(() => console.warn("Admin: config unavailable"));
    loadProfiles();
    loadUsers();
    loadIntegrations();
    loadSSOProviders();
    loadSSOConfigs();
    loadSCIMConfig();
    loadSAMLConfigs();
    loadRagHealth();
    loadRagProfiles();
  }, []);

  async function loadSSOProviders() {
    try {
      const res = await fetch('/api/v1/auth/sso/providers');
      const d = await res.json();
      setSsoProviders((d && d.data && d.data.providers) || []);
    } catch { console.warn("Admin: SSO providers unavailable"); }
  }

  async function loadSSOConfigs() {
    try {
      const res = await fetch('/api/v1/admin/sso/config');
      const d = await res.json();
      const list = d && d.data ? d.data : Array.isArray(d) ? d : [];
      setSsoConfigs(list);
      setSsoEnabled(list.some((p: any) => p.enabled));
    } catch { console.warn("Admin: SSO configs unavailable"); }
  }

  async function loadSCIMConfig() {
    try {
      const res = await fetch('/api/v1/admin/scim/config');
      const d = await res.json();
      const data = (d && d.data) || d || {};
      setScimConfig({ enabled: data.enabled || false, token: data.token || '' });
    } catch { console.warn("Admin: SCIM config unavailable"); }
  }

  async function handleSCIMSave(enabled: boolean) {
    setScimSaving(true);
    setScimMsg('');
    try {
      const res = await fetch('/api/v1/admin/scim/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, token: enabled ? scimConfig.token : '' }),
      });
      if (res.ok) {
        setScimMsg(enabled ? 'SCIM provisioning enabled' : 'SCIM provisioning disabled');
        await loadSCIMConfig();
      } else {
        const err = await res.json();
        setScimMsg('Error: ' + ((err as any).error || 'save failed'));
      }
    } catch { setScimMsg('Error: connection failed'); }
    finally { setScimSaving(false); }
  }

  async function loadRagHealth() {
    try {
      const res = await fetch('/api/v1/rag/health');
      const d = await res.json();
      const data = d && d.data ? d.data : d;
      setRagHealth(data);
    } catch { console.warn("Admin: RAG health unavailable"); }
  }

  async function loadRagProfiles() {
    try {
      const res = await fetch('/api/v1/rag/profiles');
      const d = await res.json();
      const list = d && d.data ? d.data : Array.isArray(d) ? d : [];
      setRagProfiles(list);
    } catch { console.warn("Admin: RAG profiles unavailable"); }
  }

  function resetRagForm() {
    setRagShowAddForm(false);
    setRagEditingProfile(null);
    setRagEditingName('');
    setRagEditingProvider('openai');
    setRagEditingApiKey('');
    setRagEditingModel('');
    setRagEditingBaseUrl('');
    setRagEditingEmbedProvider('');
    setRagEditingEmbedModel('');
    setRagEditingIsDefault(false);
    setRagSaveMsg('');
  }

  function startRagAdd() {
    resetRagForm();
    setRagShowAddForm(true);
  }

  function startRagEdit(p: RagProfile) {
    setRagEditingProfile(p);
    setRagEditingName(p.name);
    setRagEditingProvider(p.provider);
    setRagEditingApiKey('');
    setRagEditingModel(p.model);
    setRagEditingBaseUrl(p.base_url || '');
    setRagEditingEmbedProvider(p.embedding_provider || '');
    setRagEditingEmbedModel(p.embedding_model || '');
    setRagEditingIsDefault(p.is_default);
    setRagShowAddForm(true);
    setRagSaveMsg('');
  }

  async function handleSaveRagProfile() {
    if (!ragEditingName.trim() || !ragEditingModel.trim()) return;
    setRagSaving(true);
    setRagSaveMsg('');
    try {
      const body: Record<string, any> = {
        name: ragEditingName,
        provider: ragEditingProvider,
        model: ragEditingModel,
        is_default: ragEditingIsDefault,
      };
      if (ragEditingApiKey) body.api_key = ragEditingApiKey;
      if (ragEditingBaseUrl) body.base_url = ragEditingBaseUrl;
      if (ragEditingEmbedProvider) body.embedding_provider = ragEditingEmbedProvider;
      if (ragEditingEmbedModel) body.embedding_model = ragEditingEmbedModel;
      const res = await fetch('/api/v1/rag/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setRagSaveMsg('Profile saved');
        await loadRagProfiles();
        resetRagForm();
      } else {
        const err = await res.json();
        setRagSaveMsg('Error: ' + ((err as any).error || 'save failed'));
      }
    } catch { setRagSaveMsg('Error: connection failed'); }
    finally { setRagSaving(false); }
  }

  async function handleDeleteRagProfile(name: string) {
    if (!window.confirm('Delete RAG profile "' + name + '"?')) return;
    try {
      await fetch('/api/v1/rag/profiles/' + encodeURIComponent(name), { method: 'DELETE' });
      await loadRagProfiles();
    } catch { console.warn("Admin: delete RAG profile failed"); }
  }

  async function handleRagTestQuery() {
    if (!ragTestQuery.trim()) return;
    setRagTesting(true);
    setRagShowTestResult(false);
    try {
      const res = await fetch('/api/v1/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: ragTestQuery, mode: 'hybrid' }),
      });
      if (res.ok) {
        const d = await res.json();
        setRagTestResult(d.response || 'No response');
        setRagTestConfidence(d.confidence || 0);
        setRagTestMeta(d.metadata || null);
        setRagShowTestResult(true);
      } else {
        const err = await res.json();
        setRagTestResult('Error: ' + ((err as any).detail || 'query failed'));
        setRagShowTestResult(true);
      }
    } catch { setRagTestResult('Error: connection failed'); setRagShowTestResult(true); }
    finally { setRagTesting(false); }
  }

  async function loadSAMLConfigs() {
    try {
      const res = await fetch('/api/v1/admin/saml/config');
      const d = await res.json();
      const list = d && d.data ? d.data : Array.isArray(d) ? d : [];
      setSamlConfigs(list);
      setSamlEnabled(list.some((p: any) => p.enabled));
    } catch { console.warn("Admin: SAML configs unavailable"); }
  }

  function resetSamlForm() {
    setShowSamlForm(false);
    setSamlName('');
    setSamlLabel('');
    setSamlEntityID('');
    setSamlSSOURL('');
    setSamlCert('');
    setSamlSPCert('');
    setSamlSPKey('');
    setSamlMsg('');
  }

  async function handleSaveSAML() {
    if (!samlName.trim() || !samlEntityID.trim() || !samlSSOURL.trim() || !samlCert.trim()) return;
    setSamlSaving(true);
    setSamlMsg('');
    try {
      const body: Record<string, any> = {
        name: samlName,
        label: samlLabel || samlName,
        entity_id: samlEntityID,
        sso_url: samlSSOURL,
        certificate: samlCert,
        enabled: true,
      };
      if (samlSPCert) body.sp_cert = samlSPCert;
      if (samlSPKey) body.sp_key = samlSPKey;
      const res = await fetch('/api/v1/admin/saml/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSamlMsg('SAML provider saved');
        await loadSAMLConfigs();
        resetSamlForm();
      } else {
        const err = await res.json();
        setSamlMsg('Error: ' + ((err as any).error || 'save failed'));
      }
    } catch { setSamlMsg('Error: connection failed'); }
    finally { setSamlSaving(false); }
  }

  async function handleDeleteSAML(name: string) {
    if (!window.confirm(`Delete SAML provider "${name}"?`)) return;
    try {
      await fetch(`/api/v1/admin/saml/config/${encodeURIComponent(name)}`, { method: 'DELETE' });
      await loadSAMLConfigs();
    } catch { console.warn("Admin: delete SAML failed"); }
  }

  async function loadIntegrations() {
    try {
      const res = await fetch('/api/v1/integrations/status');
      const d = await res.json();
      const data = d && d.data ? d.data : d;
      setIntegrations(data && data.integrations ? data.integrations : []);
    } catch { console.warn("Admin: integrations unavailable"); }
    finally { setIntegrationsLoading(false); }
  }

  async function copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMsg(`${label} URL copied to clipboard`);
      setTimeout(() => setCopyMsg(''), 3000);
    } catch { setCopyMsg('Failed to copy'); }
  }

  async function loadUsers() {
    try {
      const res = await fetch('/api/v1/admin/users');
      const d = await res.json();
      setUsers(d && d.data ? d.data : Array.isArray(d) ? d : []);
    } catch { console.warn("Admin: users unavailable"); }
  }

  async function handleCreateUser() {
    if (!userNewEmail.trim() || !userNewPassword.trim()) return;
    setUserSaving(true);
    setUserMsg('');
    try {
      const res = await fetch('/api/v1/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userNewEmail, password: userNewPassword, role: userNewRole }),
      });
      if (res.ok) {
        setUserMsg('User created');
        setUserNewEmail(''); setUserNewPassword(''); setUserNewRole('viewer');
        setShowUserForm(false);
        await loadUsers();
      } else {
        const err = await res.json();
        setUserMsg('Error: ' + ((err as any).error || 'create failed'));
      }
    } catch { setUserMsg('Error: connection failed'); }
    finally { setUserSaving(false); }
  }

  async function handleUpdateUser(id: string) {
    setUserSaving(true);
    setUserMsg('');
    try {
      const body: Record<string, string> = { role: editUserRole };
      if (editUserPassword) body.password = editUserPassword;
      const res = await fetch(`/api/v1/admin/users/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setUserMsg('User updated');
        setEditUserId(''); setEditUserRole(''); setEditUserPassword('');
        await loadUsers();
      } else {
        const err = await res.json();
        setUserMsg('Error: ' + ((err as any).error || 'update failed'));
      }
    } catch { setUserMsg('Error: connection failed'); }
    finally { setUserSaving(false); }
  }

  async function handleDeleteUser(id: string) {
    if (!window.confirm('Delete this user?')) return;
    try {
      const res = await fetch(`/api/v1/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        await loadUsers();
      } else {
        const err = await res.json();
        setUserMsg('Error: ' + ((err as any).error || 'delete failed'));
      }
    } catch { setUserMsg('Error: connection failed'); }
  }

  async function loadProfiles() {
    try {
      const res = await fetch('/api/v1/admin/llm/profiles');
      const d = await res.json();
      const list = d && d.data ? d.data : Array.isArray(d) ? d : [];
      setProfiles(list);
    } catch { console.warn("Admin: profiles unavailable"); }
  }

  function resetEditing() {
    setEditingProfile(null);
    setEditingName('');
    setEditingProvider('');
    setEditingApiKey('');
    setEditingModel('');
    setEditingBaseUrl('');
    setEditingIsDefault(false);
    setShowAddForm(false);
    setSaveMsg('');
  }

  function startEdit(p: LLMProfile) {
    setEditingProfile(p);
    setEditingName(p.name);
    setEditingProvider(p.provider);
    setEditingModel(p.model);
    setEditingBaseUrl(p.base_url || '');
    setEditingIsDefault(p.is_default);
    setShowAddForm(true);
    setSaveMsg('');
  }

  function startAdd() {
    setEditingProfile(null);
    setEditingName('');
    setEditingProvider('custom');
    setEditingModel('');
    setEditingBaseUrl('');
    setEditingIsDefault(profiles.length === 0);
    setShowAddForm(true);
    setSaveMsg('');
  }

  async function handleSaveProfile() {
    if (!editingName.trim()) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const body: Record<string, any> = {
        name: editingName,
        provider: editingProvider,
        model: editingModel,
        is_default: editingIsDefault,
      };
      if (editingApiKey) body.api_key = editingApiKey;
      if (editingBaseUrl) body.base_url = editingBaseUrl;
      const res = await fetch('/api/v1/admin/llm/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSaveMsg('Profile saved');
        await loadProfiles();
        resetEditing();
      } else {
        const err = await res.json();
        setSaveMsg('Error: ' + ((err as any).error || 'save failed'));
      }
    } catch (e) {
      setSaveMsg('Error: connection failed');
    } finally { setSaving(false); }
  }

  async function handleDeleteProfile(name: string) {
    try {
      const res = await fetch(`/api/v1/admin/llm/profiles/${encodeURIComponent(name)}`, { method: 'DELETE' });
      if (res.ok) await loadProfiles();
    } catch { console.warn("Admin: delete profile failed"); }
  }

  async function handleTest() {
    setTesting(true);
    setTestMsg('');
    try {
      const res = await fetch('/api/v1/admin/llm/test');
      const data = await res.json();
      const d = data.data || data;
      setTestMsg(d?.success ? 'Connection OK' : 'Error: ' + (d?.error || 'test failed'));
    } catch (e) {
      console.warn("Admin: LLM test failed", e);
      setTestMsg('Error: connection failed');
    } finally { setTesting(false); }
  }

  async function handleSaveRunbookContext() {
    setRunbookContextSaving(true);
    setRunbookContextMsg('');
    try {
      const res = await fetch("/api/v1/admin/runbook-context", {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: runbookContext }),
      });
      if (res.ok) setRunbookContextMsg('Context saved');
      else setRunbookContextMsg('Error: save failed');
    } catch { setRunbookContextMsg('Error: connection failed'); }
    finally { setRunbookContextSaving(false); }
  }

  // handleActivateLicense removed — Zerelio is FOSS

  function selectSSOTemplate(template: any) {
    setSelectedSsoTemplate(template);
    setSsoClientID('');
    setSsoClientSecret('');
    setSsoTenantID('');
    setSsoMsg('');
  }

  function cancelSSOTemplate() {
    setSelectedSsoTemplate(null);
    setSsoClientID('');
    setSsoClientSecret('');
    setSsoTenantID('');
    setSsoMsg('');
  }

  async function handleSaveSSO() {
    if (!selectedSsoTemplate || !ssoClientID.trim()) return;
    setSsoSaving(true);
    setSsoMsg('');
    try {
      const body: Record<string, any> = {
        name: selectedSsoTemplate.name,
        label: selectedSsoTemplate.label,
        issuer_url: selectedSsoTemplate.name === 'microsoft'
          ? selectedSsoTemplate.issuer_url.replace('{tenant}', ssoTenantID || '{tenant}')
          : selectedSsoTemplate.issuer_url,
        client_id: ssoClientID,
        client_secret: ssoClientSecret,
        scopes: selectedSsoTemplate.scopes,
        enabled: true,
      };
      const res = await fetch('/api/v1/admin/sso/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSsoMsg('SSO provider saved');
        await loadSSOConfigs();
        cancelSSOTemplate();
      } else {
        const err = await res.json();
        setSsoMsg('Error: ' + ((err as any).error || 'save failed'));
      }
    } catch { setSsoMsg('Error: connection failed'); }
    finally { setSsoSaving(false); }
  }

  async function handleDeleteSSO(name: string) {
    if (!window.confirm(`Delete SSO provider "${name}"?`)) return;
    try {
      await fetch(`/api/v1/admin/sso/config/${encodeURIComponent(name)}`, { method: 'DELETE' });
      await loadSSOConfigs();
    } catch { console.warn("Admin: delete SSO failed"); }
  }

  function cardStyle(): React.CSSProperties {
    return { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' };
  }
  function inputStyle(): React.CSSProperties {
    return { background: 'hsl(var(--input))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' };
  }

  function renderToggle(sid: string, label: string) {
    return (
      <button onClick={() => toggleSection(sid)} className="w-full flex items-center justify-between text-sm font-semibold uppercase tracking-wider text-[#5c5c5e] mb-4">
        <span>{label}</span>
        <span style={{color: 'hsl(var(--muted-foreground))', fontSize: '10px'}}>{collapsedSections[sid] ? 'Show ▲' : 'Hide ▼'}</span>
      </button>
    );
  }

  return (
    <div className="p-8 animate-fade max-w-5xl">
      <div className="flex gap-8">
        {/* Section navigation sidebar */}
        <nav className="w-44 shrink-0">
          <div className="sticky top-8 space-y-0.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5c5c5e] mb-2">Sections</p>
            {ADMIN_SECTIONS.map(s => (
              <button key={s.id} onClick={() => sectionRefs.current[s.id]?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="block w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all hover:bg-[hsl(var(--border))]"
                style={{ color: "hsl(var(--muted-foreground))" }}>
                {s.label}
              </button>
            ))}
          </div>
        </nav>
        <div className="flex-1 min-w-0 space-y-8">
          <div>
            <h1 className="text-2xl font-semibold">Administration</h1>
            <p className="text-[#8b8b8e] mt-1">Manage users, LLM profiles, and system settings</p>
          </div>

      {/* User Management */}
      <section ref={el => sectionRefs.current['users'] = el} className="rounded-xl p-6" style={cardStyle()}>
        {renderToggle('users', 'Users')}
        {!collapsedSections['users'] && (<>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5c5c5e]">Users</h2>
          <button onClick={() => setShowUserForm(!showUserForm)}
            className="text-xs px-3 py-1.5 bg-[#6c5ce7] text-white rounded-lg font-medium hover:bg-[#5a4bd1]">
            + Add User
          </button>
        </div>

        <div className="space-y-2 text-sm">
          {users.length === 0 ? (
            <p className="text-[#5c5c5e] py-2">No users found.</p>
          ) : users.map(u => (
            <div key={u.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg"
              style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
              <div className="flex items-center gap-3">
                <span className="text-sm">{u.email}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  u.role === 'admin' ? 'bg-[#6c5ce7]/10 text-[#6c5ce7]' : u.role === 'editor' ? 'bg-[#2ed573]/10 text-[#2ed573]' : 'bg-[#8b8b8e]/10 text-[#8b8b8e]'
                }`}>{u.role}</span>
              </div>
              <div className="flex gap-2">
                {editUserId === u.id ? (
                  <div className="flex items-center gap-2">
                    <select value={editUserRole} onChange={e => setEditUserRole(e.target.value)}
                      className="px-2 py-1 rounded text-xs" style={inputStyle()}>
                      <option value="admin">admin</option>
                      <option value="editor">editor</option>
                      <option value="viewer">viewer</option>
                    </select>
                    <input type="password" value={editUserPassword} onChange={e => setEditUserPassword(e.target.value)}
                      placeholder="New password" className="px-2 py-1 rounded text-xs w-28" style={inputStyle()} />
                    <button onClick={() => handleUpdateUser(u.id)} disabled={userSaving}
                      className="text-xs px-2 py-1 rounded bg-[#6c5ce7] text-white">Save</button>
                    <button onClick={() => { setEditUserId(''); setEditUserRole(''); setEditUserPassword(''); }}
                      className="text-xs px-2 py-1 rounded" style={{ color: '#8b8b8e' }}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => { setEditUserId(u.id); setEditUserRole(u.role); setEditUserPassword(''); }}
                      className="text-xs px-2 py-1 rounded hover:bg-[hsl(var(--border))]">Edit</button>
                    <button onClick={() => handleDeleteUser(u.id)}
                      className="text-xs px-2 py-1 rounded text-[#ff4757] hover:bg-[hsl(0,85%,60%,0.1)]">Delete</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add User Form */}
        {showUserForm && (
          <div className="mt-4 p-4 rounded-lg space-y-3" style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5c5c5e]">New User</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-[#8b8b8e] block mb-1">Email</label>
                <input type="email" value={userNewEmail} onChange={e => setUserNewEmail(e.target.value)}
                  placeholder="user@company.com" className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={inputStyle()} />
              </div>
              <div>
                <label className="text-xs text-[#8b8b8e] block mb-1">Password</label>
                <input type="password" value={userNewPassword} onChange={e => setUserNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={inputStyle()} />
              </div>
              <div>
                <label className="text-xs text-[#8b8b8e] block mb-1">Role</label>
                <select value={userNewRole} onChange={e => setUserNewRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={inputStyle()}>
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={handleCreateUser} disabled={userSaving || !userNewEmail.trim() || !userNewPassword.trim()}
                className="px-4 py-2 bg-[#6c5ce7] hover:bg-[#5a4bd1] disabled:opacity-50 text-white rounded-lg text-sm font-medium">
                {userSaving ? 'Creating...' : 'Create User'}
              </button>
              <button onClick={() => { setShowUserForm(false); setUserNewEmail(''); setUserNewPassword(''); setUserNewRole('viewer'); }}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                Cancel
              </button>
            </div>
            {userMsg && <p className={`text-sm mt-2 ${userMsg.startsWith('Error') ? 'text-[#ff4757]' : 'text-[#2ed573]'}`}>{userMsg}</p>}
          </div>
        )}
        </>)}
      </section>

      {/* SCIM Provisioning */}
      <section ref={el => sectionRefs.current['scim'] = el} className="rounded-xl p-6" style={cardStyle()}>
        {renderToggle('scim', 'SCIM')}
        {!collapsedSections['scim'] && (<>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5c5c5e]">SCIM Provisioning</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-[#8b8b8e]">{scimConfig.enabled ? 'Enabled' : 'Disabled'}</span>
            <button onClick={() => handleSCIMSave(!scimConfig.enabled)} disabled={scimSaving}
              className={`relative w-10 h-5 rounded-full transition-colors ${scimConfig.enabled ? 'bg-[#6c5ce7]' : 'bg-[#3a3a3c]'}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${scimConfig.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </label>
        </div>
        <p className="text-xs text-[#8b8b8e] mb-4">Configure this URL in your identity provider (Okta, Azure AD, Entra ID) to automatically provision and sync users.</p>

        {scimConfig.enabled ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[#8b8b8e] block mb-1">SCIM Base URL</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs px-3 py-2 rounded-lg break-all"
                  style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', color: '#8b8b8e' }}>
                  {window.location.origin}/api/v1/scim/v2
                </code>
                <button onClick={() => copyToClipboard(`${window.location.origin}/api/v1/scim/v2`, 'SCIM Base URL')}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium whitespace-nowrap"
                  style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                  Copy
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-[#8b8b8e] block mb-1">Bearer Token</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs px-3 py-2 rounded-lg break-all"
                  style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', color: '#8b8b8e' }}>
                  {scimConfig.token || 'No token configured'}
                </code>
                {scimConfig.token && (
                  <button onClick={() => copyToClipboard(scimConfig.token, 'SCIM Token')}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium whitespace-nowrap"
                    style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                    Copy
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#5c5c5e] py-2">SCIM provisioning is disabled. Toggle the switch above to generate a bearer token and enable SCIM.</p>
        )}
        {scimMsg && <p className={`text-sm mt-2 ${scimMsg.startsWith('Error') ? 'text-[#ff4757]' : 'text-[#2ed573]'}`}>{scimMsg}</p>}
        </>)}
      </section>

      {/* Quick Links */}
      <section ref={el => sectionRefs.current['management'] = el} className="rounded-xl p-6" style={cardStyle()}>
        {renderToggle('management', 'Management')}
        {!collapsedSections['management'] && (<>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/connectors')}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all group"
            style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
            <span>Cloud Connectors</span>
            <span className="ml-auto text-[10px] text-[#5c5c5e] group-hover:text-[#6c5ce7]">Manage</span>
          </button>
          <button onClick={() => navigate('/discovery')}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all group"
            style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
            <span>Discovery Runs</span>
            <span className="ml-auto text-[10px] text-[#5c5c5e] group-hover:text-[#6c5ce7]">View</span>
          </button>
          <button onClick={() => navigate('/admin/webhooks')}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all group"
            style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
            <span>Webhooks</span>
            <span className="ml-auto text-[10px] text-[#5c5c5e] group-hover:text-[#6c5ce7]">Manage</span>
          </button>
          <button onClick={() => navigate('/admin/audit')}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all group"
            style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
            <span>Audit Log</span>
            <span className="ml-auto text-[10px] text-[#5c5c5e] group-hover:text-[#6c5ce7]">View</span>
          </button>
          <button onClick={() => navigate('/admin/compliance')}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all group"
            style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
            <span>Compliance</span>
            <span className="ml-auto text-[10px] text-[#5c5c5e] group-hover:text-[#6c5ce7]">Manage</span>
          </button>
        </div>
        <div className="mt-4 pt-4 border-t border-[hsl(var(--border))]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">Maintenance Mode</span>
              <p className="text-xs" style={{color: 'hsl(var(--muted-foreground))'}}>When enabled, discovery and doc generation are paused.</p>
            </div>
            <button onClick={async () => {
              const res = await fetch('/api/v1/admin/maintenance', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({enabled: true}),
              });
              if (res.ok) alert('Maintenance mode enabled');
            }} className="text-xs px-3 py-1.5 rounded-lg font-medium bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))]">Enable</button>
          </div>
        </div>
        </>)}
      </section>

      {/* System Health */}
      <section ref={el => sectionRefs.current['health'] = el} className="rounded-xl p-6" style={cardStyle()}>
        {renderToggle('health', 'System Health')}
        {!collapsedSections['health'] && (
        <div className="space-y-3 text-sm">
          {[
            {label:'API Server', status:'healthy'},
            {label:'Graph Store', status: config ? 'connected' : 'memory'},
            {label:'LLM', status: profiles.some(p => p.is_default && !!p.provider) ? 'configured' : 'not configured'},
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <span className="text-[#8b8b8e]">{s.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                s.status === 'healthy' || s.status === 'connected' || s.status === 'configured'
                  ? 'bg-[#2ed573]/10 text-[#2ed573]'
                  : 'bg-[#ffa502]/10 text-[#ffa502]'
              }`}>{s.status}</span>
            </div>
          ))}
        </div>
        )}
      </section>

      {/* Integrations */}
      <section ref={el => sectionRefs.current['integrations'] = el} className="rounded-xl p-6" style={cardStyle()}>
        {renderToggle('integrations', 'Integrations')}
        {!collapsedSections['integrations'] && (<>
        <p className="text-xs text-[#8b8b8e] mb-4">Export your infrastructure graph to external developer portals and catalogs.</p>
        {integrationsLoading ? (
          <p className="text-sm text-[#5c5c5e] py-2">Loading integrations...</p>
        ) : integrations.length === 0 ? (
          <p className="text-sm text-[#5c5c5e] py-2">No integrations available.</p>
        ) : (
          <div className="space-y-3">
            {integrations.map((int: any) => (
              <div key={int.name} className="p-4 rounded-lg" style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium capitalize">{int.name.replace(/-/g, ' ')}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    int.available ? 'bg-[#2ed573]/10 text-[#2ed573]' : 'bg-[#5c5c5e]/10 text-[#5c5c5e]'
                  }`}>{int.available ? 'Available' : 'Coming Soon'}</span>
                </div>
                <p className="text-xs text-[#8b8b8e] mb-3">{int.description}</p>
                {int.available && int.export_url ? (
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => window.open(int.export_url, '_blank')}
                      className="text-xs px-3 py-1.5 bg-[#6c5ce7] hover:bg-[#5a4bd1] text-white rounded-lg font-medium">
                      Download Export
                    </button>
                    <button onClick={() => copyToClipboard(int.export_url, int.name)}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium"
                      style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                      Copy URL
                    </button>
                    {int.doc_url && (
                      <a href={int.doc_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs px-3 py-1.5 rounded-lg font-medium inline-flex items-center"
                        style={{ color: '#6c5ce7' }}>
                        Documentation &rarr;
                      </a>
                    )}
                  </div>
                ) : !int.available ? (
                  <div className="flex flex-wrap gap-2">
                    {int.doc_url && (
                      <a href={int.doc_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs px-3 py-1.5 rounded-lg font-medium inline-flex items-center"
                        style={{ color: '#6c5ce7' }}>
                        Learn More &rarr;
                      </a>
                    )}
                  </div>
                ) : null}
                {int.name === 'backstage' && int.available && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                    <p className="text-xs text-[#8b8b8e] mb-1"><strong>Setup Instructions:</strong></p>
                    <p className="text-xs text-[#5c5c5e] mb-2">Add this URL to your <code className="text-[#6c5ce7]">app-config.yaml</code> under <code className="text-[#6c5ce7]">catalog.locations</code>:</p>
                    <code className="block text-xs px-3 py-2 rounded-lg" style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', color: '#8b8b8e', wordBreak: 'break-all' }}>
                      {int.export_url || 'url'}
                    </code>
                    <button onClick={() => copyToClipboard(int.export_url || '', 'Backstage URL')}
                      className="text-xs mt-2 px-3 py-1.5 rounded-lg font-medium"
                      style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                      Copy URL
                    </button>
                  </div>
                )}
              </div>
            ))}
            {copyMsg && <p className="text-xs text-[#2ed573]">{copyMsg}</p>}
          </div>
        )}
        </>)}
      </section>

      {/* LLM Profiles */}
      <section ref={el => sectionRefs.current['llm'] = el} className="rounded-xl p-6" style={cardStyle()}>
        {renderToggle('llm', 'LLM Profiles')}
        {!collapsedSections['llm'] && (<>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5c5c5e]">LLM Profiles</h2>
          <button onClick={startAdd} className="text-xs px-3 py-1.5 bg-[#6c5ce7] text-white rounded-lg font-medium hover:bg-[#5a4bd1]">
            + Add Profile
          </button>
        </div>

        <div className="space-y-2">
          {profiles.length === 0 && !showAddForm && (
            <p className="text-sm text-[#5c5c5e] py-2">No profiles configured. Add a profile to configure LLM access.</p>
          )}

          {profiles.map(p => (
            <div key={p.name} className="flex items-center justify-between px-3 py-2.5 rounded-lg"
              style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{p.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#6c5ce7]/10 text-[#6c5ce7]">{p.provider}</span>
                <span className="text-xs text-[#5c5c5e]">{p.model}</span>
                {p.is_default && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2ed573]/10 text-[#2ed573]">Default</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(p)} className="text-xs px-2 py-1 rounded hover:bg-[hsl(var(--border))]">Edit</button>
                <button onClick={() => handleDeleteProfile(p.name)} className="text-xs px-2 py-1 rounded text-[#ff4757] hover:bg-[hsl(0,85%,60%,0.1)]">Delete</button>
              </div>
            </div>
          ))}
        </div>

        {/* Profile Edit / Add Form */}
        {showAddForm && (
          <div className="mt-4 p-4 rounded-lg space-y-3" style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5c5c5e]">
              {editingProfile ? 'Edit Profile' : 'New Profile'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#8b8b8e] block mb-1">Name</label>
                <input type="text" value={editingName} onChange={e => setEditingName(e.target.value)}
                  placeholder="e.g. cheap, full, default" disabled={!!editingProfile}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={inputStyle()} />
              </div>
              <div>
                <label className="text-xs text-[#8b8b8e] block mb-1">Provider</label>
                <select value={editingProvider} onChange={e => setEditingProvider(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={inputStyle()}>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="ollama">Ollama</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[#8b8b8e] block mb-1">Model</label>
                <input type="text" value={editingModel} onChange={e => setEditingModel(e.target.value)}
                  placeholder="claude-sonnet-4-6" className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={inputStyle()} />
              </div>
              <div>
                <label className="text-xs text-[#8b8b8e] block mb-1">API Key</label>
                <input type="password" value={editingApiKey} onChange={e => setEditingApiKey(e.target.value)}
                  placeholder={editingProfile ? "Leave blank to keep existing" : "sk-..."}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={inputStyle()} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-[#8b8b8e] block mb-1">Base URL (optional)</label>
                <input type="text" value={editingBaseUrl} onChange={e => setEditingBaseUrl(e.target.value)}
                  placeholder="https://..." className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={inputStyle()} />
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={editingIsDefault} onChange={e => setEditingIsDefault(e.target.checked)}
                  className="rounded" />
                <span className="text-[#8b8b8e]">Set as default</span>
              </label>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleSaveProfile} disabled={saving || !editingName.trim() || !editingModel.trim()}
                className="px-4 py-2 bg-[#6c5ce7] hover:bg-[#5a4bd1] disabled:opacity-50 text-white rounded-lg text-sm font-medium">
                {saving ? 'Saving...' : (editingProfile ? 'Save Changes' : 'Add Profile')}
              </button>
              <button onClick={resetEditing}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                Cancel
              </button>
            </div>
            {saveMsg && <p className={`text-sm mt-2 ${saveMsg.startsWith('Error') ? 'text-[#ff4757]' : 'text-[#2ed573]'}`}>{saveMsg}</p>}
          </div>
        )}

        {/* Test connection using default profile */}
        <div className="flex items-center gap-3 mt-4">
          <button onClick={handleTest} disabled={testing}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
            {testing ? 'Testing...' : 'Test Default Connection'}
          </button>
          {testMsg && <span className={`text-sm ${testMsg.startsWith('Error') ? 'text-[#ff4757]' : 'text-[#2ed573]'}`}>{testMsg}</span>}
        </div>
        </>)}
      </section>

      {/* Company Context for Runbooks */}
      <section ref={el => sectionRefs.current['runbook-context'] = el} className="rounded-xl p-6" style={cardStyle()}>
        {renderToggle('runbook-context', 'Runbook Context')}
        {!collapsedSections['runbook-context'] && (<>
        <p className="text-xs text-[#8b8b8e] mb-3">Define your company's actual team structure, tools, and contacts so generated runbooks use real information instead of placeholders.</p>
        <textarea value={runbookContext} onChange={e => setRunbookContext(e.target.value)}
          placeholder={`Example:
Team: Infrastructure (Slack #infra)
On-call: PagerDuty rotation, 15min response
Tools: AWS (us-east-1), Kubernetes (EKS v1.28), GitHub Actions
Escalation: L1 on-call → L2 SRE team (#sre) → L3 eng-manager@company.com
Postmortem: Blameless RCA within 48h, tracked in Linear project INFRA`}
          className="w-full h-40 px-3 py-2 rounded-lg text-sm focus:outline-none resize-y"
          style={inputStyle()} />
        <div className="flex items-center gap-3 mt-3">
          <button onClick={handleSaveRunbookContext} disabled={runbookContextSaving}
            className="px-4 py-2 bg-[#6c5ce7] hover:bg-[#5a4bd1] disabled:opacity-50 text-white rounded-lg text-sm font-medium">
            {runbookContextSaving ? 'Saving...' : 'Save Context'}
          </button>
          {runbookContextMsg && <span className={`text-sm ${runbookContextMsg.startsWith('Error') ? 'text-[#ff4757]' : 'text-[#2ed573]'}`}>{runbookContextMsg}</span>}
        </div>
        </>)}
      </section>

      {/* SSO Quick Start */}
      <section ref={el => sectionRefs.current['sso'] = el} className="rounded-xl p-6" style={cardStyle()}>
        {renderToggle('sso', 'SSO')}
        {!collapsedSections['sso'] && (<>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5c5c5e]">Single Sign-On (SSO)</h2>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${ssoEnabled ? 'bg-[#2ed573]/10 text-[#2ed573]' : 'bg-[#5c5c5e]/10 text-[#5c5c5e]'}`}>
            {ssoEnabled ? 'Active' : 'Inactive'}
          </span>
        </div>
        <p className="text-xs text-[#8b8b8e] mb-4">Quick-start templates for popular SSO providers. Fill in your client credentials to enable.</p>

        {/* Existing SSO Configs */}
        {ssoConfigs.length > 0 && (
          <div className="space-y-2 mb-4">
            {ssoConfigs.map((cfg: any) => (
              <div key={cfg.name} className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{cfg.label || cfg.name}</span>
                  {cfg.enabled && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2ed573]/10 text-[#2ed573]">Enabled</span>}
                </div>
                <button onClick={() => handleDeleteSSO(cfg.name)}
                  className="text-xs px-2 py-1 rounded text-[#ff4757] hover:bg-[hsl(0,85%,60%,0.1)]">Delete</button>
              </div>
            ))}
          </div>
        )}

        {/* Provider Template Cards (no form open) */}
        {!selectedSsoTemplate && (
          <div className="grid grid-cols-3 gap-3">
            {ssoProviders.map((tmpl: any) => (
              <button key={tmpl.name} onClick={() => selectSSOTemplate(tmpl)}
                className="flex flex-col items-start gap-1 p-4 rounded-xl text-left transition-all hover:opacity-80"
                style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
                <span className="text-sm font-medium">{tmpl.label}</span>
                <span className="text-[10px] text-[#8b8b8e] leading-relaxed">{tmpl.description}</span>
              </button>
            ))}
          </div>
        )}

        {/* Inline Config Form */}
        {selectedSsoTemplate && (
          <div className="p-4 rounded-lg space-y-3 mt-2"
            style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5c5c5e]">
              Configure {selectedSsoTemplate.label}
            </h3>
            <p className="text-xs text-[#8b8b8e]">{selectedSsoTemplate.description}</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-[#8b8b8e] block mb-1">Issuer URL</label>
                <input type="text" readOnly value={
                  selectedSsoTemplate.name === 'microsoft'
                    ? selectedSsoTemplate.issuer_url.replace('{tenant}', ssoTenantID || '{tenant}')
                    : selectedSsoTemplate.issuer_url
                } className="w-full px-3 py-2 rounded-lg text-sm opacity-70 cursor-not-allowed" style={inputStyle()} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-[#8b8b8e] block mb-1">Scopes</label>
                <input type="text" readOnly value={selectedSsoTemplate.scopes.join(', ')}
                  className="w-full px-3 py-2 rounded-lg text-sm opacity-70 cursor-not-allowed" style={inputStyle()} />
              </div>
              <div>
                <label className="text-xs text-[#8b8b8e] block mb-1">Client ID *</label>
                <input type="text" value={ssoClientID} onChange={e => setSsoClientID(e.target.value)}
                  placeholder="Your OAuth client ID" className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={inputStyle()} />
              </div>
              <div>
                <label className="text-xs text-[#8b8b8e] block mb-1">Client Secret</label>
                <input type="password" value={ssoClientSecret} onChange={e => setSsoClientSecret(e.target.value)}
                  placeholder="Your OAuth client secret" className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={inputStyle()} />
              </div>
              {selectedSsoTemplate.config_fields?.includes('tenant_id') && (
                <div>
                  <label className="text-xs text-[#8b8b8e] block mb-1">Tenant ID</label>
                  <input type="text" value={ssoTenantID} onChange={e => setSsoTenantID(e.target.value)}
                    placeholder="Your Azure tenant/directory ID" className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={inputStyle()} />
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-2">
              <button onClick={handleSaveSSO} disabled={ssoSaving || !ssoClientID.trim()}
                className="px-4 py-2 bg-[#6c5ce7] hover:bg-[#5a4bd1] disabled:opacity-50 text-white rounded-lg text-sm font-medium">
                {ssoSaving ? 'Saving...' : 'Save Provider'}
              </button>
              <button onClick={cancelSSOTemplate}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                Cancel
              </button>
            </div>
            {ssoMsg && <p className={`text-sm mt-2 ${ssoMsg.startsWith('Error') ? 'text-[#ff4757]' : 'text-[#2ed573]'}`}>{ssoMsg}</p>}
          </div>
        )}
        </>)}
      </section>

      {/* SAML Authentication */}
      <section ref={el => sectionRefs.current['saml'] = el} className="rounded-xl p-6" style={cardStyle()}>
        {renderToggle('saml', 'SAML')}
        {!collapsedSections['saml'] && (<>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5c5c5e]">SAML Authentication</h2>
          <span className="flex items-center gap-3">
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${samlEnabled ? 'bg-[#2ed573]/10 text-[#2ed573]' : 'bg-[#5c5c5e]/10 text-[#5c5c5e]'}`}>
              {samlEnabled ? 'Active' : 'Inactive'}
            </span>
            <button onClick={() => { resetSamlForm(); setShowSamlForm(true); }}
              className="text-xs px-3 py-1.5 bg-[#6c5ce7] text-white rounded-lg font-medium hover:bg-[#5a4bd1]">
              + Add Provider
            </button>
          </span>
        </div>
        <p className="text-xs text-[#8b8b8e] mb-4">Configure SAML 2.0 identity providers. Upload your IdP metadata to enable single sign-on via SAML.</p>

        {/* Existing SAML Configs */}
        {samlConfigs.length > 0 && (
          <div className="space-y-2 mb-4">
            {samlConfigs.map((cfg: any) => (
              <div key={cfg.name} className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{cfg.label || cfg.name}</span>
                  {cfg.enabled && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2ed573]/10 text-[#2ed573]">Enabled</span>}
                </div>
                <div className="flex items-center gap-2">
                  <a href={`/api/v1/auth/saml/metadata/${encodeURIComponent(cfg.name)}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs px-2 py-1 rounded hover:bg-[hsl(var(--border))]" style={{ color: '#6c5ce7' }}>
                    SP Metadata
                  </a>
                  <button onClick={() => handleDeleteSAML(cfg.name)}
                    className="text-xs px-2 py-1 rounded text-[#ff4757] hover:bg-[hsl(0,85%,60%,0.1)]">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add SAML Provider Form */}
        {showSamlForm && (
          <div className="p-4 rounded-lg space-y-3 mt-2"
            style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5c5c5e]">Configure SAML Provider</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#8b8b8e] block mb-1">Name *</label>
                <input type="text" value={samlName} onChange={e => setSamlName(e.target.value)}
                  placeholder="e.g. okta, azure-ad" className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={inputStyle()} />
              </div>
              <div>
                <label className="text-xs text-[#8b8b8e] block mb-1">Label</label>
                <input type="text" value={samlLabel} onChange={e => setSamlLabel(e.target.value)}
                  placeholder="e.g. Okta, Azure AD" className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={inputStyle()} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-[#8b8b8e] block mb-1">IdP Entity ID *</label>
                <input type="text" value={samlEntityID} onChange={e => setSamlEntityID(e.target.value)}
                  placeholder="https://idp.example.com/entity-id" className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={inputStyle()} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-[#8b8b8e] block mb-1">IdP SSO URL *</label>
                <input type="text" value={samlSSOURL} onChange={e => setSamlSSOURL(e.target.value)}
                  placeholder="https://idp.example.com/sso/post" className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={inputStyle()} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-[#8b8b8e] block mb-1">IdP Certificate (PEM) *</label>
                <textarea value={samlCert} onChange={e => setSamlCert(e.target.value)}
                  placeholder="[CERTIFICATE DATA]&#10;...&#10;[END CERTIFICATE]"
                  rows={4} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none resize-y" style={inputStyle()} />
              </div>
              <div className="col-span-2" style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '12px' }}>
                <p className="text-xs text-[#5c5c5e] mb-2"><strong>SP Certificate (optional)</strong> — Leave blank to auto-generate a self-signed certificate.</p>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-[#8b8b8e] block mb-1">SP Certificate (PEM)</label>
                <textarea value={samlSPCert} onChange={e => setSamlSPCert(e.target.value)}
                  placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                  rows={3} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none resize-y" style={inputStyle()} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-[#8b8b8e] block mb-1">SP Private Key (PEM)</label>
                <textarea value={samlSPKey} onChange={e => setSamlSPKey(e.target.value)}
                  placeholder="[RSA PRIVATE KEY DATA]&#10;...&#10;[END RSA PRIVATE KEY]"
                  rows={3} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none resize-y" style={inputStyle()} />
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <button onClick={handleSaveSAML} disabled={samlSaving || !samlName.trim() || !samlEntityID.trim() || !samlSSOURL.trim() || !samlCert.trim()}
                className="px-4 py-2 bg-[#6c5ce7] hover:bg-[#5a4bd1] disabled:opacity-50 text-white rounded-lg text-sm font-medium">
                {samlSaving ? 'Saving...' : 'Save Provider'}
              </button>
              <button onClick={resetSamlForm}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                Cancel
              </button>
            </div>
            {samlMsg && <p className={`text-sm mt-2 ${samlMsg.startsWith('Error') ? 'text-[#ff4757]' : 'text-[#2ed573]'}`}>{samlMsg}</p>}
          </div>
        )}
        </>)}
      </section>

      {/* RAG Service */}
      <section ref={el => sectionRefs.current['rag'] = el} className="rounded-xl p-6" style={cardStyle()}>
        {renderToggle('rag', 'RAG')}
        {!collapsedSections['rag'] && (<>
        {/* Health Status */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-4 text-center">
            <div className="text-2xl font-semibold">{ragHealth?.docs_count ?? '-'}</div>
            <div className="text-xs text-[#5c5c5e] mt-0.5">Documents</div>
          </div>
          <div className="rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-4 text-center">
            <div className="text-2xl font-semibold">{ragHealth?.entities_count ?? '-'}</div>
            <div className="text-xs text-[#5c5c5e] mt-0.5">Entities</div>
          </div>
          <div className="rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-4 text-center">
            <div className="text-2xl font-semibold">{ragHealth?.relations_count ?? '-'}</div>
            <div className="text-xs text-[#5c5c5e] mt-0.5">Relations</div>
          </div>
        </div>

        {/* Profile Management */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5c5c5e]">Profiles</h2>
          <button onClick={startRagAdd} className="text-xs px-3 py-1.5 bg-[#6c5ce7] text-white rounded-lg font-medium hover:bg-[#5a4bd1]">
            + Add Profile
          </button>
        </div>

        <div className="space-y-2">
          {ragProfiles.length === 0 && !ragShowAddForm && (
            <p className="text-sm text-[#5c5c5e] py-2">No RAG profiles configured.</p>
          )}

          {ragProfiles.map(p => (
            <div key={p.name} className="flex items-center justify-between px-3 py-2.5 rounded-lg"
              style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{p.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#6c5ce7]/10 text-[#6c5ce7]">{p.provider}</span>
                <span className="text-xs text-[#5c5c5e]">{p.model}</span>
                {p.is_default && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2ed573]/10 text-[#2ed573]">Default</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => startRagEdit(p)} className="text-xs px-2 py-1 rounded hover:bg-[hsl(var(--border))]">Edit</button>
                <button onClick={() => handleDeleteRagProfile(p.name)} className="text-xs px-2 py-1 rounded text-[#ff4757] hover:bg-[hsl(0,85%,60%,0.1)]">Delete</button>
              </div>
            </div>
          ))}
        </div>

        {/* Profile Edit / Add Form */}
        {ragShowAddForm && (
          <div className="mt-4 p-4 rounded-lg space-y-3" style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5c5c5e]">
              {ragEditingProfile ? 'Edit RAG Profile' : 'New RAG Profile'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#8b8b8e] block mb-1">Name</label>
                <input type="text" value={ragEditingName} onChange={e => setRagEditingName(e.target.value)}
                  placeholder="e.g. openai, local-ollama, anthropic" disabled={!!ragEditingProfile}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={inputStyle()} />
              </div>
              <div>
                <label className="text-xs text-[#8b8b8e] block mb-1">Provider</label>
                <select value={ragEditingProvider} onChange={e => setRagEditingProvider(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={inputStyle()}>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="ollama">Ollama</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[#8b8b8e] block mb-1">Model</label>
                <input type="text" value={ragEditingModel} onChange={e => setRagEditingModel(e.target.value)}
                  placeholder="deepseek-v4-flash" className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={inputStyle()} />
              </div>
              <div>
                <label className="text-xs text-[#8b8b8e] block mb-1">API Key</label>
                <input type="password" value={ragEditingApiKey} onChange={e => setRagEditingApiKey(e.target.value)}
                  placeholder={ragEditingProfile ? "Leave blank to keep existing" : "sk-..."}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={inputStyle()} />
              </div>
              <div>
                <label className="text-xs text-[#8b8b8e] block mb-1">Base URL (optional)</label>
                <input type="text" value={ragEditingBaseUrl} onChange={e => setRagEditingBaseUrl(e.target.value)}
                  placeholder="https://..." className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={inputStyle()} />
              </div>
              <div>
                <label className="text-xs text-[#8b8b8e] block mb-1">Embedding Provider</label>
                <select value={ragEditingEmbedProvider} onChange={e => setRagEditingEmbedProvider(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={inputStyle()}>
                  <option value="">Default (env)</option>
                  <option value="openai">OpenAI</option>
                  <option value="ollama">Ollama</option>
                  <option value="hf">HuggingFace</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[#8b8b8e] block mb-1">Embedding Model</label>
                <input type="text" value={ragEditingEmbedModel} onChange={e => setRagEditingEmbedModel(e.target.value)}
                  placeholder="text-embedding-3-small" className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={inputStyle()} />
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={ragEditingIsDefault} onChange={e => setRagEditingIsDefault(e.target.checked)}
                  className="rounded" />
                <span className="text-[#8b8b8e]">Set as default</span>
              </label>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleSaveRagProfile} disabled={ragSaving || !ragEditingName.trim() || !ragEditingModel.trim()}
                className="px-4 py-2 bg-[#6c5ce7] hover:bg-[#5a4bd1] disabled:opacity-50 text-white rounded-lg text-sm font-medium">
                {ragSaving ? 'Saving...' : (ragEditingProfile ? 'Save Changes' : 'Add Profile')}
              </button>
              <button onClick={resetRagForm}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                Cancel
              </button>
            </div>
            {ragSaveMsg && <p className={'text-sm mt-2 ' + (ragSaveMsg.startsWith('Error') ? 'text-[#ff4757]' : 'text-[#2ed573]')}>{ragSaveMsg}</p>}
          </div>
        )}

        {/* Test Query */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#5c5c5e] mb-3">Test Query</h3>
          <textarea value={ragTestQuery} onChange={e => setRagTestQuery(e.target.value)}
            placeholder="Ask a question about your infrastructure..."
            rows={3} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none resize-y"
            style={inputStyle()} />
          <div className="flex items-center gap-3 mt-2">
            <button onClick={handleRagTestQuery} disabled={ragTesting || !ragTestQuery.trim()}
              className="px-4 py-2 bg-[#6c5ce7] hover:bg-[#5a4bd1] disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              {ragTesting ? 'Querying RAG...' : 'Query RAG'}
            </button>
            {ragTesting && <span className="text-xs text-[#8b8b8e]">Generating response with LLM...</span>}
          </div>
          {ragShowTestResult && (
            <div className="mt-3 p-4 rounded-lg whitespace-pre-wrap text-sm" style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
              <p>{ragTestResult}</p>
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                <p className="text-xs text-[#8b8b8e]">
                  Confidence: {(ragTestConfidence * 100).toFixed(0)}%{ragTestMeta?.label ? ' (' + ragTestMeta.label + ')' : ''}
                </p>
              </div>
            </div>
          )}
        </div>
        </>)}
      </section>
        </div>
      </div>
    </div>
  );
}
