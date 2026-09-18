const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACT_DIR = 'C:\\Users\\hp\\.gemini\\antigravity\\brain\\dcf973e8-53e0-4af4-bde1-359fab0f5489';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function capture() {
  console.log('Launching Edge...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  
  // Login
  console.log('Logging in as Admin (CFO)...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await sleep(1000);
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const adminBtn = buttons.find(b => b.textContent.includes('Admin (CFO)'));
    if (adminBtn) adminBtn.click();
  });
  await sleep(500);
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const submitBtn = buttons.find(b => b.textContent.includes('Sign In to RicozBooks'));
    if (submitBtn) submitBtn.click();
  });
  await sleep(2500);

  // Navigate to Settings
  console.log('Navigating to Settings...');
  await page.goto('http://localhost:5173/settings', { waitUntil: 'networkidle0' });
  await sleep(2000);
  
  // 1. Capture FX Rates tab
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'page_settings_fx.png') });
  console.log('Saved page_settings_fx.png');

  // 2. Click Fiscal Calendar tab
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const calTab = tabs.find(b => b.textContent.includes('Fiscal Calendar'));
    if (calTab) calTab.click();
  });
  await sleep(1500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'page_settings_calendar.png') });
  console.log('Saved page_settings_calendar.png');

  // 3. Click RBAC tab
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const rbacTab = tabs.find(b => b.textContent.includes('Role-Based Access'));
    if (rbacTab) rbacTab.click();
  });
  await sleep(1500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'page_settings_rbac.png') });
  console.log('Saved page_settings_rbac.png');

  // 4. Click Entity Tax tab
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const taxTab = tabs.find(b => b.textContent.includes('Entity Tax & Statutory'));
    if (taxTab) taxTab.click();
  });
  await sleep(1500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'page_settings_tax.png') });
  console.log('Saved page_settings_tax.png');

  await browser.close();
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});

