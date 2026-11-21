// @ts-nocheck — demo interceptor, not worth typing the request matching
import { DEMO_TOKEN } from './jwt';
import { NODES, EDGES, CHANGES, SCOPES, RUNS, DOCS_LIST, getDocPage, RUNBOOKS, PROFILES, USERS, LICENSE, CONFIG, MERMAID_DIAGRAM, TERRAFORM_DRIFT, getQAAnswer, computeBlast } from './fixtures';

let installed = false;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export function installDemoInterceptor() {
  if (installed) return;
  installed = true;

  const originalFetch = window.fetch.bind(window);
  const isRequest = (v: any): v is Request => typeof Request !== 'undefined' && v instanceof Request;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    // Get URL string regardless of input type
    let urlStr: string;
    if (typeof input === 'string') urlStr = input;
    else if (isRequest(input)) urlStr = input.url;
    else if (input instanceof URL) urlStr = input.toString();
    else return originalFetch(input, init);

    let url: URL;
    try { url = new URL(urlStr, window.location.href); }
    catch { return originalFetch(input, init); }

    const method = (init?.method ?? 'GET').toUpperCase();

    if (!url.pathname.startsWith('/api/v1/')) {
      return isRequest(input)
        ? originalFetch(input)
        : originalFetch(urlStr, init);
    }

    await delay(60 + Math.random() * 80);

    const p = url.pathname;
    const body = init?.body ? JSON.parse(init.body as string) : {};

    // ─── SSO Quick-Start Providers ──────────────────────────────────────────
    if (p === '/api/v1/auth/sso/providers') {
      return json({
        data: {
          providers: [
            {
              name: 'google', label: 'Google',
              issuer_url: 'https://accounts.google.com',
              scopes: ['openid', 'profile', 'email'],
              auth_url: 'https://accounts.google.com/o/oauth2/v2/auth',
              token_url: 'https://oauth2.googleapis.com/token',
              jwks_url: 'https://www.googleapis.com/oauth2/v3/certs',
              description: 'Google Workspace — any Google account',
            },
            {
              name: 'github', label: 'GitHub',
              issuer_url: 'https://token.actions.githubusercontent.com',
              scopes: ['openid', 'email'],
              auth_url: 'https://github.com/login/oauth/authorize',
              token_url: 'https://github.com/login/oauth/access_token',
              jwks_url: 'https://token.actions.githubusercontent.com/.well-known/jwks',
              description: 'GitHub — any GitHub account',
            },
            {
              name: 'microsoft', label: 'Microsoft Entra ID',
              issuer_url: 'https://login.microsoftonline.com/{tenant}/v2.0',
              scopes: ['openid', 'profile', 'email'],
              auth_url: 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize',
              token_url: 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token',
              jwks_url: 'https://login.microsoftonline.com/{tenant}/discovery/v2.0/keys',
              description: 'Microsoft Entra ID (Azure AD) — requires tenant ID and client credentials',
              config_fields: ['client_id', 'client_secret', 'tenant_id'],
            },
          ],
        },
      });
    }

    // ─── Auth ───────────────────────────────────────────────────────────────
    if (p === '/api/v1/login' && method === 'POST') {
      return json({ access_token: DEMO_TOKEN });
    }
    if (p === '/api/v1/auth/sso/status') {
      return json({ data: { enabled: true, providers: [{ name: 'google', label: 'Google' }] } });
    }
    if (p.startsWith('/api/v1/auth/sso/') && p !== '/api/v1/auth/sso/status') {
      return new Response(null, { status: 302, headers: { location: '/sso/callback?token=' + DEMO_TOKEN + '&expires_in=86400' } });
    }

    // ─── Graph ──────────────────────────────────────────────────────────────
    if (p === '/api/v1/graph/export') {
      return json({ data: { nodes: NODES, edges: EDGES } });
    }
    if (p === '/api/v1/graph/diagram') {
      return json({ data: { diagram: MERMAID_DIAGRAM } });
    }
    const blastMatch = p.match(/^\/api\/v1\/graph\/blast\/(.+)$/);
    if (blastMatch) {
      const nodeId = decodeURIComponent(blastMatch[1]);
      return json({ data: { impacted: computeBlast(nodeId).map(id => ({ resource_id: id })) } });
    }

    // ─── Search ─────────────────────────────────────────────────────────────
    if (p === '/api/v1/search') {
      const q = (url.searchParams.get('q') || '').toLowerCase();
      const types = url.searchParams.getAll('type').filter(Boolean);
      const providers = url.searchParams.getAll('provider').filter(Boolean);
      const regions = url.searchParams.getAll('region').filter(Boolean);
      const tags = url.searchParams.getAll('tag').filter(Boolean);
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const page = parseInt(url.searchParams.get('page') || '1', 10);

      let results = NODES.map(n => ({
        id: n.id, name: n.name, type: n.type, provider: n.provider,
        region: n.region, status: n.status, properties: n.properties, tags: n.tags || [],
      }));
      if (q) results = results.filter(r => r.name.toLowerCase().includes(q) || r.id.includes(q) || r.type.includes(q));
      if (types.length > 0) results = results.filter(r => types.some((t: string) => r.type.toLowerCase() === t.toLowerCase()));
      if (providers.length > 0) results = results.filter(r => providers.some((p: string) => r.provider.toLowerCase() === p.toLowerCase()));
      if (regions.length > 0) results = results.filter(r => regions.some((reg: string) => r.region.toLowerCase() === reg.toLowerCase()));
      if (tags.length > 0) results = results.filter(r => r.tags && tags.some((t: string) => r.tags.some((rt: string) => rt.toLowerCase().includes(t.toLowerCase()))));

      const total = results.length;
      const start = (page - 1) * limit;
      const paged = results.slice(start, start + limit);

      return json({ data: { results: paged, total } });
    }

    // ─── Knowledge / QA / Dashboard ────────────────────────────────────────
    if (p === '/api/v1/knowledge/gaps') {
      return json({ data: { total: 24, covered: DOCS_LIST.length } });
    }
    if (p === '/api/v1/qa' && method === 'POST') {
      return json({ data: { answer: getQAAnswer(body.question || '') } });
    }

	    if (p === '/api/v1/qa/stream' && method === 'POST') {
	      const answer = getQAAnswer(body.question || '');
	      const words = answer.split(/(?<=\s)/);
	      const encoder = new TextEncoder();
	      const stream = new ReadableStream({
	        async start(controller) {
	          for (const word of words) {
	            await delay(15 + Math.random() * 25);
	            const token = JSON.stringify({ type: 'token', content: word });
	            controller.enqueue(encoder.encode('data: ' + token + '\n\n'));
	          }
	          const done = JSON.stringify({ type: 'done' });
	          controller.enqueue(encoder.encode('data: ' + done + '\n\n'));
	          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
	          controller.close();
	        }
	      });
	      return new Response(stream, {
	        headers: {
	          'content-type': 'text/event-stream',
	          'cache-control': 'no-cache',
	          'connection': 'keep-alive',
	        },
	      });
	    }

	    // ─── Docs ───────────────────────────────────────────────────────────────
    if (p === '/api/v1/docs' || p === '/api/v1/docs/') {
      return json({ data: DOCS_LIST });
    }
    const docMatch = p.match(/^\/api\/v1\/docs\/(.+)$/);
    if (docMatch) {
      const docId = decodeURIComponent(docMatch[1]);
      const doc = getDocPage(docId);
      return json({ data: doc });
    }

    // ─── Runbooks ───────────────────────────────────────────────────────────
    if (p === '/api/v1/runbooks' || p === '/api/v1/runbooks/') {
      if (method === 'POST') {
        const rb = { id: `rb-demo-${Date.now()}`, title: body.title || 'Untitled', service_name: body.title || '', resource_ids: body.resource_ids || [], template: body.template || 'standard', content: `# Runbook: ${body.title || 'Untitled'}\n\n## Overview\n\nThis runbook was generated for resource \`${(body.resource_ids || [])[0] || 'unknown'}\`.\n\n## Health Checks\n\n- Service health endpoint: \`GET /health\`\n- Metrics available at :9090\n\n## Common Procedures\n\n### Verify service status\n\`\`\`bash\nkubectl get pods -n $(namespace) -l app=$(service)\nkubectl logs -n $(namespace) -l app=$(service) --tail=50\n\`\`\`\n\n### Restart service\n\`\`\`bash\nkubectl rollout restart deployment/$(service) -n $(namespace)\n\`\`\`\n\n## Dependencies\n\nCheck the infrastructure graph for upstream and downstream dependencies.`, createdAt: new Date().toISOString() };
        RUNBOOKS.unshift(rb);
        return json({ data: { runbook: rb } });
      }
      return json({ data: RUNBOOKS });
    }
    const streamMatch = p.match(/^\/api\/v1\/runbooks\/([^/]+)\/stream$/);
    if (streamMatch) {
      const rbId = streamMatch[1];
      const markdown = `# Runbook\n\n## Overview\n\nThis runbook details the operational procedures for the selected resource.\n\n## Health Checks\n\n- Health endpoint: \`GET /health\`\n- Metrics: available at port 9090\n\n## Restart Procedure\n\n\`\`\`bash\nkubectl rollout restart deployment/my-service\n\`\`\`\n\n## Scaling\n\n\`\`\`bash\nkubectl scale deployment/my-service --replicas=3\n\`\`\`\n\n## Logs\n\n\`\`\`bash\nkubectl logs -l app=my-service --tail=100\n\`\`\`\n\n## Dependencies\n\n- Database (postgres://primary)\n- Cache (redis://cache)`;
      const encoder = new TextEncoder();
      const words = markdown.split(/(?<=\s)/);
      const stream = new ReadableStream({
        async start(controller) {
          for (const word of words) {
            await delay(10 + Math.random() * 20);
            const token = JSON.stringify({ type: 'token', content: word });
            controller.enqueue(encoder.encode('data: ' + token + '\n\n'));
          }
          const done = JSON.stringify({ type: 'done' });
          controller.enqueue(encoder.encode('data: ' + done + '\n\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });
      return new Response(stream, {
        headers: {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          'connection': 'keep-alive',
        },
      });
    }

    // ─── Discovery ──────────────────────────────────────────────────────────
    if (p === '/api/v1/discovery/scopes' || p === '/api/v1/discovery/scopes/') {
      if (method === 'POST') return json({ data: { id: `scope-${Date.now()}`, name: body.name, plugin_name: body.plugin_name || '', config: body.config || {}, status: 'active' } }, 201);
      return json({ data: SCOPES });
    }
    const scopeMatch = p.match(/^\/api\/v1\/discovery\/scopes\/([^/]+)$/);
    if (scopeMatch) {
      if (method === 'DELETE') return new Response(null, { status: 204 });
      return json({ data: SCOPES.find(s => s.id === scopeMatch[1]) || SCOPES[0] });
    }
    const scopeTestMatch = p.match(/^\/api\/v1\/discovery\/scopes\/([^/]+)\/test$/);
    if (scopeTestMatch) {
      return json({ data: { status: 'success', latency_ms: 120 } });
    }
    if (p === '/api/v1/discovery/runs' || p === '/api/v1/discovery/runs/') {
      if (method === 'POST') {
        const run = { id: `run-${Date.now()}`, scope_id: body.scope_id || 'unknown', status: 'running', started_at: new Date().toISOString() };
        RUNS.unshift(run);
        return json({ data: run }, 202);
      }
      return json({ data: RUNS.slice(0, 20) });
    }
    if (p === '/api/v1/discovery/demo-run' && method === 'POST') {
      await delay(2800);
      return json({ data: { nodes_found: 38, edges_found: 38, resource_types: 12 } });
    }
    if (p === '/api/v1/discovery/status') {
      const lastRun = RUNS.length > 0 ? RUNS[0] : null;
      return json({ data: { status: 'idle', last_run: lastRun, total_runs: RUNS.length, total_resources: NODES.length } });
    }

    // ─── License ────────────────────────────────────────────────────────────
    if (p === '/api/v1/license') return json({ data: LICENSE });
    if (p === '/api/v1/license/activate' && method === 'POST') return json({ data: { ...LICENSE, activated: true } });

    // ─── Admin Users ────────────────────────────────────────────────────────
    if (p === '/api/v1/admin/users' || p === '/api/v1/admin/users/') {
      if (method === 'POST') {
        USERS.unshift({ id: `u-${Date.now()}`, email: body.email || 'new@example.com', role: body.role || 'viewer', created_at: new Date().toISOString() });
        return json({ data: { status: 'created' } }, 201);
      }
      return json({ data: USERS });
    }
    const userMatch = p.match(/^\/api\/v1\/admin\/users\/(.+)$/);
    if (userMatch) {
      const uid = userMatch[1];
      if (method === 'DELETE') {
        const idx = USERS.findIndex(u => u.id === uid);
        if (idx !== -1) USERS.splice(idx, 1);
        return json({ data: { status: 'deleted' } });
      }
      if (method === 'PUT') {
        const u = USERS.find(u => u.id === uid);
        if (u) { u.role = body.role || u.role; }
        return json({ data: { status: 'updated' } });
      }
    }

    // ─── Admin ──────────────────────────────────────────────────────────────
    if (p === '/api/v1/admin/config') return json({ data: CONFIG });
    if (p === '/api/v1/admin/runbook-context' && method === 'PUT') return json({ data: { saved: true } });
    if (p === '/api/v1/admin/llm/profiles' || p === '/api/v1/admin/llm/profiles/') {
      if (method === 'POST') return json({ data: { ...body, name: body.name || 'new-profile' } });
      return json({ data: PROFILES });
    }
    const profileMatch = p.match(/^\/api\/v1\/admin\/llm\/profiles\/(.+)$/);
    if (profileMatch) {
      if (method === 'DELETE') return json({ data: { deleted: true } });
      return json({ data: PROFILES.find(pf => pf.name === profileMatch[1]) || PROFILES[0] });
    }
    if (p === '/api/v1/admin/llm/test') return json({ data: { success: true, latency_ms: 450 } });
    if (p === '/api/v1/admin/scim/config') {
      if (method === 'POST') return json({ data: { status: 'saved' } });
      return json({ data: { enabled: true, token: 'scim-demo-token-' + Date.now() } });
    }

    // --- SCIM v2 ----------------------------------------------------------------
    if (p === '/api/v1/scim/v2/Users' || p === '/api/v1/scim/v2/Users/') {
      if (method === 'POST') {
        const newUser = {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User', 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'],
          id: 'u-' + Date.now(),
          userName: body.userName || 'scim@example.com',
          name: { formatted: body.userName || 'scim@example.com' },
          emails: [{ value: body.userName || 'scim@example.com', primary: true, type: 'work' }],
          active: true,
          meta: { resourceType: 'User', created: new Date().toISOString(), lastModified: new Date().toISOString() },
          'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User': { department: 'viewer' },
        };
        USERS.unshift({ id: newUser.id, email: newUser.userName, role: 'viewer', created_at: new Date().toISOString() });
        return json(newUser, 201);
      }
      const scimResources = USERS.map(u => ({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User', 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'],
        id: u.id, userName: u.email,
        name: { formatted: u.email },
        emails: [{ value: u.email, primary: true, type: 'work' }],
        active: true,
        meta: { resourceType: 'User', created: u.created_at || new Date().toISOString(), lastModified: u.created_at || new Date().toISOString() },
        'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User': { department: u.role },
      }));
      return json({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        totalResults: scimResources.length,
        itemsPerPage: 50, startIndex: 1,
        Resources: scimResources,
      });
    }
    const scimMatch = p.match(/^\/api\/v1\/scim\/v2\/Users\/(.+)$/);
    if (scimMatch) {
      const suid = scimMatch[1];
      const su = USERS.find(u => u.id === suid);
      if (!su) return json({ schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], detail: 'user not found', status: '404' }, 404);
      if (method === 'DELETE') {
        const idx = USERS.findIndex(u => u.id === suid);
        if (idx !== -1) USERS.splice(idx, 1);
        return new Response(null, { status: 204 });
      }
      const scimUser = () => ({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User', 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'],
        id: su.id, userName: su.email,
        name: { formatted: su.email },
        emails: [{ value: su.email, primary: true, type: 'work' }],
        active: true,
        meta: { resourceType: 'User', created: su.created_at || new Date().toISOString(), lastModified: su.created_at || new Date().toISOString() },
        'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User': { department: su.role },
      });
      if (method === 'PUT' || method === 'PATCH') {
        su.email = body.userName || body.emails?.[0]?.value || su.email;
        return json(scimUser());
      }
      return json(scimUser());
    }

    // --- Webhooks ----------------------------------------------------------------
    if (p === '/api/v1/admin/notifications/webhooks' || p === '/api/v1/admin/notifications/webhooks/') {
      if (method === 'POST') {
        const wh = { id: `wh-${Date.now()}`, url: body.url, events: body.events || [], secret: body.secret || '', created_at: new Date().toISOString() };
        return json({ data: wh }, 201);
      }
      return json({ data: [
        { id: 'wh-1', url: 'https://hooks.example.com/events', events: ['discovery.completed', 'drift.detected'], secret: '***', created_at: '2026-05-10T12:00:00Z' },
        { id: 'wh-2', url: 'https://hooks.slack.com/webhook', events: ['change.detected'], created_at: '2026-05-12T08:30:00Z' },
      ] });
    }
    const whMatch = p.match(/^\/api\/v1\/admin\/notifications\/webhooks\/(.+)$/);
    if (whMatch) {
      if (method === 'DELETE') return json({ data: { status: 'deleted' } });
    }
    if (p === '/api/v1/admin/notifications/test' && method === 'POST') {
      const targetUrl = body.url || 'https://hooks.example.com/events';
      const latency = 80 + Math.floor(Math.random() * 200);
      const success = Math.random() > 0.15;
      return json({
        data: {
          total: 1,
          results: [{
            webhook_id: 'wh-test',
            url: targetUrl,
            success,
            latency_ms: latency,
            ...(success ? {} : { error: 'unexpected status: 502' }),
          }],
        },
      });
    }


    // ─── Terraform Drift ──────────────────────────────────────────────────
    if (p === '/api/v1/terraform/drift') {
      return json({ data: TERRAFORM_DRIFT });
    }

    // ─── Changes ──────────────────────────────────────────────────────────────
    if (p === '/api/v1/changes') {
      return json({ data: CHANGES });
    }

    // ─── Integrations ─────────────────────────────────────────────────────────
    if (p === '/api/v1/integrations/status') {
      const baseUrl = window.location.origin + '/api/v1/integrations';
      return json({ data: { integrations: [
        { name: 'backstage', description: 'Export infrastructure resources as Backstage Catalog entities (backstage.io/v1alpha1). Compatible with Backstage, Atlassian Compass, and custom developer portals.', available: true, export_url: baseUrl + '/backstage/export', doc_url: 'https://backstage.io/docs/features/software-catalog/' },
        { name: 'compass', description: 'Export infrastructure resources in Atlassian Compass JSON format. Maps resources to Compass component types with custom properties.', available: false, export_url: '', doc_url: 'https://developer.atlassian.com/cloud/compass/' },
        { name: 'custom-api', description: 'Generic JSON API returning all resources and relationships. Consumable by any developer portal or internal tool via standard HTTP.', available: true, export_url: baseUrl + '/backstage', doc_url: '' },
      ], count: 3 } });
    }

    if (p === '/api/v1/integrations/backstage') {
      const entities = NODES.map(n => ({
        apiVersion: 'backstage.io/v1alpha1',
        kind: (n.type || n.Type || '').startsWith('k8s.deployment') ? 'Component' : 'Resource',
        metadata: {
          name: (n.name || n.Name || '').toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          annotations: {
            'zerelio/id': n.id || n.ID || '',
            'zerelio/type': n.type || n.Type || '',
            'zerelio/provider': n.provider || n.Provider || '',
          },
          tags: ['discovered', n.provider || n.Provider || ''],
        },
        spec: {
          type: 'service',
          lifecycle: 'production',
          owner: 'infrastructure',
          system: (n.provider || n.Provider || '') + '-' + (n.region || 'default'),
        },
      }));
      return json({ data: { entities, total: entities.length } });
    }

    if (p === '/api/v1/integrations/backstage/export') {
      // Return downloadable YAML content
      const entityLines = NODES.map((n, i) => {
        const name = (n.name || n.Name || '').toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'resource';
        const kind = (n.type || n.Type || '').startsWith('k8s.deployment') ? 'Component' : 'Resource';
        const provider = n.provider || n.Provider || '';
        const region = n.region || 'default';
        const type = n.type || n.Type || '';
        const id = n.id || n.ID || '';
        return `---
apiVersion: backstage.io/v1alpha1
kind: ${kind}
metadata:
  name: ${name}
  annotations:
    zerelio/id: ${id}
    zerelio/type: ${type}
    zerelio/provider: ${provider}
  tags:
  - discovered
  - ${provider}
spec:
  type: service
  lifecycle: production
  owner: infrastructure
  system: ${provider}-${region}`;
      }).join('\n');
      const yaml = '# Zerelio - Backstage Catalog Export\n' +
        `# Generated: ${NODES.length} entities\n` +
        entityLines + '\n';
      return new Response(yaml, {
        status: 200,
        headers: {
          'content-type': 'application/x-yaml',
          'content-disposition': 'attachment; filename="backstage-catalog.yaml"',
        },
      });
    }

    // ─── Bulk Operations ────────────────────────────────────────────────
    if (p === '/api/v1/resources/bulk/tag' && method === 'POST') {
      const { ids, tags } = body;
      return json({ data: { status: 'tagged', ids_affected: (ids || []).length, tags: tags || [] } });
    }
    if (p === '/api/v1/resources/bulk/delete' && method === 'POST') {
      const { ids } = body;
      return json({ data: { status: 'deleted', ids_affected: (ids || []).length } });
    }
    if (p === '/api/v1/resources/bulk/export' && method === 'POST') {
      const { ids, format } = body;
      const resources = NODES.filter((n: any) => (ids || []).includes(n.id || n.ID));
      const data = { resources, total: resources.length, format: format || 'json' };
      if (format === 'csv') {
        const csv = 'id,name,type,provider,region\n' + resources.map((r: any) => `${r.id || r.ID},${r.name || r.Name},${r.type || ''},${r.provider || ''},${r.region || ''}`).join('\n');
        return new Response(csv, { status: 200, headers: { 'content-type': 'text/csv', 'content-disposition': 'attachment; filename="resources.csv"' } });
      }
      return json({ data });
    }


	    // ─── Audit Log ──────────────────────────────────────────────────────────
	    if (p === '/api/v1/admin/audit/stats') {
	      return json({ data: {
	        total_events: 847,
	        unique_actors: 12,
	        events_today: 23,
	        by_action: {
	          'user.login': 412,
	          'user.created': 8,
	          'user.deleted': 3,
	          'scope.created': 14,
	          'scope.deleted': 5,
	          'discovery.started': 156,
	          'discovery.completed': 156,
	          'terraform.imported': 93,
	        },
	        by_actor: {
	          'admin@knowledgetree.dev': 412,
	          'alice@knowledgetree.dev': 186,
	          'bob@knowledgetree.dev': 134,
	          'ci-bot@knowledgetree.dev': 93,
	          'system': 22,
	        },
	        per_day: Array.from({ length: 30 }, (_, i) => {
	          const d = new Date();
	          d.setDate(d.getDate() - (29 - i));
	          return { date: d.toISOString().split('T')[0], count: Math.floor(15 + Math.random() * 35) };
	        }),
	      } });
	    }

	    const auditMatch = p.match(/^\/api\/v1\/admin\/audit(\/.*)?$/);
	    if (auditMatch && !auditMatch[1]) {
	      const eventTypes = ['user.login', 'user.created', 'user.deleted', 'scope.created', 'scope.deleted', 'discovery.started', 'discovery.completed', 'terraform.imported'];
	      const actors = ['admin@knowledgetree.dev', 'alice@knowledgetree.dev', 'bob@knowledgetree.dev', 'ci-bot@knowledgetree.dev', 'system'];
	      const resourceTypes = ['user', 'scope', 'discovery_run', 'terraform'];
	      const detailsMap: Record<string, any> = {
	        'user.login': null,
	        'user.created': { email: 'newuser@example.com', role: 'viewer' },
	        'user.deleted': null,
	        'scope.created': { name: 'production-aws', plugin: 'aws' },
	        'scope.deleted': null,
	        'discovery.started': { scope_id: 'scope-1', plugin: 'aws' },
	        'discovery.completed': { status: 'completed', resources_found: 42, relationships_found: 38 },
	        'terraform.imported': { resources_imported: 12, missing_drift: 0 },
	      };

	      const params = new URL(urlStr, window.location.href).searchParams;
	      const limit = parseInt(params.get('limit') || '50', 10);
	      const offset = parseInt(params.get('offset') || '0', 10);
	      const filterAction = params.get('event_type') || '';
	      const filterActor = params.get('actor') || '';
	      const filterSearch = params.get('search') || '';

	      // Generate 200 mock entries
	      let prevHash = '';
      const allEntries = Array.from({ length: 200 }, (_, i) => {
	        const action = eventTypes[Math.floor(Math.random() * eventTypes.length)];
	        const actor = actors[Math.floor(Math.random() * actors.length)];
	        const resType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
	        const ts = new Date();
	        ts.setMinutes(ts.getMinutes() - i * 5 - Math.floor(Math.random() * 5));
	        return {
	          id: i + 1,
	          action,
	          actor,
	          resource_type: resType,
	          resource_id: resType + '-' + (1000 + i),
	          details: detailsMap[action] || {},
	          created_at: ts.toISOString(),
	        };
	      }).filter((e: any) => {
	        if (filterAction && e.event_type !== filterAction) return false;
	        if (filterActor && !e.actor.toLowerCase().includes(filterActor.toLowerCase())) return false;
	        if (filterSearch) {
	          const searchable = JSON.stringify(e).toLowerCase();
	          if (!searchable.includes(filterSearch.toLowerCase())) return false;
	        }
	        return true;
	      });

	      const total = allEntries.length;
	      const paged = allEntries.slice(offset, offset + limit);

	      return json({ data: { entries: paged, total, limit, offset } });
	    }

        // ─── Compliance endpoints ──────────────────────────────────────────────
    if (p === '/api/v1/admin/compliance/policies' && method === 'GET') {
      return json({ data: { policies: [
        { id: 'p1', name: 'soc2_owner_tags', description: 'All resources must have an owner tag', framework: 'soc2', severity: 'high', enabled: true, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' },
        { id: 'p2', name: 'pcidss_encryption', description: 'All storage resources must be encrypted', framework: 'pcidss', severity: 'critical', enabled: true, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' },
        { id: 'p3', name: 'iso27001_change_tracking', description: 'Change tracking must be enabled for all critical resources', framework: 'iso27001', severity: 'medium', enabled: true, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-02T00:00:00Z' },
        { id: 'p4', name: 'gdpr_data_residency', description: 'Data must remain in approved regions', framework: 'gdpr', severity: 'critical', enabled: false, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' },
      ]}});
    }
    if (p === '/api/v1/admin/compliance/summary' && method === 'GET') {
      return json({ data: { summary: [
        { framework: 'soc2', total_controls: 5, passing: 4, failing: 1, score: 80 },
        { framework: 'pcidss', total_controls: 3, passing: 2, failing: 1, score: 67 },
        { framework: 'iso27001', total_controls: 4, passing: 3, failing: 1, score: 75 },
      ]}});
    }
    if (p === '/api/v1/admin/compliance/evaluate' && method === 'POST') {
      return json({ data: { run: { id: 'run-demo', status: 'completed', total_checks: 3, passed: 2, failed: 1, warnings: 0 }, results: [] }});
    }
    if (p === '/api/v1/admin/compliance/results' && method === 'GET') {
      return json({ data: { results: [] }});
    }
    if (p === '/api/v1/admin/compliance/findings' && method === 'GET') {
      return json({ data: { findings: [
        { id: 'f1', policy_id: 'p1', resource_id: 'aws:ec2:bastion-host', rule: 'soc2_owner_tags', severity: 'high', status: 'open', message: 'Resource missing owner tag', created_at: '2026-06-15T10:00:00Z' },
        { id: 'f2', policy_id: 'p2', resource_id: 'k8s:deployment:payment-service', rule: 'pcidss_encryption', severity: 'critical', status: 'open', message: 'Payment service not encrypted', created_at: '2026-06-15T10:00:00Z' },
      ]}});
    }
    if (p === '/api/v1/admin/audit/verify' && method === 'POST') {
      return json({ data: { valid: true, violations: [], last_hash: 'a1b2c3d4e5f6...', verified_at: new Date().toISOString() }});
    }
    if (p === '/api/v1/admin/evidence' && method === 'GET') {
      return json({ data: { records: [
        { id: 'ev1', name: 'evidence-20260615-snapshot.json', description: 'Automated evidence snapshot', evidence_type: 'snapshot', file_size: 18420, content_hash: 'abc123', resource_count: 28, audit_count: 200, created_by: 'demo', created_at: '2026-06-15T12:00:00Z' },
      ]}});
    }

// ─── Fallback ───────────────────────────────────────────────────────────
    return json({ error: `Demo endpoint not implemented: ${method} ${p}` }, 501);
  };
}
