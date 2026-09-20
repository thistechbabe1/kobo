import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const OUTPUT_DIR = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\ded00ede-b722-4003-9e87-655d1cf608b8\\shell-preview';
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function captureScreenshots() {
  const browser = await chromium.launch();

  const loginAndGo = async (width, height, isDark = false) => {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    if (isDark) {
      await page.addInitScript(() => {
        localStorage.setItem('theme', 'dark');
      });
    }
    await page.goto('http://localhost:3005/login', { waitUntil: 'domcontentloaded' });
    await page.click('button:has-text("Try Demo Account")');
    await page.waitForURL('**/dashboard');
    await page.waitForTimeout(600);
    return { context, page };
  };

  // Desktop (1440px) Light Mode
  const { page: pageLight } = await loginAndGo(1440, 900, false);
  await pageLight.screenshot({ path: path.join(OUTPUT_DIR, 'desktop-light-shell.png'), fullPage: true });

  // Desktop (1440px) Dark Mode
  const { page: pageDark } = await loginAndGo(1440, 900, true);
  await pageDark.screenshot({ path: path.join(OUTPUT_DIR, 'desktop-dark-shell.png'), fullPage: true });
  
  // Open Demo Tips Drawer
  await pageDark.click('button[aria-label="Open Demo Tips and Test Triggers"]');
  await pageDark.waitForTimeout(400);
  await pageDark.screenshot({ path: path.join(OUTPUT_DIR, 'desktop-dark-drawer-open.png'), fullPage: true });

  // Mobile (390px) Light Mode
  const { page: pageMobileLight } = await loginAndGo(390, 844, false);
  await pageMobileLight.screenshot({ path: path.join(OUTPUT_DIR, 'mobile-light-shell.png'), fullPage: true });

  // Mobile (390px) Dark Mode
  const { page: pageMobileDark } = await loginAndGo(390, 844, true);
  await pageMobileDark.screenshot({ path: path.join(OUTPUT_DIR, 'mobile-dark-shell.png'), fullPage: true });

  await browser.close();
  console.log('✅ Shell screenshots captured successfully in:', OUTPUT_DIR);
}

captureScreenshots().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
