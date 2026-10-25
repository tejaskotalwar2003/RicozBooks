/**
 * scripts/staging-smoke-test.js
 * RicozBooks Phase 7: Staging Automated Smoke Testing Suite
 * Validates deployed staging services on Render (API + Next.js Web)
 * Usage:
 *   node scripts/staging-smoke-test.js
 * Environment variables:
 *   STAGING_API_URL  - Staging API base (default: https://ricozbooks-api-staging.onrender.com/api/v1)
 *   STAGING_WEB_URL  - Staging Web base (default: https://ricozbooks-web-staging.onrender.com)
 *   SUPERADMIN_EMAIL - Staging super admin email (default: admin@ricoz.in)
 *   SUPERADMIN_PASSWORD - Staging super admin password
 */

const API_BASE = (process.env.STAGING_API_URL || 'https://ricozbooks-api-staging.onrender.com/api/v1').replace(/\/$/, '');
const WEB_BASE = (process.env.STAGING_WEB_URL || 'https://ricozbooks-web-staging.onrender.com').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'admin@ricoz.in';
const ADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD;

const testResults = [];

function recordTest(domain, scenario, passed, details = '', durationMs = 0) {
  testResults.push({ domain, scenario, passed, details, durationMs });
  const icon = passed ? '\x1b[32m✔ PASS\x1b[0m' : '\x1b[31m✘ FAIL\x1b[0m';
  console.log(`  ${icon} [${domain}] ${scenario} (${durationMs}ms)${details ? ' - ' + details : ''}`);
}

async function runStep(domain, scenario, testFn) {
  const start = Date.now();
  try {
    const details = await testFn();
    const duration = Date.now() - start;
    recordTest(domain, scenario, true, details || '', duration);
  } catch (err) {
    const duration = Date.now() - start;
    recordTest(domain, scenario, false, err.message, duration);
  }
}

