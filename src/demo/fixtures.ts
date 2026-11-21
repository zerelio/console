// Demo fixtures — realistic infrastructure topology for zerelio.local

// ─── Nodes ──────────────────────────────────────────────────────────────────────
export const NODES = [
  // AWS infrastructure
  { id: 'aws-eks-prod', ID: 'aws-eks-prod', name: 'eks-prod', Name: 'eks-prod', type: 'k8s.cluster', Type: 'k8s.cluster', provider: 'aws', Provider: 'aws', region: 'us-east-1', properties: { version: '1.29', nodeCount: 12 }, tags: ['Name=eks-prod', 'environment=production', 'team=platform'], status: 'healthy' },
  { id: 'aws-rds-orders', ID: 'aws-rds-orders', name: 'orders-postgres', Name: 'orders-postgres', type: 'aws.rds.instance', Type: 'aws.rds.instance', provider: 'aws', Provider: 'aws', region: 'us-east-1', properties: { engine: 'postgres', size: 'db.r6g.xlarge', storage: '500GB', source: 'terraform' }, tags: ['Name=orders-postgres', 'environment=production', 'team=ecommerce', 'tier=critical'], status: 'healthy' },
  { id: 'aws-rds-catalog', ID: 'aws-rds-catalog', name: 'catalog-postgres', Name: 'catalog-postgres', type: 'aws.rds.instance', Type: 'aws.rds.instance', provider: 'aws', Provider: 'aws', region: 'us-east-1', properties: { engine: 'postgres', size: 'db.r6g.large', storage: '200GB', source: 'terraform' }, tags: ['Name=catalog-postgres', 'environment=production', 'team=catalog'], status: 'healthy' },
  { id: 'aws-rds-identity', ID: 'aws-rds-identity', name: 'identity-postgres', Name: 'identity-postgres', type: 'aws.rds.instance', Type: 'aws.rds.instance', provider: 'aws', Provider: 'aws', region: 'us-east-1', properties: { engine: 'postgres', size: 'db.t3.medium', storage: '100GB', source: 'terraform' }, status: 'healthy' },
  { id: 'aws-elasticache-session', ID: 'aws-elasticache-session', name: 'session-redis', Name: 'session-redis', type: 'aws.elasticache.cluster', Type: 'aws.elasticache.cluster', provider: 'aws', Provider: 'aws', region: 'us-east-1', properties: { engine: 'redis', nodeType: 'cache.r6g.large', shards: 3, source: 'terraform' }, status: 'healthy' },
  { id: 'aws-elasticache-cart', ID: 'aws-elasticache-cart', name: 'cart-redis', Name: 'cart-redis', type: 'aws.elasticache.cluster', Type: 'aws.elasticache.cluster', provider: 'aws', Provider: 'aws', region: 'us-east-1', properties: { engine: 'redis', nodeType: 'cache.r6g.large', shards: 2 }, status: 'healthy' },
  { id: 'aws-msk-events', ID: 'aws-msk-events', name: 'kafka-events', Name: 'kafka-events', type: 'aws.msk.cluster', Type: 'aws.msk.cluster', provider: 'aws', Provider: 'aws', region: 'us-east-1', properties: { kafkaVersion: '3.6', topics: 42 }, status: 'degraded' },
  { id: 'aws-s3-assets', ID: 'aws-s3-assets', name: 's3-product-assets', Name: 's3-product-assets', type: 'aws.s3.bucket', Type: 'aws.s3.bucket', provider: 'aws', Provider: 'aws', region: 'us-east-1', properties: { encryption: 'AES256', versioning: true, source: 'terraform' }, status: 'healthy' },
  { id: 'aws-s3-analytics', ID: 'aws-s3-analytics', name: 's3-analytics-events', Name: 's3-analytics-events', type: 'aws.s3.bucket', Type: 'aws.s3.bucket', provider: 'aws', Provider: 'aws', region: 'us-east-1', properties: { encryption: 'AES256', lifecycle: '30d-ia-90d-glacier' }, status: 'healthy' },
  { id: 'aws-elb-public', ID: 'aws-elb-public', name: 'public-alb', Name: 'public-alb', type: 'aws.elb.load_balancer', Type: 'aws.elb.load_balancer', provider: 'aws', Provider: 'aws', region: 'us-east-1', properties: { scheme: 'internet-facing', listeners: ['443'], source: 'terraform' }, status: 'healthy' },
  { id: 'aws-ec2-bastion', ID: 'aws-ec2-bastion', name: 'bastion-host', Name: 'bastion-host', type: 'aws.ec2.instance', Type: 'aws.ec2.instance', provider: 'aws', Provider: 'aws', region: 'us-east-1', properties: { instanceType: 't3.nano', ami: 'amzn2-ami-hvm', source: 'terraform' }, status: 'healthy' },
  { id: 'aws-opensearch-catalog', ID: 'aws-opensearch-catalog', name: 'catalog-opensearch', Name: 'catalog-opensearch', type: 'aws.opensearch.domain', Type: 'aws.opensearch.domain', provider: 'aws', Provider: 'aws', region: 'eu-west-1', properties: { version: '2.11', nodes: 3, source: 'terraform' }, status: 'healthy' },

  // Kubernetes services
  { id: 'k8s-web-gateway', ID: 'k8s-web-gateway', name: 'web-gateway', Name: 'web-gateway', type: 'k8s.deployment', Type: 'k8s.deployment', provider: 'kubernetes', Provider: 'kubernetes', region: 'us-east-1', properties: { replicas: 4, namespace: 'platform', image: 'kt/gateway:3.2.1' }, tags: ['Name=web-gateway', 'environment=production', 'team=platform', 'app=gateway'], status: 'healthy' },
  { id: 'k8s-checkout-api', ID: 'k8s-checkout-api', name: 'checkout-api', Name: 'checkout-api', type: 'k8s.deployment', Type: 'k8s.deployment', provider: 'kubernetes', Provider: 'kubernetes', region: 'us-east-1', properties: { replicas: 6, namespace: 'checkout', image: 'kt/checkout:2.1.0' }, status: 'healthy' },
  { id: 'k8s-payments', ID: 'k8s-payments', name: 'payments-service', Name: 'payments-service', type: 'k8s.deployment', Type: 'k8s.deployment', provider: 'kubernetes', Provider: 'kubernetes', region: 'us-east-1', properties: { replicas: 3, namespace: 'checkout', image: 'kt/payments:1.8.3' }, status: 'degraded' },
  { id: 'k8s-inventory', ID: 'k8s-inventory', name: 'inventory-service', Name: 'inventory-service', type: 'k8s.deployment', Type: 'k8s.deployment', provider: 'kubernetes', Provider: 'kubernetes', region: 'us-east-1', properties: { replicas: 2, namespace: 'catalog', image: 'kt/inventory:1.3.0' }, status: 'healthy' },
  { id: 'k8s-catalog-api', ID: 'k8s-catalog-api', name: 'catalog-api', Name: 'catalog-api', type: 'k8s.deployment', Type: 'k8s.deployment', provider: 'kubernetes', Provider: 'kubernetes', region: 'us-east-1', properties: { replicas: 4, namespace: 'catalog', image: 'kt/catalog:3.0.1' }, status: 'healthy' },
  { id: 'k8s-identity', ID: 'k8s-identity', name: 'identity-service', Name: 'identity-service', type: 'k8s.deployment', Type: 'k8s.deployment', provider: 'kubernetes', Provider: 'kubernetes', region: 'us-east-1', properties: { replicas: 3, namespace: 'platform', image: 'kt/identity:2.0.0' }, status: 'healthy' },
  { id: 'k8s-orders', ID: 'k8s-orders', name: 'orders-service', Name: 'orders-service', type: 'k8s.deployment', Type: 'k8s.deployment', provider: 'kubernetes', Provider: 'kubernetes', region: 'us-east-1', properties: { replicas: 3, namespace: 'checkout', image: 'kt/orders:1.5.2' }, status: 'healthy' },
  { id: 'k8s-notifications', ID: 'k8s-notifications', name: 'notifications-service', Name: 'notifications-service', type: 'k8s.deployment', Type: 'k8s.deployment', provider: 'kubernetes', Provider: 'kubernetes', region: 'us-east-1', properties: { replicas: 2, namespace: 'platform', image: 'kt/notifications:1.1.0' }, status: 'healthy' },
  { id: 'k8s-search-api', ID: 'k8s-search-api', name: 'search-api', Name: 'search-api', type: 'k8s.deployment', Type: 'k8s.deployment', provider: 'kubernetes', Provider: 'kubernetes', region: 'us-east-1', properties: { replicas: 2, namespace: 'platform', image: 'kt/search:1.0.2' }, status: 'healthy' },
  { id: 'k8s-analytics-ingest', ID: 'k8s-analytics-ingest', name: 'analytics-ingest', Name: 'analytics-ingest', type: 'k8s.deployment', Type: 'k8s.deployment', provider: 'kubernetes', Provider: 'kubernetes', region: 'us-east-1', properties: { replicas: 1, namespace: 'data', image: 'kt/analytics:0.9.0' }, status: 'unhealthy' },
  { id: 'k8s-fraud-detector', ID: 'k8s-fraud-detector', name: 'fraud-detector', Name: 'fraud-detector', type: 'k8s.deployment', Type: 'k8s.deployment', provider: 'kubernetes', Provider: 'kubernetes', region: 'us-east-1', properties: { replicas: 2, namespace: 'checkout', image: 'kt/fraud:1.2.0' }, status: 'healthy' },
  { id: 'k8s-recommendations', ID: 'k8s-recommendations', name: 'recommendations', Name: 'recommendations', type: 'k8s.deployment', Type: 'k8s.deployment', provider: 'kubernetes', Provider: 'kubernetes', region: 'us-east-1', properties: { replicas: 2, namespace: 'catalog', image: 'kt/recommend:1.4.0' }, status: 'healthy' },

  // External SaaS
  { id: 'ext-stripe', ID: 'ext-stripe', name: 'stripe', Name: 'stripe', type: 'external.saas', Type: 'external.saas', provider: 'external', Provider: 'external', region: 'global', properties: { service: 'payment-processing', sla: '99.99%' }, status: 'healthy' },
  { id: 'ext-sendgrid', ID: 'ext-sendgrid', name: 'sendgrid', Name: 'sendgrid', type: 'external.saas', Type: 'external.saas', provider: 'external', Provider: 'external', region: 'global', properties: { service: 'email-delivery', sla: '99.95%' }, status: 'healthy' },
  { id: 'ext-shippo', ID: 'ext-shippo', name: 'shippo', Name: 'shippo', type: 'external.saas', Type: 'external.saas', provider: 'external', Provider: 'external', region: 'global', properties: { service: 'shipping-api', sla: '99.9%' }, status: 'healthy' },
  { id: 'ext-twilio', ID: 'ext-twilio', name: 'twilio', Name: 'twilio', type: 'external.saas', Type: 'external.saas', provider: 'external', Provider: 'external', region: 'global', properties: { service: 'sms-voice', sla: '99.95%' }, status: 'healthy' },
];

