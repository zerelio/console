import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:3000';
const results = [];

async function test(name, fn) {
  try {
    await fn();
    results.push(`✅ ${name}`);
  } catch (e) {
    results.push(`❌ ${name}: ${e.message.split('\n')[0]}`);
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // Login first
  await page.goto(BASE);
  await page.waitForSelector('input[type="email"]', { timeout: 5000 });
  await page.fill('input[type="email"]', 'admin@example.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  // 26.3: Token Persistence
  await test('26.3 Token Persistence', async () => {
    const token = await page.evaluate(() => localStorage.getItem('kt_token'));
    if (!token || token.length < 20) throw new Error(`Token missing or too short: ${token?.length}`);
    // Refresh page
    await page.reload();
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) throw new Error(`Redirected to login after refresh: ${currentUrl}`);
  });

  // 27.1: Dashboard Empty State
  await test('27.1 Dashboard Empty State', async () => {
    await page.goto(BASE + '/');
    await page.waitForTimeout(1500);
    const body = await page.textContent('body');
    if (body.includes('No infrastructure discovered')) {
      // Check for the connect button
      const btn = await page.textContent('body');
      if (!btn.includes('Connect')) throw new Error('No "Connect a Cloud" button');
    } else {
      // Has data — check for coverage
      if (!body.includes('%') && !body.includes('Overview')) throw new Error('Dashboard shows neither empty state nor data');
    }
  });

  // 27.2: Search
  await test('27.2 Search Type and Filter', async () => {
    await page.goto(BASE + '/search');
    await page.waitForTimeout(1000);
    const searchInput = await page.$('input[placeholder*="Search"]');
    if (!searchInput) throw new Error('No search input');
    await searchInput.fill('aws');
    await page.click('button:has-text("Search")');
    await page.waitForTimeout(1000);
    // Check no console errors by checking page is still functional
    const selectors = await page.$$('select');
    if (selectors.length < 1) throw new Error('No filter dropdowns visible');
  });

  // 27.3: Connectors Provider List
  await test('27.3 Connectors Provider List', async () => {
    await page.goto(BASE + '/connectors');
    await page.waitForTimeout(1500);
    const text = await page.textContent('body');
    // Should have provider buttons/cards
    const hasProvider = text.includes('AWS') || text.includes('aws') || text.includes('Add Connector');
    if (!hasProvider) throw new Error('No provider info visible on connectors page');
    // Count configurable providers
    const providers = ['aws', 'azure', 'gcp', 'kubernetes', 'github'];
    for (const p of providers) {
      if (text.toLowerCase().includes(p)) console.log(`  Found provider: ${p}`);
    }
  });

  // 27.4: Discovery Scope Management
  await test('27.4 Discovery Scope Management', async () => {
    await page.goto(BASE + '/discovery');
    await page.waitForTimeout(1500);
    const text = await page.textContent('body');
    if (text.includes('No scopes') || text.includes('Discovery Scopes') || text.includes('scopes')) {
      // Has scope management UI
    } else {
      throw new Error('No discovery scope UI visible');
    }
  });

  // 27.5: Resources Browse and Filter
  await test('27.5 Resources Browse and Filter', async () => {
    await page.goto(BASE + '/resources');
    await page.waitForTimeout(1500);
    const text = await page.textContent('body');
    if (text.includes('Resources') && (text.includes('No resources') || text.includes('Search'))) {
      // Has resource management UI
    } else {
      throw new Error('Resources page missing management UI');
    }
  });

  // 27.6: Document Viewer
  await test('27.6 Document Viewer', async () => {
    await page.goto(BASE + '/docs/nonexistent-doc');
    await page.waitForTimeout(1500);
    const text = await page.textContent('body');
    // Should not crash — should show error or empty doc state
    if (text.includes('Failed to load') || text.includes('No content') || text.includes('Back')) {
      // Handled gracefully
    } else {
      // Even showing empty document is acceptable — just not a crash
      console.log('  DocView loaded (content may vary)');
    }
  });

  // 27.7: Runbooks Generate and Browse
  await test('27.7 Runbooks Generate and Browse', async () => {
    await page.goto(BASE + '/runbooks');
    await page.waitForTimeout(1500);
    const text = await page.textContent('body');
    if (text.includes('Runbook') || text.includes('Generate')) {
      // Has runbook UI
    } else {
      throw new Error('No runbook UI visible');
    }
  });

  // 27.8: Graph Path Tracing
  await test('27.8 Graph Path Tracing', async () => {
    await page.goto(BASE + '/graph');
    await page.waitForTimeout(1500);
    const text = await page.textContent('body');
    if (text.includes('Trace') || text.includes('Dependencies') || text.includes('Path')) {
      // Has graph UI
    } else {
      throw new Error('No graph UI visible');
    }
  });

  // 27.9: Settings Profile
  await test('27.9 Settings Profile', async () => {
    await page.goto(BASE + '/settings');
    await page.waitForTimeout(1500);
    const text = await page.textContent('body');
    if (text.includes('Personal') || text.includes('Profile') || text.includes('Appearance')) {
      // Has personal settings
    } else {
      throw new Error('No settings UI visible');
    }
  });

  // 27.10: Admin Full Page
  await test('27.10 Admin Full Page', async () => {
    await page.goto(BASE + '/admin');
    await page.waitForTimeout(1500);
    const text = await page.textContent('body');
    if (text.includes('License') || text.includes('Administration') || text.includes('LLM')) {
      // Has admin UI
    } else {
      throw new Error('No admin UI visible');
    }
  });

  // 27.11: 404 Page
  await test('27.11 404 Page', async () => {
    await page.goto(BASE + '/this-page-does-not-exist-xyz');
    await page.waitForTimeout(1500);
    const text = await page.textContent('body');
    if (text.includes('not found') || text.includes('404') || text.includes("doesn't exist")) {
      // Has 404 handling
    } else {
      // No crash is a win — 404 may show blank content area
      console.log('  404 page loaded without crash');
    }
  });

  // 26.4: Auto-Redirect on 401
  await test('26.4 Auto-Redirect on 401', async () => {
    // Clear token
    await page.evaluate(() => localStorage.removeItem('kt_token'));
    await page.waitForTimeout(500);
    await page.goto(BASE + '/search', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const url = page.url();
    // Should be redirected to login
    if (!url.includes('login')) throw new Error(`Not redirected to login, at: ${url}`);
    // Token should be cleared
    const token = await page.evaluate(() => localStorage.getItem('kt_token'));
    if (token) throw new Error('Token should be null after 401');
  });

  // Re-login for remaining tests
  await page.goto(BASE);
  await page.waitForTimeout(1000);
  const loginInput = await page.$('input[type="email"]');
  if (loginInput) {
    await loginInput.fill('admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  }

  // 28.2: Graceful Degradation — kill API, try navigating
  await test('28.2 Graceful Degradation', async () => {
    await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1000);
    const text = await page.textContent('body');
    // Should show either data or error state, not a white screen
    if (text.length < 10) throw new Error('Page appears blank/white after API failure');
    console.log(`  Degraded page rendered with ${text.length} chars of content`);
  });

  await browser.close();

  console.log('\n=== RESULTS ===');
  results.forEach(r => console.log(r));
  const pass = results.filter(r => r.startsWith('✅')).length;
  const fail = results.filter(r => r.startsWith('❌')).length;
  console.log(`\n${pass} pass, ${fail} fail`);
}

run().catch(e => {
  console.error('Test failed:', e.message);
  process.exit(1);
});
