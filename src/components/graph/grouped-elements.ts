export const PROVIDER_COLORS: Record<string, string> = {
  aws: '#FF9900',
  github: '#6e7681',
  azure: '#0078D4',
  gcp: '#4285F4',
  kubernetes: '#326CE5',
  digitalocean: '#0080FF',
  cloudflare: '#F38020',
  datadog: '#632CA6',
  pagerduty: '#04AC54',
  mongodb: '#00ED64',
  mysql: '#00758F',
  postgresql: '#336791',
  elasticsearch: '#00BFB3',
  newrelic: '#1CE783',
  jira: '#0052CC',
  confluence: '#172B4D',
  prometheus: '#E6522C',
  grafana: '#F46800',
  servicenow: '#81B5A1',
  vsphere: '#607078',
  slack: '#4A154B',
  codegraph: '#a855f7',
};

export function providerColor(provider: string): string {
  return PROVIDER_COLORS[provider.toLowerCase()] || '#636e72';
}

export interface ProviderGroup {
  provider: string;
  count: number;
  children: any[];
}

export interface GroupedResult {
  elements: any[];
  providerStats: Record<string, ProviderGroup>;
}

const TYPE_COLORS: Record<string, string> = {
  instance: '#6c5ce7',
  vpc: '#2ed573',
  subnet: '#ffa502',
  bucket: '#0097e6',
  cluster: '#e84393',
  function: '#00cec9',
  load_balancer: '#fd79a8',
  table: '#6c5ce7',
  repository: '#6e7681',
};

function colorForType(type: string, provider: string): string {
  const short = type.split('.').pop() || type;
  for (const [key, c] of Object.entries(TYPE_COLORS)) {
    if (short.includes(key)) return c;
  }
  return providerColor(provider);
}

// Build a 3-level hierarchy: Provider → Account → Type → Resources
export function buildHierarchicalElements(rawNodes: any[], rawEdges: any[]): GroupedResult {
  const elements: any[] = [];
  const nodeProvider: Record<string, string> = {};

  // Step 1: Group into provider → account → type
  const hierarchy: Record<string, Record<string, Record<string, any[]>>> = {};

  rawNodes.forEach((n: any) => {
    const provider = (n.provider || n.Provider || 'unknown').toLowerCase();
    const account = n.account_id || n.AccountID || 'default';
    const type = (n.type || n.Type || 'unknown').split('.').pop() || 'unknown';
    const id = n.id || n.ID || '';
    if (id) nodeProvider[id] = provider;

    if (!hierarchy[provider]) hierarchy[provider] = {};
    if (!hierarchy[provider][account]) hierarchy[provider][account] = {};
    if (!hierarchy[provider][account][type]) hierarchy[provider][account][type] = [];
    hierarchy[provider][account][type].push(n);
  });

  // Step 2: Build elements
  const providerIds = new Set<string>();

  Object.entries(hierarchy).forEach(([provider, accounts]) => {
    const providerNodeId = `tree_provider__${provider}`;
    providerIds.add(providerNodeId);

    // Provider hub
    let totalCount = 0;
    Object.values(accounts).forEach(types => Object.values(types).forEach(nodes => { totalCount += nodes.length; }));

    elements.push({
      data: {
        id: providerNodeId,
        label: provider.charAt(0).toUpperCase() + provider.slice(1),
        type: 'tree-provider',
        provider,
        color: providerColor(provider),
        nodeCount: totalCount,
        isProvider: true,
        treeLevel: 0,
      },
    });

    Object.entries(accounts).forEach(([account, types]) => {
      const accountNodeId = `tree_account__${provider}__${account}`;

      const accountCount = Object.values(types).reduce((sum: number, nodes: any[]) => sum + nodes.length, 0);

      // Account/Org hub
      const accountLabel = account.length > 20 ? account.substring(0, 18) + '…' : account;
      elements.push({
        data: {
          id: accountNodeId,
          label: accountLabel,
          type: 'tree-account',
          provider,
          account,
          color: providerColor(provider),
          nodeCount: accountCount,
          parentProvider: providerNodeId,
          treeLevel: 1,
        },
      });

      // Edge from provider to account
      elements.push({
        classes: 'belongs-to',
        data: {
          id: `belongs-prov-acct-${account}`,
          source: accountNodeId,
          target: providerNodeId,
          label: '',
          belongsToProvider: provider,
        },
      });

      Object.entries(types).forEach(([type, nodes]) => {
        const typeNodeId = `tree_type__${provider}__${account}__${type}`;
        const color = colorForType(type, provider);

        // Type hub
        elements.push({
          data: {
            id: typeNodeId,
            label: type.charAt(0).toUpperCase() + type.slice(1),
            type: 'tree-type',
            provider,
            account,
            color,
            nodeCount: nodes.length,
            parentAccount: accountNodeId,
            treeLevel: 2,
          },
        });

        // Edge from account to type
        elements.push({
          classes: 'belongs-to',
          data: {
            id: `belongs-acct-type-${type}`,
            source: typeNodeId,
            target: accountNodeId,
            label: '',
            belongsToProvider: provider,
          },
        });

        // Resource nodes
        nodes.forEach((n: any) => {
          const id = n.id || n.ID || '';
          elements.push({
            data: {
              id,
              label: n.name || n.Name || id,
              type: n.type || n.Type || 'unknown',
              shortType: type,
              color,
              provider,
              region: n.region || n.Region || '',
              properties: n.properties || n.Properties || {},
              parentType: typeNodeId,
              treeLevel: 3,
            },
          });

          elements.push({
            classes: 'belongs-to',
            data: {
              id: `belongs-type-res-${id}`,
              source: id,
              target: typeNodeId,
              label: '',
              belongsToProvider: provider,
            },
          });
        });
      });
    });
  });

  // Process original edges — only between real resource nodes
  const hierResIds = new Set(rawNodes.map((n: any) => n.id || n.ID || ''));
  rawEdges.forEach((e: any, i: number) => {
    const sourceId = e.source_id || e.SourceID || e.source || '';
    const targetId = e.target_id || e.TargetID || e.target || '';
    if (!hierResIds.has(sourceId) || !hierResIds.has(targetId)) return;
    const edgeId = sourceId && targetId ? `${sourceId}-${targetId}` : `e${i}`;
    const sourceProvider = nodeProvider[sourceId] || '';
    const targetProvider = nodeProvider[targetId] || '';
    const crossProvider = sourceProvider && targetProvider && sourceProvider !== targetProvider;

    elements.push({
      classes: crossProvider ? 'cross-group' : '',
      data: {
        id: edgeId,
        source: sourceId,
        target: targetId,
        label: e.type || e.Type || e.relationship_type || '',
        crossProvider,
      },
    });
  });

  // Build provider stats
  const providerStats: Record<string, ProviderGroup> = {};
  Object.entries(hierarchy).forEach(([provider, accounts]) => {
    let count = 0;
    Object.values(accounts).forEach(types => Object.values(types).forEach(nodes => { count += nodes.length; }));
    providerStats[provider] = { provider, count, children: [] };
  });

  return { elements, providerStats };
}