// ─── Edges ──────────────────────────────────────────────────────────────────────
export const EDGES = [
  { id: 'e1', source_id: 'k8s-web-gateway', target_id: 'k8s-identity', type: 'DEPENDS_ON', label: 'auth check' },
  { id: 'e2', source_id: 'k8s-web-gateway', target_id: 'k8s-checkout-api', type: 'ROUTES_TO', label: '/checkout/*' },
  { id: 'e3', source_id: 'k8s-web-gateway', target_id: 'k8s-catalog-api', type: 'ROUTES_TO', label: '/api/*' },
  { id: 'e4', source_id: 'k8s-web-gateway', target_id: 'k8s-search-api', type: 'ROUTES_TO', label: '/search' },
  { id: 'e5', source_id: 'k8s-web-gateway', target_id: 'k8s-recommendations', type: 'ROUTES_TO', label: '/recommend' },
  { id: 'e6', source_id: 'k8s-web-gateway', target_id: 'aws-elb-public', type: 'DEPENDS_ON', label: 'ingress' },
  { id: 'e7', source_id: 'k8s-checkout-api', target_id: 'k8s-payments', type: 'DEPENDS_ON', label: 'process payment' },
  { id: 'e8', source_id: 'k8s-checkout-api', target_id: 'k8s-orders', type: 'DEPENDS_ON', label: 'create order' },
  { id: 'e9', source_id: 'k8s-checkout-api', target_id: 'k8s-inventory', type: 'DEPENDS_ON', label: 'check stock' },
  { id: 'e10', source_id: 'k8s-checkout-api', target_id: 'k8s-fraud-detector', type: 'DEPENDS_ON', label: 'fraud check' },
  { id: 'e11', source_id: 'k8s-checkout-api', target_id: 'aws-elasticache-cart', type: 'READS_FROM', label: 'cart data' },
  { id: 'e12', source_id: 'k8s-payments', target_id: 'ext-stripe', type: 'DEPENDS_ON', label: 'payment gateway' },
  { id: 'e13', source_id: 'k8s-orders', target_id: 'aws-rds-orders', type: 'WRITES_TO', label: 'order db' },
  { id: 'e14', source_id: 'k8s-orders', target_id: 'aws-msk-events', type: 'PUBLISHES_TO', label: 'order.events' },
  { id: 'e15', source_id: 'k8s-catalog-api', target_id: 'aws-rds-catalog', type: 'WRITES_TO', label: 'catalog db' },
  { id: 'e16', source_id: 'k8s-catalog-api', target_id: 'aws-opensearch-catalog', type: 'WRITES_TO', label: 'search index' },
  { id: 'e17', source_id: 'k8s-catalog-api', target_id: 'aws-s3-assets', type: 'READS_FROM', label: 'product images' },
  { id: 'e18', source_id: 'k8s-inventory', target_id: 'aws-rds-catalog', type: 'READS_FROM', label: 'inventory db' },
  { id: 'e19', source_id: 'k8s-identity', target_id: 'aws-rds-identity', type: 'WRITES_TO', label: 'identity db' },
  { id: 'e20', source_id: 'k8s-identity', target_id: 'aws-elasticache-session', type: 'WRITES_TO', label: 'sessions' },
  { id: 'e21', source_id: 'k8s-notifications', target_id: 'ext-sendgrid', type: 'DEPENDS_ON', label: 'email' },
  { id: 'e22', source_id: 'k8s-notifications', target_id: 'ext-twilio', type: 'DEPENDS_ON', label: 'sms' },
  { id: 'e23', source_id: 'k8s-notifications', target_id: 'aws-msk-events', type: 'SUBSCRIBES_TO', label: 'notification.events' },
  { id: 'e24', source_id: 'k8s-search-api', target_id: 'aws-opensearch-catalog', type: 'READS_FROM', label: 'search' },
  { id: 'e25', source_id: 'k8s-analytics-ingest', target_id: 'aws-msk-events', type: 'SUBSCRIBES_TO', label: 'analytics events' },
  { id: 'e26', source_id: 'k8s-analytics-ingest', target_id: 'aws-s3-analytics', type: 'WRITES_TO', label: 'event archive' },
  { id: 'e27', source_id: 'k8s-recommendations', target_id: 'aws-opensearch-catalog', type: 'READS_FROM', label: 'product data' },
  { id: 'e28', source_id: 'k8s-fraud-detector', target_id: 'aws-elasticache-session', type: 'READS_FROM', label: 'session data' },
  { id: 'e29', source_id: 'k8s-orders', target_id: 'ext-shippo', type: 'DEPENDS_ON', label: 'shipping labels' },
  { id: 'e30', source_id: 'aws-eks-prod', target_id: 'k8s-web-gateway', type: 'CONTAINS' },
  { id: 'e31', source_id: 'aws-eks-prod', target_id: 'k8s-checkout-api', type: 'CONTAINS' },
  { id: 'e32', source_id: 'aws-eks-prod', target_id: 'k8s-payments', type: 'CONTAINS' },
  { id: 'e33', source_id: 'aws-eks-prod', target_id: 'k8s-catalog-api', type: 'CONTAINS' },
  { id: 'e34', source_id: 'aws-eks-prod', target_id: 'k8s-identity', type: 'CONTAINS' },
  { id: 'e35', source_id: 'aws-eks-prod', target_id: 'k8s-orders', type: 'CONTAINS' },
  { id: 'e36', source_id: 'k8s-checkout-api', target_id: 'k8s-notifications', type: 'DEPENDS_ON', label: 'order notifications' },
  { id: 'e37', source_id: 'k8s-catalog-api', target_id: 'k8s-recommendations', type: 'DEPENDS_ON', label: 'product feed' },
  { id: 'e38', source_id: 'k8s-web-gateway', target_id: 'k8s-notifications', type: 'DEPENDS_ON', label: 'notification prefs' },
];

