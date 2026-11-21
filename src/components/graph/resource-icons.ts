// Resource type → SVG icon mapping as data URIs
// These are minimal recognizable shapes rendered via Cytoscape background-image

function svgDataUri(svg: string): string {
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

function icon(size = 24): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">`;
}

function fe() { return '</svg>'; }

// Server / Compute
const INSTANCE = icon() + '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>' + fe();
const VPC = icon() + '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>' + fe();
const SUBNET = icon() + '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>' + fe();
const IGW = icon() + '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>' + fe();
const ROUTE_TABLE = icon() + '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="12" x2="14" y2="12"/>' + fe();
const CLUSTER = icon() + '<path d="M17 12a5 5 0 0 0-5-5M12 7a5 5 0 0 0-5 5"/><circle cx="12" cy="12" r="3"/><circle cx="12" cy="20" r="2"/><circle cx="4" cy="20" r="2"/><circle cx="20" cy="20" r="2"/><path d="M12 15v3"/><path d="M4 18v-2"/><path d="M20 18v-2"/>' + fe();
const NODE_GROUP = icon() + '<rect x="2" y="6" width="8" height="12" rx="1"/><rect x="14" y="6" width="8" height="12" rx="1"/><line x1="10" y1="12" x2="14" y2="12"/>' + fe();

// K8s
const POD = icon() + '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>' + fe();
const DEPLOYMENT = icon() + '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><line x1="6.5" y1="10" x2="6.5" y2="14"/><line x1="17.5" y1="10" x2="17.5" y2="14"/><line x1="10" y1="6.5" x2="14" y2="6.5"/>' + fe();
const NAMESPACE = icon() + '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>' + fe();
const SERVICE = icon() + '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>' + fe();

// GitHub
const REPOSITORY = icon() + '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>' + fe();

// Grafana
const DASHBOARD = icon() + '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>' + fe();

// Prometheus
const TARGET = icon() + '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' + fe();

// Generic / Unknown
const RESOURCE = icon() + '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>' + fe();

const ICON_MAP: Record<string, string> = {
  'aws.ec2.instance': INSTANCE,
  'aws.ec2.vpc': VPC,
  'aws.ec2.subnet': SUBNET,
  'aws.ec2.internet_gateway': IGW,
  'aws.ec2.route_table': ROUTE_TABLE,
  'aws.eks.cluster': CLUSTER,
  'aws.eks.nodegroup': NODE_GROUP,
  'k8s.pod': POD,
  'k8s.deployment': DEPLOYMENT,
  'k8s.namespace': NAMESPACE,
  'k8s.service': SERVICE,
  'github.repository': REPOSITORY,
  'grafana.dashboard': DASHBOARD,
  'prometheus.target': TARGET,
};

// Also match short type names
const SHORT_MAP: Record<string, string> = {
  instance: INSTANCE,
  vpc: VPC,
  subnet: SUBNET,
  internet_gateway: IGW,
  route_table: ROUTE_TABLE,
  cluster: CLUSTER,
  nodegroup: NODE_GROUP,
  pod: POD,
  deployment: DEPLOYMENT,
  namespace: NAMESPACE,
  service: SERVICE,
  repository: REPOSITORY,
  dashboard: DASHBOARD,
  target: TARGET,
  function: icon() + '<path d="M3 3h18v18H3z"/><path d="M9 3v18"/><path d="M3 9h6"/><path d="M3 15h6"/>' + fe(),
  bucket: icon() + '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><circle cx="12" cy="12" r="3"/>' + fe(),
};

export function getIconDataUri(type: string): string {
  // Try exact match first
  if (ICON_MAP[type]) return svgDataUri(ICON_MAP[type]);
  // Try short type
  const short = (type || '').split('.').pop() || type;
  if (SHORT_MAP[short]) return svgDataUri(SHORT_MAP[short]);
  // Fallback
  return svgDataUri(RESOURCE);
}

export function getStatusDot(status?: string): string | null {
  if (!status) return null;
  const s = status.toLowerCase();
  if (['running', 'available', 'healthy', 'active', 'ready'].includes(s)) return '#22c55e';
  if (['stopped', 'stopping', 'terminated', 'degraded', 'error', 'failed', 'unhealthy'].includes(s)) return '#ef4444';
  if (['pending', 'provisioning', 'updating', 'unknown'].includes(s)) return '#f59e0b';
  return null;
}
