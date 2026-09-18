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

  // Navigate to Close Manager
  console.log('Navigating to Close Manager...');
  await page.goto('http://localhost:5173/close-manager', { waitUntil: 'networkidle0' });
  await sleep(2000);
  const outPath = path.join(ARTIFACT_DIR, 'page_close_manager.png');
  await page.screenshot({ path: outPath });
  console.log(`Saved screenshot to ${outPath}`);

  await browser.close();
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});