// ─── Changes ────────────────────────────────────────────────────────────────────
export const CHANGES = [
  { id: 'ch-1', type: 'deployed', resourceType: 'k8s.deployment', resourceName: 'checkout-api', scope: 'k8s-prod', description: 'Rolled out checkout-api v2.1.0 with new payment flow', impact: 'low', timestamp: '2026-05-16T14:30:00Z', author: 'alice' },
  { id: 'ch-2', type: 'modified', resourceType: 'aws.rds.instance', resourceName: 'orders-postgres', scope: 'aws-prod-us-east-1', description: 'Increased storage to 500GB', impact: 'medium', timestamp: '2026-05-15T09:00:00Z', author: 'terraform' },
  { id: 'ch-3', type: 'created', resourceType: 'k8s.deployment', resourceName: 'fraud-detector', scope: 'k8s-prod', description: 'Added fraud detection service', impact: 'low', timestamp: '2026-05-14T16:45:00Z', author: 'bob' },
  { id: 'ch-4', type: 'modified', resourceType: 'aws.elasticache.cluster', resourceName: 'session-redis', scope: 'aws-prod-us-east-1', description: 'Scaled session-redis from 2 to 3 shards', impact: 'medium', timestamp: '2026-05-13T11:20:00Z', author: 'terraform' },
  { id: 'ch-5', type: 'deployed', resourceType: 'k8s.deployment', resourceName: 'web-gateway', scope: 'k8s-prod', description: 'Updated web-gateway to v3.2.1 with rate limiting', impact: 'high', timestamp: '2026-05-12T22:00:00Z', author: 'alice' },
  { id: 'ch-6', type: 'deleted', resourceType: 'k8s.deployment', resourceName: 'legacy-cart-service', scope: 'k8s-prod', description: 'Removed legacy cart service after migration', impact: 'low', timestamp: '2026-05-11T08:00:00Z', author: 'bob' },
  { id: 'ch-7', type: 'modified', resourceType: 'aws.s3.bucket', resourceName: 's3-analytics-events', scope: 'aws-prod-us-east-1', description: 'Updated lifecycle policy to 30d IA transition', impact: 'low', timestamp: '2026-05-10T14:00:00Z', author: 'terraform' },
  { id: 'ch-8', type: 'deployed', resourceType: 'k8s.deployment', resourceName: 'payments-service', scope: 'k8s-prod', description: 'Hotfix: fixed Stripe idempotency key handling', impact: 'high', timestamp: '2026-05-09T19:30:00Z', author: 'carol' },
  { id: 'ch-9', type: 'modified', resourceType: 'aws.msk.cluster', resourceName: 'kafka-events', scope: 'aws-prod-us-east-1', description: 'Increased kafka retention to 72h', impact: 'medium', timestamp: '2026-05-08T10:00:00Z', author: 'terraform' },
  { id: 'ch-10', type: 'created', resourceType: 'k8s.deployment', resourceName: 'search-api', scope: 'k8s-prod', description: 'New search-api service deployed', impact: 'low', timestamp: '2026-05-07T15:00:00Z', author: 'alice' },
  { id: 'ch-11', type: 'modified', resourceType: 'external.saas', resourceName: 'stripe', scope: 'external', description: 'Stripe API upgraded to v2026-05.us', impact: 'medium', timestamp: '2026-05-06T12:00:00Z', author: 'carol' },
  { id: 'ch-12', type: 'deployed', resourceType: 'k8s.deployment', resourceName: 'recommendations', scope: 'k8s-prod', description: 'Updated recommendation engine model v4', impact: 'low', timestamp: '2026-05-05T09:00:00Z', author: 'bob' },
];

