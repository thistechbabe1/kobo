import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { width: 390, height: 844, name: 'mobile' },
  { width: 1280, height: 800, name: 'desktop' },
];

test.describe('Visual Regression Baselines (cleanup/shared-components)', () => {
  for (const vp of VIEWPORTS) {
    test(`captures baseline screenshots at ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // 1. Authenticate via Demo Login
      await page.goto('/login');
      const demoBtn = page.locator('button:has-text("Try Demo Account")');
      if (await demoBtn.isVisible()) {
        await demoBtn.click();
      } else {
        await page.fill('input[type="email"]', 'babatunde@kobo.demo');
        await page.fill('input[type="password"]', 'demopassword123');
        await page.click('button:has-text("Sign In to Wallet")');
      }
      await page.waitForURL('**/dashboard', { timeout: 15000 });
      await expect(page.locator('text=Available Balance')).toBeVisible();

      // Mask dynamic clocks/live timestamps if present
      const dynamicMasks = [
        page.locator('[data-testid="live-clock"]'),
        page.locator('time'),
      ];

      // Dashboard screenshot
      await expect(page).toHaveScreenshot(`dashboard-${vp.name}.png`, {
        mask: dynamicMasks,
        maxDiffPixelRatio: 0.02,
      });

      // 2. Transactions page
      await page.goto('/transactions');
      await page.waitForURL('**/transactions');
      await expect(page.locator('text=Transaction History')).toBeVisible();
      await expect(page).toHaveScreenshot(`transactions-${vp.name}.png`, {
        mask: dynamicMasks,
        maxDiffPixelRatio: 0.02,
      });

      // 3. Send Money Flow: Step 1 (Recipient)
      await page.goto('/send');
      await page.waitForURL('**/send');
      const step1 = page.locator('[data-testid="send-step-1"]');
      await expect(step1).toBeVisible();

      const accountInput = page.locator('input[aria-label="10-Digit NUBAN Account Number"]');
      await accountInput.fill('0123456789');
      await expect(page.locator('text=Chioma Adebayo')).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveScreenshot(`send-step1-${vp.name}.png`, {
        mask: dynamicMasks,
        maxDiffPixelRatio: 0.02,
      });

      // Step 2 (Amount & Fee)
      const continueBtn = page.locator('button:has-text("Continue to Amount")');
      await continueBtn.click();
      const step2 = page.locator('[data-testid="send-step-2"]');
      await expect(step2).toBeVisible();

      const amountInput = page.locator('input[aria-label="Transfer Amount in Naira"]');
      await amountInput.fill('5000');
      const narrationInput = page.locator('input[aria-label="Narration"]');
      await narrationInput.fill('Dinner payment');
      await expect(page).toHaveScreenshot(`send-step2-${vp.name}.png`, {
        mask: dynamicMasks,
        maxDiffPixelRatio: 0.02,
      });

      // Step 3 (Review)
      const reviewBtn = page.locator('button:has-text("Review Details")');
      await reviewBtn.click();
      const step3 = page.locator('[data-testid="send-step-3"]');
      await expect(step3).toBeVisible();
      await expect(page).toHaveScreenshot(`send-step3-${vp.name}.png`, {
        mask: dynamicMasks,
        maxDiffPixelRatio: 0.02,
      });

      // Step 4 (PIN Entry)
      const authPinBtn = page.locator('button:has-text("Authorize with PIN")');
      await authPinBtn.click();
      const step4 = page.locator('[data-testid="send-step-4"]');
      await expect(step4).toBeVisible();

      await page.locator('button:text-is("1")').click();
      await page.locator('button:text-is("2")').click();
      await page.locator('button:text-is("3")').click();
      await page.locator('button:text-is("4")').click();
      await expect(page).toHaveScreenshot(`send-step4-${vp.name}.png`, {
        mask: dynamicMasks,
        maxDiffPixelRatio: 0.02,
      });

      // Step 5 (Receipt & Success)
      const confirmBtn = page.locator('[data-testid="confirm-transfer-btn"]');
      await confirmBtn.click();
      const step5 = page.locator('[data-testid="send-step-5"]');
      await expect(step5).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text=Transfer Successful')).toBeVisible();

      // Mask dynamic reference ID and timestamps on receipt
      const receiptMasks = [
        ...dynamicMasks,
        page.locator('p:has-text("TX")'),
        page.locator('span:has-text("TX")'),
        page.locator('text=Simulated Reference'),
      ];
      await expect(page).toHaveScreenshot(`send-step5-${vp.name}.png`, {
        mask: receiptMasks,
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});
