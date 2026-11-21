export const DEMO_USER = { user_id: 'u-demo-001', email: 'demo@knowledgetree.example', roles: ['admin', 'editor', 'viewer'] };

const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
const payload = btoa(JSON.stringify(DEMO_USER));
const signature = btoa('demo-signature');

export const DEMO_TOKEN = `${header}.${payload}.${signature}`;