// ─── Discovery Scopes ─────────────────────────────────────────────────────────
export const SCOPES = [
  { id: 'scope-aws', name: 'AWS Production', provider: 'aws', plugin_name: 'aws', region: 'us-east-1', enabled: true, schedule: '*/30 * * * *', last_run: '2026-05-17T06:00:00Z', last_run_status: 'completed', resourceCount: 23, status: 'active' },
  { id: 'scope-k8s', name: 'Kubernetes Production', provider: 'kubernetes', plugin_name: 'kubernetes', region: 'us-east-1', enabled: true, schedule: '*/15 * * * *', last_run: '2026-05-17T06:45:00Z', last_run_status: 'completed', resourceCount: 12, status: 'active' },
  { id: 'scope-gcp', name: 'GCP BigQuery', provider: 'gcp', plugin_name: 'gcp', region: 'us-central1', enabled: false, schedule: '0 */6 * * *', last_run: '2026-05-10T00:00:00Z', last_run_status: 'failed', resourceCount: 93, status: 'error' },
  { id: 'scope-github', name: 'GitHub Zerelio', provider: 'github', plugin_name: 'github', region: 'global', enabled: false, schedule: '0 0 * * *', last_run: null, last_run_status: null, resourceCount: 48, status: 'disabled' },
];