// Existing flat grouped view
export function buildGroupedElements(rawNodes: any[], rawEdges: any[]): GroupedResult {
  const elements: any[] = [];
  const groups: Record<string, any[]> = {};
  const nodeProvider: Record<string, string> = {};

  rawNodes.forEach((n: any) => {
    const provider = (n.provider || n.Provider || 'unknown').toLowerCase();
    if (!groups[provider]) groups[provider] = [];
    groups[provider].push(n);
    const id = n.id || n.ID || '';
    if (id) nodeProvider[id] = provider;
  });

  Object.entries(groups).forEach(([provider, nodes]) => {
    const providerNodeId = `__provider__${provider}`;

    elements.push({
      data: {
        id: providerNodeId,
        label: provider.charAt(0).toUpperCase() + provider.slice(1),
        type: 'provider-group',
        provider,
        color: providerColor(provider),
        nodeCount: nodes.length,
        isProvider: true,
      },
    });

    nodes.forEach((n: any, i: number) => {
      const id = n.id || n.ID || `n-${provider}-${i}`;
      const type = n.type || n.Type || 'unknown';
      elements.push({
        data: {
          id,
          label: n.name || n.Name || id,
          type,
          shortType: type.split('.').pop() || '?',
          color: providerColor(provider),
          provider,
          region: n.region || n.Region || '',
          properties: n.properties || n.Properties || {},
          isChild: true,
          parentProvider: provider,
        },
      });

      elements.push({
        classes: 'belongs-to',
        data: {
          id: `belongs-to-${id}-${provider}`,
          source: id,
          target: providerNodeId,
          label: '',
          belongsToProvider: provider,
        },
      });
    });
  });

  rawEdges.forEach((e: any, i: number) => {
    const sourceId = e.source_id || e.SourceID || e.source || '';
    const targetId = e.target_id || e.TargetID || e.target || '';
    const edgeId = sourceId && targetId ? `${sourceId}-${targetId}` : `e${i}`;
    const sourceProvider = nodeProvider[sourceId] || '';
    const targetProvider = nodeProvider[targetId] || '';
    const crossProvider = sourceProvider && targetProvider && sourceProvider !== targetProvider;

    elements.push({
      classes: crossProvider ? 'cross-group' : '',
      data: {
        id: edgeId,
        source: sourceId,
        target: targetId,
        label: e.type || e.Type || e.relationship_type || '',
        crossProvider,
      },
    });
  });

  const providerStats: Record<string, ProviderGroup> = {};
  Object.entries(groups).forEach(([provider, nodes]) => {
    providerStats[provider] = { provider, count: nodes.length, children: nodes };
  });

  return { elements, providerStats };
}
