const puppeteer = require('puppeteer-core');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACT_DIR = 'C:\\Users\\hp\\.gemini\\antigravity\\brain\\dcf973e8-53e0-4af4-bde1-359fab0f5489';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  try {
    const page = await browser.newPage();

    // 1. Capture Login Screen
    console.log('Capturing Login page...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await sleep(800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'page4_login_screen.png') });
    console.log('Saved page4_login_screen.png');

    // 2. Click 1-Click Admin Login
    console.log('Logging in as Admin (CFO)...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const adminBtn = buttons.find(b => b.textContent && b.textContent.includes('Admin (CFO)'));
      if (adminBtn) adminBtn.click();
    });
    await sleep(400);

    // Click submit
    await page.evaluate(() => {
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    });
    await sleep(2000);

    // 3. Capture Dashboard
    console.log('Capturing Dashboard...');
    await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle2' });
    await sleep(1500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'page5_dashboard_metrics.png') });
    console.log('Saved page5_dashboard_metrics.png');

    // 4. Capture Settings
    console.log('Capturing Settings...');
    await page.goto('http://localhost:5173/settings', { waitUntil: 'networkidle2' });
    await sleep(1500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'page_settings.png') });
    console.log('Saved page_settings.png');

  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

run();