export const RUNS = [
  { id: 'run-1', scope_id: 'scope-aws', status: 'completed', started_at: '2026-05-17T06:00:00Z', completed_at: '2026-05-17T06:02:30Z', resources_found: 23, errors: [] },
  { id: 'run-2', scope_id: 'scope-k8s', status: 'completed', started_at: '2026-05-17T06:45:00Z', completed_at: '2026-05-17T06:47:15Z', resources_found: 12, errors: [] },
  { id: 'run-3', scope_id: 'scope-aws', status: 'completed', started_at: '2026-05-16T06:00:00Z', completed_at: '2026-05-16T06:02:10Z', resources_found: 23, errors: [] },
  { id: 'run-4', scope_id: 'scope-k8s', status: 'completed', started_at: '2026-05-16T06:30:00Z', completed_at: '2026-05-16T06:32:00Z', resources_found: 12, errors: [] },
  { id: 'run-5', scope_id: 'scope-gcp', status: 'failed', started_at: '2026-05-10T00:00:00Z', completed_at: '2026-05-10T00:01:00Z', resources_found: 0, errors: ['AccessDenied: insufficient permissions'] },
  { id: 'run-6', scope_id: 'scope-aws', status: 'completed', started_at: '2026-05-15T06:00:00Z', completed_at: '2026-05-15T06:03:00Z', resources_found: 22, errors: [] },
];

// ─── Docs ────────────────────────────────────────────────────────────────────────
export const DOCS_LIST = [
  { id: 'doc-web-gateway', path: '/docs/web-gateway', title: 'Web Gateway', target: 'web-gateway', source: 'generated', type: 'architecture', format: 'markdown', lastUpdated: '2026-05-14', summary: 'API gateway routing and rate limiting' },
  { id: 'doc-checkout-api', path: '/docs/checkout-api', title: 'Checkout API', target: 'checkout-api', source: 'generated', type: 'service', format: 'markdown', lastUpdated: '2026-05-14', summary: 'Order checkout and payment processing' },
  { id: 'doc-payments', path: '/docs/payments-service', title: 'Payments Service', target: 'payments-service', source: 'generated', type: 'service', format: 'markdown', lastUpdated: '2026-05-13', summary: 'Payment processing via Stripe' },
  { id: 'doc-catalog-api', path: '/docs/catalog-api', title: 'Catalog API', target: 'catalog-api', source: 'generated', type: 'service', format: 'markdown', lastUpdated: '2026-05-14', summary: 'Product catalog and search' },
  { id: 'doc-identity', path: '/docs/identity-service', title: 'Identity Service', target: 'identity-service', source: 'generated', type: 'service', format: 'markdown', lastUpdated: '2026-05-12', summary: 'Authentication and session management' },
  { id: 'doc-orders', path: '/docs/orders-service', title: 'Orders Service', target: 'orders-service', source: 'generated', type: 'service', format: 'markdown', lastUpdated: '2026-05-14', summary: 'Order management and lifecycle' },
  { id: 'doc-notifications', path: '/docs/notifications-service', title: 'Notifications Service', target: 'notifications-service', source: 'generated', type: 'service', format: 'markdown', lastUpdated: '2026-05-11', summary: 'Email and SMS notification delivery' },
  { id: 'doc-inventory', path: '/docs/inventory-service', title: 'Inventory Service', target: 'inventory-service', source: 'generated', type: 'service', format: 'markdown', lastUpdated: '2026-05-10', summary: 'Stock and inventory management' },
];

