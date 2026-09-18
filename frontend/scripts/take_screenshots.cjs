const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACT_DIR = 'C:\\Users\\hp\\.gemini\\antigravity\\brain\\dcf973e8-53e0-4af4-bde1-359fab0f5489';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function capture() {
  console.log('Launching Edge headless...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  
  // 1. Landing Page
  console.log('Capturing Page 1: Landing Hero...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await sleep(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'page1_landing_hero.png') });

  // 2. Features / Market Problem
  console.log('Capturing Page 2: Features Section...');
  await page.evaluate(() => window.scrollBy(0, 650));
  await sleep(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'page2_features_grid.png') });

  // 3. Security / Architecture Section
  console.log('Capturing Page 3: Security Architecture...');
  await page.evaluate(() => window.scrollBy(0, 850));
  await sleep(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'page3_security_overview.png') });

  // 4. Login Page
  console.log('Capturing Page 4: Login...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await sleep(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'page4_login_screen.png') });

  // Authenticate as Admin (CFO)
  console.log('Logging in as Admin (CFO)...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const adminBtn = buttons.find(b => b.textContent.includes('Admin (CFO)'));
    if (adminBtn) adminBtn.click();
  });
  await sleep(600);
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const submitBtn = buttons.find(b => b.textContent.includes('Sign In to RicozBooks'));
    if (submitBtn) submitBtn.click();
  });
  await sleep(2500);

  // 5. Dashboard
  console.log('Capturing Page 5: Executive Dashboard...');
  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle0' });
  await sleep(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'page5_dashboard_metrics.png') });

  // 6. Chart of Accounts
  console.log('Capturing Page 6: Chart of Accounts...');
  await page.goto('http://localhost:5173/chart-of-accounts', { waitUntil: 'networkidle0' });
  await sleep(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'page6_chart_of_accounts.png') });

  // 7. Journal Entries
  console.log('Capturing Page 7: Journal Entries...');
  await page.goto('http://localhost:5173/journals', { waitUntil: 'networkidle0' });
  await sleep(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'page7_journal_entries.png') });

  // 8. New Journal Modal
  console.log('Capturing Page 8: New Journal Entry Strict Double-Entry Modal...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const newBtn = buttons.find(b => b.textContent.includes('New Journal Entry'));
    if (newBtn) newBtn.click();
  });
  await sleep(1200);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'page8_new_journal_modal.png') });

  // 9. Approvals Queue
  console.log('Capturing Page 9: Supervisory Approvals...');
  await page.goto('http://localhost:5173/approvals', { waitUntil: 'networkidle0' });
  await sleep(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'page9_approval_queue.png') });

  // 10. General Ledger
  console.log('Capturing Page 10: General Ledger...');
  await page.goto('http://localhost:5173/ledger', { waitUntil: 'networkidle0' });
  await sleep(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'page10_general_ledger.png') });

  // 11. Financial Reports (Trial Balance / P&L)
  console.log('Capturing Page 11: Financial Reports...');
  await page.goto('http://localhost:5173/reports', { waitUntil: 'networkidle0' });
  await sleep(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'page11_financial_reports.png') });

  // 12. Entities Management
  console.log('Capturing Page 12: Multi-Entity Setup...');
  await page.goto('http://localhost:5173/entities', { waitUntil: 'networkidle0' });
  await sleep(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'page12_multi_entity_setup.png') });

  console.log('ALL_CAPTURED_SUCCESSFULLY');
  await browser.close();
}

capture().catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});