async function main() {
  console.log('===========================================================');
  console.log('🚀 RicozBooks Phase 7: Staging Environment Smoke Test Suite');
  console.log(`   - Staging API: ${API_BASE}`);
  console.log(`   - Staging Web: ${WEB_BASE}`);
  console.log(`   - Admin Email: ${ADMIN_EMAIL}`);
  console.log('===========================================================\n');

  let adminToken = '';
  let entityId = '';
  let cashAccountId = '';
  let revAccountId = '';

  // 1. Health & Infrastructure
  console.log('--- 1. Infrastructure Health & Connectivity ---');
  await runStep('Health', 'Staging API health probe & DB connectivity', async () => {
    const res = await fetch(`${API_BASE}/health`);
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== 'online') throw new Error(`Unexpected status: ${data.status}`);
    return `Version: ${data.version}, Database: ${data.database}`;
  });

  await runStep('Health', 'Staging Next.js Web Frontend SSR/Static Probe', async () => {
    const res = await fetch(WEB_BASE);
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    if (!html.includes('RicozBooks')) throw new Error('Missing RicozBooks in page title/content');
    return 'Web frontend responding with 200 OK and expected HTML structure';
  });

  // 2. Authentication & Developer Console
  console.log('\n--- 2. Authentication & Developer Console ---');
  if (!ADMIN_PASSWORD) {
    console.log('  ⚠️  SUPERADMIN_PASSWORD not set. Skipping authenticated developer tests.');
    recordTest('Auth', 'Super Admin Login', false, 'SUPERADMIN_PASSWORD required. Inspect Render Environment variables.');
  } else {
    await runStep('Auth', 'Super Admin Login', async () => {
      const res = await fetch(`${API_BASE}/developer/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
      });
      if (res.status !== 200) {
        const body = await res.text();
        throw new Error(`Login failed with HTTP ${res.status}: ${body}`);
      }
      const data = await res.json();
      adminToken = data.token || data.access_token;
      if (!adminToken) throw new Error('No JWT token received in response');
      return 'Authenticated successfully, JWT token issued';
    });

    if (adminToken) {
      await runStep('Developer', 'Canonical Departments Verification', async () => {
        const res = await fetch(`${API_BASE}/developer/departments`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
        const depts = await res.json();
        if (!Array.isArray(depts) || depts.length < 5) throw new Error(`Expected >= 5 departments, got ${depts?.length}`);
        return `5 canonical departments confirmed: ${depts.map((d) => d.code).join(', ')}`;
      });

      await runStep('Developer', 'Granular Permissions Catalog', async () => {
        const res = await fetch(`${API_BASE}/developer/permissions`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
        const perms = await res.json();
        if (!Array.isArray(perms) || perms.length < 47) throw new Error(`Expected >= 47 granular permissions`);
        return `${perms.length} granular permissions confirmed`;
      });
    }
  }

  // 3. Chart of Accounts & General Ledger
  console.log('\n--- 3. Chart of Accounts & General Ledger ---');
  if (adminToken) {
    await runStep('Entities', 'Fetch Operating Entities', async () => {
      const res = await fetch(`${API_BASE}/entities`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      const entities = await res.json();
      if (!Array.isArray(entities) || entities.length === 0) throw new Error('No operating entities found');
      entityId = entities[0]._id || entities[0].id;
      return `Entity ID: ${entityId} (${entities[0].name})`;
    });

    if (entityId) {
      await runStep('Accounts', 'Verify GAAP Standard Accounts', async () => {
        const res = await fetch(`${API_BASE}/accounts?entity_id=${entityId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
        const accounts = await res.json();
        const codes = accounts.map((a) => a.code);
        const required = ['1000', '1100', '1200', '2000', '4000', '5700'];
        const missing = required.filter((c) => !codes.includes(c));
        if (missing.length > 0) throw new Error(`Missing codes: ${missing.join(', ')}`);

        cashAccountId = accounts.find((a) => a.code === '1000')?._id;
        revAccountId = accounts.find((a) => a.code === '4000')?._id;
        return `${accounts.length} standard accounts confirmed including COGS 5700`;
      });

      await runStep('GL', 'Negative: Reject Imbalanced Journal Entry', async () => {
        const res = await fetch(`${API_BASE}/journals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            entity_id: entityId,
            date: new Date().toISOString().split('T')[0],
            narration: 'Staging imbalance test',
            lines: [
              { account_id: cashAccountId, debit: 5000, credit: 0 },
              { account_id: revAccountId, debit: 0, credit: 4900 },
            ],
          }),
        });
        if (res.status === 400) return 'Correctly rejected imbalanced entry with HTTP 400';
        throw new Error(`Expected 400, received ${res.status}`);
      });
    }
  }

  // 4. Financial Reports & Mathematical Equations
  console.log('\n--- 4. Financial Reports & Balance Verification ---');
  if (adminToken && entityId) {
    await runStep('Reports', 'Trial Balance: Debits == Credits', async () => {
      const res = await fetch(`${API_BASE}/reports/trial-balance?entity_id=${entityId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      const report = await res.json();
      const diff = Math.abs((report.total_debit || 0) - (report.total_credit || 0));
      if (diff > 0.01) throw new Error(`Imbalance: Debits ₹${report.total_debit} != Credits ₹${report.total_credit}`);
      return `Balanced: Total Debits (₹${report.total_debit}) == Total Credits (₹${report.total_credit})`;
    });

    await runStep('Reports', 'Balance Sheet Accounting Equation (Assets = Liabilities + Equity)', async () => {
      const res = await fetch(`${API_BASE}/reports/balance-sheet?entity_id=${entityId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      const bs = await res.json();
      const assets = bs.total_assets || 0;
      const liabilities = bs.total_liabilities || 0;
      const equity = bs.total_equity || 0;
      const diff = Math.abs(assets - (liabilities + equity));
      if (diff > 0.01) throw new Error(`Equation violated: Assets ${assets} != Liab ${liabilities} + Eq ${equity}`);
      return `Balanced: Assets (₹${assets}) == Liabilities (₹${liabilities}) + Equity (₹${equity})`;
    });
  }

  // 5. Negative Security & Boundary Protection
  console.log('\n--- 5. Security & Boundary Protection ---');
  await runStep('Security', 'Negative: Reject Tampered JWT with HTTP 401', async () => {
    const res = await fetch(`${API_BASE}/journals`, {
      headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.token' },
    });
    if (res.status === 401) return 'Rejected tampered token with HTTP 401 Unauthorized';
    throw new Error(`Expected 401, got ${res.status}`);
  });

  // Summary
  console.log('\n===========================================================');
  const passedCount = testResults.filter((r) => r.passed).length;
  const totalCount = testResults.length;
  console.log(`Staging Smoke Test Run Complete: ${passedCount}/${totalCount} passed (${Math.round((passedCount / (totalCount || 1)) * 100)}%)`);
  console.log('===========================================================');

  if (passedCount < totalCount) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\nFatal smoke test execution error:', err);
  process.exit(1);
});