const DOC_PAGES: Record<string, { id: string; path: string; title: string; content: string; lastUpdated: string; source: string; type: string; format: string }> = {
  'doc-web-gateway': {
    id: 'doc-web-gateway', path: '/docs/web-gateway', title: 'Web Gateway', lastUpdated: '2026-05-14', source: 'generated', type: 'architecture', format: 'markdown',
    content: `# Web Gateway\n\nThe web-gateway is the main entry point for all external traffic.\n\n## Overview\n\n- **Namespace:** platform\n- **Replicas:** 4\n- **Image:** kt/gateway:3.2.1\n- **Language:** Go 1.23\n\n## Dependencies\n\n| Service | Type | Description |\n|---------|------|-------------|\n| identity-service | gRPC | Authentication & session validation |\n| checkout-api | HTTP | Checkout flow routing |\n| catalog-api | HTTP | Product catalog API |\n| notifications-service | HTTP | Preferences & notification management |\n\n## Endpoints\n\n| Path | Method | Service | Rate Limit |\n|------|--------|---------|------------|\n| /api/v1/auth/* | ALL | identity-service | 100/min |\n| /api/v1/checkout/* | ALL | checkout-api | 60/min |\n| /api/v1/catalog/* | ALL | catalog-api | 200/min |\n| /api/v1/search | GET | search-api | 100/min |\n\n## Network Topology\n\n\`\`\`\nInternet → Cloudflare → Public ALB → web-gateway (k8s)\n  ├── identity-service (gRPC)\n  ├── checkout-api (HTTP)\n  ├── catalog-api (HTTP)\n  ├── search-api (HTTP)\n  └── notifications-service (HTTP)\n\`\`\`\n\n## Runbook\n\n### High Latency\n1. Check gateway pod CPU/memory: \`kubectl top pod -n platform -l app=web-gateway\`\n2. Check if upstream service is slow: review tracing in Grafana\n3. Scale up: \`kubectl scale deployment/web-gateway -n platform --replicas=6\`\n4. Check ALB target group health in AWS console`,
  },
  'doc-checkout-api': {
    id: 'doc-checkout-api', path: '/docs/checkout-api', title: 'Checkout API', lastUpdated: '2026-05-14', source: 'generated', type: 'service', format: 'markdown',
    content: `# Checkout API\n\nHandles the entire checkout flow including cart management, fraud detection, and payment processing.\n\n## Dependencies\n\n| Resource | Type | Purpose |\n|----------|------|---------|\n| payments-service | HTTP | Payment processing |\n| orders-service | gRPC | Order creation |\n| inventory-service | gRPC | Stock verification |\n| fraud-detector | gRPC | Fraud analysis |\n| cart-redis | Redis | Cart data storage |\n\n## Runbook\n\n### Checkout Failures\n1. Check payments-service health\n2. Verify Stripe API key validity\n3. Check cart-redis connection pool\n4. Review checkout error logs: \`kubectl logs -n checkout -l app=checkout-api --tail=200\`\n5. Check fraud-detector response times`,
  },
  'doc-payments': {
    id: 'doc-payments', path: '/docs/payments-service', title: 'Payments Service', lastUpdated: '2026-05-13', source: 'generated', type: 'service', format: 'markdown',
    content: `# Payments Service\n\nProcesses payments through Stripe. Handles idempotency, retries, and webhook events.\n\n## Circuit Breaker\n\nThe payments service has a circuit breaker pattern for Stripe API calls:\n- **Closed:** Normal operation\n- **Open:** 50% failure rate → rejects immediately for 30s\n- **Half-Open:** Allows 3 test requests, then closes or opens\n\n## Runbook\n\n### Circuit Breaker Tripped\n1. Check Stripe status dashboard\n2. Verify API key has not rotated\n3. Check Stripe webhook delivery logs\n4. If Stripe healthy, reset breaker: restart payments-service pods\n5. Monitor recovery: \`kubectl logs -n checkout -l app=payments-service\``,
  },
  'doc-catalog-api': {
    id: 'doc-catalog-api', path: '/docs/catalog-api', title: 'Catalog API', lastUpdated: '2026-05-14', source: 'generated', type: 'service', format: 'markdown',
    content: `# Catalog API\n\nManages the product catalog including search indexing, image storage, and inventory.\n\n## Dependencies\n\n| Resource | Type | Purpose |\n|----------|------|---------|\n| catalog-postgres | PostgreSQL | Product data |\n| catalog-opensearch | OpenSearch | Search index |\n| s3-product-assets | S3 | Product images |\n| recommendations | gRPC | Product recommendations |\n\n## Runbook\n\n### Search Not Returning Results\n1. Check OpenSearch cluster health\n2. Verify catalog-postgres is accepting connections\n3. Check if reindex is stuck: \`kubectl logs -n catalog -l app=catalog-api\`\n4. Trigger manual reindex via admin API`,
  },
  'doc-identity': {
    id: 'doc-identity', path: '/docs/identity-service', title: 'Identity Service', lastUpdated: '2026-05-12', source: 'generated', type: 'service', format: 'markdown',
    content: `# Identity Service\n\nHandles authentication, authorization, and session management.\n\n## Tokens\n\n- Access tokens: 15-minute JWT expiry\n- Refresh tokens: 7-day rotation\n- Sessions stored in Redis (session-redis cluster)\n\n## Runbook\n\n### Login Failures\n1. Check identity-postgres connectivity\n2. Verify session-redis cluster status\n3. Check JWT signing key hasn't rotated\n4. Review auth logs: \`kubectl logs -n platform -l app=identity-service\``,
  },
  'doc-orders': {
    id: 'doc-orders', path: '/docs/orders-service', title: 'Orders Service', lastUpdated: '2026-05-14', source: 'generated', type: 'service', format: 'markdown',
    content: `# Orders Service\n\nManages the full order lifecycle: creation, fulfillment, shipping.\n\n## Dependencies\n\n| Resource | Purpose |\n|----------|---------|\n| orders-postgres | Order data persistence |\n| kafka-events | Order event publishing |\n| shippo | Shipping label generation |\n\n## Events Published\n\n- \`order.created\` — triggers fulfillment\n- \`order.shipped\` — triggers notifications\n- \`order.cancelled\` — triggers refund flow`,
  },
  'doc-notifications': {
    id: 'doc-notifications', path: '/docs/notifications-service', title: 'Notifications Service', lastUpdated: '2026-05-11', source: 'generated', type: 'service', format: 'markdown',
    content: `# Notifications Service\n\nDelivers email and SMS notifications to customers and internal teams.\n\n## Channels\n\n- **Email:** SendGrid (transactional, marketing)\n- **SMS:** Twilio (order updates, 2FA)\n- **In-app:** WebSocket to web-gateway\n\n## Event Subscriptions\n\n| Kafka Topic | Action |\n|-------------|--------|\n| order.confirmed | Send order confirmation email |\n| order.shipped | Send shipping notification SMS |\n| payment.failed | Send payment failure alert |\n| user.signup | Send welcome email |`,
  },
  'doc-inventory': {
    id: 'doc-inventory', path: '/docs/inventory-service', title: 'Inventory Service', lastUpdated: '2026-05-10', source: 'generated', type: 'service', format: 'markdown',
    content: `# Inventory Service\n\nManages stock levels, warehouse inventory, and supply chain data.\n\n## Runbook\n\n### Stock Levels Not Updating\n1. Check catalog-postgres connectivity\n2. Verify kafka-events consumer group is not lagging\n3. Check inventory-service pod health: \`kubectl get pods -n catalog -l app=inventory-service\`\n4. Restart if stuck: \`kubectl rollout restart deployment/inventory-service -n catalog\``,
  },
};

