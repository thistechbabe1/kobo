import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const OUTPUT_DIR = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\ded00ede-b722-4003-9e87-655d1cf608b8\\feature3-preview';
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function run() {
  const browser = await chromium.launch();
  const consoleMessages = [];
  const pageErrors = [];

  const attachListeners = (page, contextName) => {
    page.on('console', msg => {
      consoleMessages.push(`[${contextName}] [${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', err => {
      pageErrors.push(`[${contextName}] [PAGE ERROR] ${err.message}`);
    });
    page.on('response', res => {
      if (res.status() >= 400) {
        consoleMessages.push(`[${contextName}] [HTTP ${res.status()}] ${res.url()}`);
      }
    });
  };

  // Helper to log in and return authenticated context and page
  const getAuthSession = async (width, height, isDark = false) => {
    const context = await browser.newContext({ viewport: { width, height } });
    if (isDark) {
      await context.addInitScript(() => {
        localStorage.setItem('theme', 'dark');
      });
    }
    const page = await context.newPage();
    attachListeners(page, `Auth-${width}px-${isDark ? 'Dark' : 'Light'}`);
    await page.goto('http://localhost:3005/login', { waitUntil: 'domcontentloaded' });
    await page.click('button:has-text("Try Demo Account")');
    await page.waitForURL('**/dashboard');
    await page.waitForTimeout(600);
    return { context, page };
  };

  // 1. Inspect /login (Light & Dark)
  const ctxLoginLight = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageLoginLight = await ctxLoginLight.newPage();
  attachListeners(pageLoginLight, 'Login-Light');
  await pageLoginLight.goto('http://localhost:3005/login', { waitUntil: 'domcontentloaded' });
  await pageLoginLight.waitForTimeout(600);

  const ctxLoginDark = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctxLoginDark.addInitScript(() => localStorage.setItem('theme', 'dark'));
  const pageLoginDark = await ctxLoginDark.newPage();
  attachListeners(pageLoginDark, 'Login-Dark');
  await pageLoginDark.goto('http://localhost:3005/login', { waitUntil: 'domcontentloaded' });
  await pageLoginDark.waitForTimeout(600);

  // 2. Inspect /dashboard (Light & Dark)
  const { page: pageDashLight } = await getAuthSession(1440, 900, false);
  await pageDashLight.waitForTimeout(600);

  const { page: pageDashDark } = await getAuthSession(1440, 900, true);
  await pageDashDark.waitForTimeout(600);

  // 3. Inspect & Screenshot /transactions (Desktop 1440px - Light & Dark)
  const { page: pageTxDeskLight } = await getAuthSession(1440, 900, false);
  await pageTxDeskLight.goto('http://localhost:3005/transactions', { waitUntil: 'domcontentloaded' });
  await pageTxDeskLight.waitForTimeout(1000);
  await pageTxDeskLight.screenshot({ path: path.join(OUTPUT_DIR, 'desktop-transactions-light.png'), fullPage: true });

  const { page: pageTxDeskDark } = await getAuthSession(1440, 900, true);
  await pageTxDeskDark.goto('http://localhost:3005/transactions', { waitUntil: 'domcontentloaded' });
  await pageTxDeskDark.waitForTimeout(1000);
  await pageTxDeskDark.screenshot({ path: path.join(OUTPUT_DIR, 'desktop-transactions-dark.png'), fullPage: true });

  // 4. Inspect & Screenshot /transactions (Mobile 390px - Light & Dark)
  const { page: pageTxMobLight } = await getAuthSession(390, 844, false);
  await pageTxMobLight.goto('http://localhost:3005/transactions', { waitUntil: 'domcontentloaded' });
  await pageTxMobLight.waitForTimeout(1000);
  await pageTxMobLight.screenshot({ path: path.join(OUTPUT_DIR, 'mobile-transactions-light.png') });

  const { page: pageTxMobDark } = await getAuthSession(390, 844, true);
  await pageTxMobDark.goto('http://localhost:3005/transactions', { waitUntil: 'domcontentloaded' });
  await pageTxMobDark.waitForTimeout(1000);
  await pageTxMobDark.screenshot({ path: path.join(OUTPUT_DIR, 'mobile-transactions-dark.png') });

  await browser.close();

  console.log('=== Playwright Console & Hydration Audit Output ===\n');
  console.log(`Console Messages (${consoleMessages.length}):`);
  if (consoleMessages.length === 0) {
    console.log('none observed');
  } else {
    consoleMessages.forEach(msg => console.log(' ', msg));
  }

  console.log(`\nPage Errors (${pageErrors.length}):`);
  if (pageErrors.length === 0) {
    console.log('none observed');
  } else {
    pageErrors.forEach(err => console.log(' ', err));
  }
  console.log('\n===================================================');
  console.log(`Screenshots saved to: ${OUTPUT_DIR}`);
}

run().catch(err => {
  console.error('Inspection and capture failed:', err);
  process.exit(1);
});
