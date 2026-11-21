import { useState, useEffect } from 'react';

interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  created_at: string;
}

interface TestResult {
  webhook_id: string;
  url: string;
  success: boolean;
  error?: string;
  latency_ms: number;
}

interface TestResponse {
  total: number;
  results: TestResult[];
}

const WEBHOOK_EVENTS = [
  { value: 'discovery.completed', label: 'Discovery Completed' },
  { value: 'drift.detected', label: 'Drift Detected' },
  { value: 'runbook.generated', label: 'Runbook Generated' },
  { value: 'change.detected', label: 'Change Detected' },
];

export function Webhooks() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addUrl, setAddUrl] = useState('');
  const [addEvents, setAddEvents] = useState<string[]>([]);
  const [addSecret, setAddSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [testMsg, setTestMsg] = useState('');
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [showTestResults, setShowTestResults] = useState(false);
  const [deliveryLog, setDeliveryLog] = useState<Record<string, { lastStatus: string; lastTested: string }>>({});

  useEffect(() => {
    loadWebhooks();
  }, []);

  async function loadWebhooks() {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/notifications/webhooks');
      const d = await res.json();
      const list = d && d.data ? d.data : Array.isArray(d) ? d : [];
      setWebhooks(list);
    } catch {
      console.warn('Webhooks: failed to load');
    } finally {
      setLoading(false);
    }
  }

  function toggleEvent(event: string) {
    setAddEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    );
  }

  async function handleAddWebhook() {
    if (!addUrl.trim()) return;
    if (addEvents.length === 0) return;
    setSaving(true);
    setMsg('');
    try {
      const body: Record<string, any> = { url: addUrl, events: addEvents };
      if (addSecret.trim()) body.secret = addSecret.trim();
      const res = await fetch('/api/v1/admin/notifications/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setMsg('Webhook registered');
        setAddUrl(''); setAddEvents([]); setAddSecret('');
        setShowAddForm(false);
        await loadWebhooks();
      } else {
        const err = await res.json();
        setMsg('Error: ' + ((err as any).error || 'create failed'));
      }
    } catch {
      setMsg('Error: connection failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteWebhook(id: string) {
    if (!window.confirm('Delete this webhook?')) return;
    try {
      const res = await fetch(`/api/v1/admin/notifications/webhooks/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadWebhooks();
      } else {
        const err = await res.json();
        setMsg('Error: ' + ((err as any).error || 'delete failed'));
      }
    } catch {
      setMsg('Error: connection failed');
    }
  }

  async function handleTestAll() {
    setTestingWebhook('all');
    setTestMsg('');
    setTestResults([]);
    setShowTestResults(true);
    try {
      const res = await fetch('/api/v1/admin/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const d = await res.json();
      const data: TestResponse = d && d.data ? d.data : d;
      setTestResults(data.results || []);
      const log: Record<string, { lastStatus: string; lastTested: string }> = {};
      for (const r of data.results || []) {
        log[r.webhook_id] = {
          lastStatus: r.success ? 'success' : 'failed',
          lastTested: new Date().toISOString(),
        };
      }
      setDeliveryLog(prev => ({ ...prev, ...log }));
    } catch {
      setTestMsg('Error: connection failed');
    } finally {
      setTestingWebhook(null);
    }
  }

  async function handleTestSingle(wh: Webhook) {
    setTestingWebhook(wh.id);
    setTestMsg('');
    try {
      const res = await fetch('/api/v1/admin/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: wh.url, events: wh.events }),
      });
      const d = await res.json();
      const data = d && d.data ? d.data : d;
      if (data.success !== undefined) {
        setDeliveryLog(prev => ({
          ...prev,
          [wh.id]: { lastStatus: data.success ? 'success' : 'failed', lastTested: new Date().toISOString() },
        }));
      }
    } catch {
      setTestMsg('Error: connection failed');
    } finally {
      setTestingWebhook(null);
    }
  }

  function cardStyle(): React.CSSProperties {
    return { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' };
  }
  function inputStyle(): React.CSSProperties {
    return { background: 'hsl(var(--input))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' };
  }

  return (
    <div className="p-8 space-y-8 animate-fade max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Webhooks</h1>
          <p className="text-[#8b8b8e] mt-1">
            Register webhook endpoints to receive events from Zerelio
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleTestAll}
            disabled={testingWebhook === 'all' || webhooks.length === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
          >
            {testingWebhook === 'all' ? 'Testing...' : 'Test All'}
          </button>
          <button
            onClick={() => { setShowAddForm(!showAddForm); setMsg(''); }}
            className="px-4 py-2 bg-[#6c5ce7] hover:bg-[#5a4bd1] text-white rounded-lg text-sm font-medium"
          >
            + Add Webhook
          </button>
        </div>
      </div>

      {/* Add Webhook Form */}
      {showAddForm && (
        <section className="rounded-xl p-6 space-y-4" style={cardStyle()}>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5c5c5e]">Register Webhook</h2>

          <div>
            <label className="text-xs text-[#8b8b8e] block mb-1">Webhook URL</label>
            <input
              type="text"
              value={addUrl}
              onChange={e => setAddUrl(e.target.value)}
              placeholder="https://hooks.example.com/events"
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-[#6c5ce7]/50"
              style={inputStyle()}
            />
          </div>

          <div>
            <label className="text-xs text-[#8b8b8e] block mb-2">Subscribe to Events</label>
            <div className="flex flex-wrap gap-3">
              {WEBHOOK_EVENTS.map(ev => (
                <label
                  key={ev.value}
                  className="flex items-center gap-2 text-sm cursor-pointer px-3 py-2 rounded-lg"
                  style={{
                    background: addEvents.includes(ev.value) ? '#6c5ce7/10' : 'hsl(var(--secondary))',
                    border: `1px solid ${addEvents.includes(ev.value) ? '#6c5ce7' : 'hsl(var(--border))'}`,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={addEvents.includes(ev.value)}
                    onChange={() => toggleEvent(ev.value)}
                    className="rounded"
                  />
                  <span className={`text-sm ${addEvents.includes(ev.value) ? 'text-[#6c5ce7]' : ''}`}>{ev.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-[#8b8b8e] block mb-1">
              Secret <span className="text-[#5c5c5e]">(optional — used for HMAC signing)</span>
            </label>
            <input
              type="password"
              value={addSecret}
              onChange={e => setAddSecret(e.target.value)}
              placeholder="Leave blank for unsigned payloads"
              className="w-full max-w-sm px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={inputStyle()}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddWebhook}
              disabled={saving || !addUrl.trim() || addEvents.length === 0}
              className="px-4 py-2 bg-[#6c5ce7] hover:bg-[#5a4bd1] disabled:opacity-50 text-white rounded-lg text-sm font-medium"
            >
              {saving ? 'Registering...' : 'Register Webhook'}
            </button>
            <button
              onClick={() => { setShowAddForm(false); setAddUrl(''); setAddEvents([]); setAddSecret(''); setMsg(''); }}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
            >
              Cancel
            </button>
          </div>

          {msg && (
            <p className={`text-sm ${msg.startsWith('Error') ? 'text-[#ff4757]' : 'text-[#2ed573]'}`}>{msg}</p>
          )}
        </section>
      )}

      {/* Webhook List */}
      <section className="rounded-xl p-6" style={cardStyle()}>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5c5c5e] mb-4">
          Registered Webhooks
        </h2>

        {loading ? (
          <p className="text-sm text-[#5c5c5e] py-2">Loading webhooks...</p>
        ) : webhooks.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-10 h-10 mx-auto mb-3 text-[#5c5c5e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <p className="text-sm text-[#5c5c5e]">No webhooks registered.</p>
            <p className="text-xs text-[#5c5c5e] mt-1">Add a webhook above to receive events.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map(wh => {
              const log = deliveryLog[wh.id];
              return (
                <div
                  key={wh.id}
                  className="p-4 rounded-lg"
                  style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium truncate">{wh.url}</span>
                        {log && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            log.lastStatus === 'success' ? 'bg-[#2ed573]/10 text-[#2ed573]' : 'bg-[#ff4757]/10 text-[#ff4757]'
                          }`}>
                            {log.lastStatus}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {wh.events.map(ev => (
                          <span
                            key={ev}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-[#6c5ce7]/10 text-[#6c5ce7]"
                          >
                            {ev}
                          </span>
                        ))}
                      </div>
                      {wh.secret && (
                        <p className="text-[10px] text-[#5c5c5e] mt-2">
                          Signed with HMAC-SHA256
                        </p>
                      )}
                      {log && (
                        <p className="text-[10px] text-[#5c5c5e] mt-1">
                          Last tested: {new Date(log.lastTested).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4 shrink-0">
                      <button
                        onClick={() => handleTestSingle(wh)}
                        disabled={testingWebhook === wh.id}
                        className="text-xs px-2 py-1 rounded hover:bg-[hsl(var(--border))] disabled:opacity-50"
                      >
                        {testingWebhook === wh.id ? 'Testing...' : 'Test'}
                      </button>
                      <button
                        onClick={() => handleDeleteWebhook(wh.id)}
                        className="text-xs px-2 py-1 rounded text-[#ff4757] hover:bg-[hsl(0,85%,60%,0.1)]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Test Results */}
      {showTestResults && testResults.length > 0 && (
        <section className="rounded-xl p-6" style={cardStyle()}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5c5c5e]">Test Results</h2>
            <button
              onClick={() => setShowTestResults(false)}
              className="text-xs px-2 py-1 rounded hover:bg-[hsl(var(--border))]"
            >
              Dismiss
            </button>
          </div>
          <div className="space-y-2">
            {testResults.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm"
                style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    r.success ? 'bg-[#2ed573]' : 'bg-[#ff4757]'
                  }`} />
                  <span className="truncate text-xs text-[#8b8b8e]">{r.url}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs text-[#5c5c5e]">
                  <span>{r.latency_ms}ms</span>
                  {!r.success && <span className="text-[#ff4757]">{r.error || 'failed'}</span>}
                  {r.success && <span className="text-[#2ed573]">OK</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {testMsg && (
        <p className={`text-sm ${testMsg.startsWith('Error') ? 'text-[#ff4757]' : 'text-[#2ed573]'}`}>{testMsg}</p>
      )}
    </div>
  );
}