export function getDocPage(id: string) {
  const doc = DOC_PAGES[id];
  if (doc) return doc;
  // Fallback: search by path or title match
  for (const d of Object.values(DOC_PAGES)) {
    if (d.path === id || d.title.toLowerCase().replace(/\s+/g, '-') === id) return d;
  }
  return DOC_PAGES['doc-web-gateway'];
}

// ─── Runbooks ───────────────────────────────────────────────────────────────────
export const RUNBOOKS = [
  {
    id: 'rb-1', title: 'payments-service', service_name: 'Payments Service', resource_ids: ['k8s-payments'], template: 'standard',
    content: `# Runbook: Payments Service\n\n## Overview\n\nPayment processing service handling Stripe integration and payment orchestration.\n\n## Health Checks\n\n- \`GET /health\` — service health\n- \`GET /metrics\` — Prometheus metrics at :9090\n\n## Common Issues\n\n### Issue: Payment Failures\n1. Check Stripe dashboard for ongoing incidents\n2. Verify \`STRIPE_API_KEY\` secret hasn't rotated\n3. Review error rate in Grafana: \`rate(payment_errors_total[5m])\`\n4. Check pod logs for 500 errors\n5. Restart pods if needed: \`kubectl rollout restart deployment/payments-service -n checkout\`\n\n### Issue: High Latency\n1. Check database connection pool\n2. Review P99 latency in Grafana\n3. Scale up: \`kubectl scale deployment/payments-service -n checkout --replicas=5\`\n\n## Dependencies\n\n- **Stripe API** — External, check status.stripe.com\n- **Identity Service** — For token validation\n- **orders-postgres** — Order data persistence`,
  },
  {
    id: 'rb-2', title: 'orders-postgres', service_name: 'Orders Database', resource_ids: ['aws-rds-orders'], template: 'standard',
    content: `# Runbook: Orders Database\n\n## Overview\n\nPostgreSQL RDS instance for order data. db.r6g.xlarge, 500GB storage.\n\n## Monitoring\n\n- CPU: < 80% (CloudWatch alarm at 90%)\n- Connections: < 500 (max_connections = 1000)\n- Replica lag: < 100ms\n\n## Common Issues\n\n### Issue: High CPU\n1. Check running queries: \`SELECT * FROM pg_stat_activity WHERE state = 'active'\`\n2. Identify slow queries from pg_stat_statements\n3. Check if vacuum is running\n4. Consider scaling up instance class\n\n### Issue: Disk Space\n1. Check disk usage in CloudWatch\n2. Run \`VACUUM FULL\` on large tables if needed\n3. Archive old order data (>90 days)\n4. Request storage increase via Terraform`,
  },
  {
    id: 'rb-3', title: 'web-gateway', service_name: 'Web Gateway', resource_ids: ['k8s-web-gateway'], template: 'standard',
    content: `# Runbook: Web Gateway\n\n## Overview\n\nAPI gateway handling all external traffic, rate limiting, and routing.\n\n## Rate Limits\n\n| Endpoint | Limit |\n|----------|-------|\n| /api/v1/auth/* | 100/min |\n| /api/v1/checkout/* | 60/min |\n| /api/v1/catalog/* | 200/min |\n\n## Common Issues\n\n### Issue: Latency Spike on /checkout\n1. Check upstream checkout-api latency in Grafana\n2. Check for pod restarts: \`kubectl get pods -n checkout\`\n3. Review nginx access logs for 5xx patterns\n4. Check rate limit counters\n5. Scale checkout-api if needed`,
  },
];

// ─── LLM Profiles ───────────────────────────────────────────────────────────────
export const PROFILES = [
  { name: 'primary', provider: 'anthropic', model: 'claude-sonnet-4-6', base_url: 'https://api.anthropic.com', api_key: 'sk-ant-***demo***', is_default: true },
  { name: 'cheap', provider: 'openai', model: 'gpt-4o-mini', base_url: 'https://api.openai.com', api_key: 'sk-***demo***', is_default: false },
];

// License fixture removed — Zerelio is FOSS, no license gate

// ─── Config ─────────────────────────────────────────────────────────────────────
export const CONFIG = { features: { graph_grouped: true, tree_view: true, blast_radius: true, architecture_diagrams: true }, llm: { default_profile: 'primary' } };

// ─── Users ──────────────────────────────────────────────────────────────────────
export const USERS = [
  { id: 'u-1', email: 'admin@zerelio.local', role: 'admin', created_at: '2025-01-01T00:00:00Z' },
  { id: 'u-2', email: 'editor@zerelio.local', role: 'editor', created_at: '2025-01-15T00:00:00Z' },
  { id: 'u-3', email: 'viewer@zerelio.local', role: 'viewer', created_at: '2025-02-01T00:00:00Z' },
];

