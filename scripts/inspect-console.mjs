import { chromium } from 'playwright';

async function inspectConsole() {
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
  };

  // 1. Inspect /login (Light & Dark)
  const contextLogin = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageLogin = await contextLogin.newPage();
  attachListeners(pageLogin, 'Login-Light');
  await pageLogin.goto('http://localhost:3005/login', { waitUntil: 'domcontentloaded' });
  await pageLogin.waitForTimeout(500);

  const contextLoginDark = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await contextLoginDark.addInitScript(() => localStorage.setItem('theme', 'dark'));
  const pageLoginDark = await contextLoginDark.newPage();
  attachListeners(pageLoginDark, 'Login-Dark');
  await pageLoginDark.goto('http://localhost:3005/login', { waitUntil: 'domcontentloaded' });
  await pageLoginDark.waitForTimeout(500);

  // 2. Inspect /dashboard (Authenticated - Light & Dark)
  const contextDashLight = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await contextDashLight.addCookies([{ name: 'kobo_auth', value: 'authenticated', domain: 'localhost', path: '/' }]);
  const pageDashLight = await contextDashLight.newPage();
  attachListeners(pageDashLight, 'Dashboard-Light');
  await pageDashLight.goto('http://localhost:3005/dashboard', { waitUntil: 'domcontentloaded' });
  await pageDashLight.waitForTimeout(800);

  const contextDashDark = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await contextDashDark.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await contextDashDark.addCookies([{ name: 'kobo_auth', value: 'authenticated', domain: 'localhost', path: '/' }]);
  const pageDashDark = await contextDashDark.newPage();
  attachListeners(pageDashDark, 'Dashboard-Dark');
  await pageDashDark.goto('http://localhost:3005/dashboard', { waitUntil: 'domcontentloaded' });
  await pageDashDark.waitForTimeout(800);

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
}

inspectConsole().catch(err => {
  console.error('Console inspection script error:', err);
  process.exit(1);
});