// ─── Terraform Drift ────────────────────────────────────────────────────────────
export const TERRAFORM_DRIFT = {
  missing: [
    { resource_id: 'aws-rds-orders', resource_name: 'orders-postgres', resource_type: 'aws.rds.instance', description: 'RDS instance size drifted: expected db.r6g.xlarge, found db.r6g.2xlarge' },
    { resource_id: 'aws-s3-assets', resource_name: 's3-product-assets', resource_type: 'aws.s3.bucket', description: 'Bucket versioning disabled in state but enabled in config' },
  ],
  unmanaged: [
    { resource_id: 'aws-ec2-bastion', resource_name: 'bastion-host', resource_type: 'aws.ec2.instance', description: 'EC2 instance exists in AWS but is not tracked in Terraform state' },
  ],
  resources_with_drift: [
    { resource_id: 'aws-rds-orders', resource_name: 'orders-postgres', resource_type: 'aws.rds.instance', drift_type: 'missing', description: 'RDS instance size drifted: expected db.r6g.xlarge, found db.r6g.2xlarge' },
    { resource_id: 'aws-s3-assets', resource_name: 's3-product-assets', resource_type: 'aws.s3.bucket', drift_type: 'missing', description: 'Bucket versioning disabled in state but enabled in config' },
    { resource_id: 'aws-ec2-bastion', resource_name: 'bastion-host', resource_type: 'aws.ec2.instance', drift_type: 'unmanaged', description: 'EC2 instance exists in AWS but is not tracked in Terraform state' },
  ],
};

// ─── Mermaid Diagram ──────────────────────────────────────────────────────────
export const MERMAID_DIAGRAM = `flowchart TD
  subgraph platform["☁️ Platform"]
    web-gateway["web-gateway"]
    identity-service["identity-service"]
    notifications-service["notifications-service"]
    search-api["search-api"]
  end
  subgraph checkout["🛒 Checkout"]
    checkout-api["checkout-api"]
    payments-service["payments-service"]
    orders-service["orders-service"]
    fraud-detector["fraud-detector"]
  end
  subgraph catalog["📦 Catalog"]
    catalog-api["catalog-api"]
    inventory-service["inventory-service"]
    recommendations["recommendations"]
  end
  subgraph data["📊 Data"]
    analytics-ingest["analytics-ingest"]
  end
  subgraph aws-storage["🗄️ AWS Storage"]
    orders-postgres["orders-postgres"]
    catalog-postgres["catalog-postgres"]
    identity-postgres["identity-postgres"]
    catalog-opensearch["catalog-opensearch"]
    session-redis["session-redis"]
    cart-redis["cart-redis"]
  end
  subgraph aws-infra["🔧 AWS Infrastructure"]
    kafka-events["kafka-events"]
    s3-product-assets["s3-product-assets"]
    s3-analytics-events["s3-analytics-events"]
    public-alb["public-alb"]
  end
  subgraph external["🌐 External"]
    stripe["stripe"]
    sendgrid["sendgrid"]
    shippo["shippo"]
    twilio["twilio"]
  end
  public-alb --> web-gateway
  web-gateway --> identity-service
  web-gateway --> checkout-api
  web-gateway --> catalog-api
  web-gateway --> search-api
  checkout-api --> payments-service
  checkout-api --> orders-service
  checkout-api --> inventory-service
  checkout-api --> fraud-detector
  catalog-api --> recommendations
  payments-service --> stripe
  orders-service --> orders-postgres
  orders-service --> kafka-events
  catalog-api --> catalog-postgres
  catalog-api --> catalog-opensearch
  catalog-api --> s3-product-assets
  inventory-service --> catalog-postgres
  identity-service --> identity-postgres
  identity-service --> session-redis
  notifications-service --> sendgrid
  notifications-service --> twilio
  notifications-service --> kafka-events
  search-api --> catalog-opensearch
  analytics-ingest --> kafka-events
  analytics-ingest --> s3-analytics-events
  fraud-detector --> session-redis
  orders-service --> shippo`;

// ─── QA Responses ────────────────────────────────────────────────────────────────
const QA_ANSWERS: Record<string, string> = {
  payment: 'The payment flow goes: **checkout-api** → **payments-service** → **Stripe**. The payments-service uses a circuit breaker pattern — if Stripe errors exceed 50%, it opens for 30 seconds. Current status: degraded (payments-service has elevated error rates).',
  deploy: 'Recent deployments:\n- `web-gateway` v3.2.1 — rate limiting added\n- `checkout-api` v2.1.0 — new payment flow\n- `payments-service` hotfix — Stripe idempotency\n- `recommendations` — model v4\n\nAll managed through ArgoCD with canary deployments.',
  database: 'We have 3 PostgreSQL instances:\n- **orders-postgres** (db.r6g.xlarge, 500GB) — orders-service\n- **catalog-postgres** (db.r6g.large, 200GB) — catalog-api\n- **identity-postgres** (db.t3.medium, 100GB) — identity-service\n\nPlus session-redis, cart-redis (ElastiCache), and catalog-opensearch.',
  error: 'Current errors:\n1. **analytics-ingest** — unhealthy, possible Kafka consumer lag\n2. **kafka-events** — degraded (42 topics, retention at 72h)\n3. **payments-service** — elevated 5xx to Stripe\n\nCheck #incidents Slack channel for ongoing investigations.',
  help: 'I can help you understand:\n- **Architecture**: service dependencies, data flows\n- **Runbooks**: operational procedures per service\n- **Changes**: recent deployments and modifications\n- **Status**: current health of all resources\n\nTry asking about a specific service or issue.',
};

export function getQAAnswer(question: string): string {
  const q = question.toLowerCase();
  for (const [key, answer] of Object.entries(QA_ANSWERS)) {
    if (q.includes(key)) return answer;
  }
  return QA_ANSWERS.help;
}

// ─── Blast Radius helper ────────────────────────────────────────────────────────
export function computeBlast(nodeId: string): string[] {
  const visited = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const edge of EDGES) {
      if (edge.source_id === current && !visited.has(edge.target_id)) queue.push(edge.target_id);
      if (edge.target_id === current && !visited.has(edge.source_id)) queue.push(edge.source_id);
    }
  }
  return Array.from(visited).filter(id => id !== nodeId);
}
