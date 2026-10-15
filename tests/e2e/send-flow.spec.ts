import { test, expect } from '@playwright/test';

test.describe('End-to-End Send Flow (feature/e2e-send-flow)', () => {
  test('authenticates and executes full 5-step transfer flow to success screen against production build', async ({
    page,
  }) => {
    // 1. Visit Login Page
    await page.goto('/login');
    await expect(page).toHaveTitle(/Kobo/i);

    // 2. Perform Login via Demo Button or Form
    const demoButton = page.locator('button:has-text("Try Demo Account")');
    if (await demoButton.isVisible()) {
      await demoButton.click();
    } else {
      await page.fill('input[type="email"]', 'babatunde@kobo.demo');
      await page.fill('input[type="password"]', 'demopassword123');
      await page.click('button:has-text("Sign In to Wallet")');
    }

    // Wait for redirect to /dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page.locator('text=Available Balance')).toBeVisible();

    // 3. Navigate to Send Money Flow (/send)
    await page.goto('/send');
    await page.waitForURL('**/send');

    // -------------------------------------------------------------
    // STEP 1: Select Recipient & Bank
    // -------------------------------------------------------------
    const step1 = page.locator('[data-testid="send-step-1"]');
    await expect(step1).toBeVisible();

    // Fill 10-digit NUBAN account number
    const accountInput = page.locator('input[aria-label="10-Digit NUBAN Account Number"]');
    await accountInput.fill('0123456789');

    // Wait for account resolution badge to display resolved name
    await expect(page.locator('text=Chioma Adebayo')).toBeVisible({ timeout: 10000 });

    // Click Continue to Amount
    const continueBtn = page.locator('button:has-text("Continue to Amount")');
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();

    // -------------------------------------------------------------
    // STEP 2: Enter Amount & Calculate Fee
    // -------------------------------------------------------------
    const step2 = page.locator('[data-testid="send-step-2"]');
    await expect(step2).toBeVisible();

    // Transfer amount input (e.g. 5000)
    const amountInput = page.locator('input[aria-label="Transfer Amount in Naira"]');
    await amountInput.fill('5000');

    // Optional narration
    const narrationInput = page.locator('input[aria-label="Narration"]');
    await narrationInput.fill('Dinner payment');

    // Proceed to Review
    const reviewBtn = page.locator('button:has-text("Review Details")');
    await expect(reviewBtn).toBeEnabled();
    await reviewBtn.click();

    // -------------------------------------------------------------
    // STEP 3: Review Transfer Details
    // -------------------------------------------------------------
    const step3 = page.locator('[data-testid="send-step-3"]');
    await expect(step3).toBeVisible();
    await expect(step3.locator('text=Chioma Adebayo')).toBeVisible();
    await expect(step3.locator('text=₦5,000.00')).toBeVisible();

    // Authorize with PIN
    const authPinBtn = page.locator('button:has-text("Authorize with PIN")');
    await expect(authPinBtn).toBeEnabled();
    await authPinBtn.click();

    // -------------------------------------------------------------
    // STEP 4: Enter 4-Digit Security PIN
    // -------------------------------------------------------------
    const step4 = page.locator('[data-testid="send-step-4"]');
    await expect(step4).toBeVisible();
    await expect(page.locator('text=Enter 4-Digit Security PIN')).toBeVisible();

    // Click keypad digits: 1, 2, 3, 4
    await page.locator('button:text-is("1")').click();
    await page.locator('button:text-is("2")').click();
    await page.locator('button:text-is("3")').click();
    await page.locator('button:text-is("4")').click();

    // Confirm & Send Transfer
    const confirmBtn = page.locator('[data-testid="confirm-transfer-btn"]');
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // -------------------------------------------------------------
    // STEP 5: Success Screen & Official Receipt
    // -------------------------------------------------------------
    const step5 = page.locator('[data-testid="send-step-5"]');
    await expect(step5).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Transfer Successful')).toBeVisible();
    await expect(page.locator('text=Simulated Reference')).toBeVisible();
    await expect(page.locator('[data-testid="send-another-btn"]')).toBeVisible();
  });

  test('double-clicking confirm button sends exactly one transfer request (prevents double-submit)', async ({
    page,
  }) => {
    // Intercept and count transfer network requests
    let transferRequestCount = 0;
    page.on('request', (req) => {
      if (req.url().includes('/api/wallet/transfer') && req.method() === 'POST') {
        transferRequestCount++;
      }
    });

    // 1. Visit Login Page and Authenticate
    await page.goto('/login');
    const demoButton = page.locator('button:has-text("Try Demo Account")');
    if (await demoButton.isVisible()) {
      await demoButton.click();
    } else {
      await page.fill('input[type="email"]', 'babatunde@kobo.demo');
      await page.fill('input[type="password"]', 'demopassword123');
      await page.click('button:has-text("Sign In to Wallet")');
    }
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // 2. Navigate to Send Flow
    await page.goto('/send');
    await page.waitForURL('**/send');

    // Step 1: Recipient
    await page.locator('input[aria-label="10-Digit NUBAN Account Number"]').fill('0123456789');
    await expect(page.locator('text=Chioma Adebayo')).toBeVisible({ timeout: 10000 });
    await page.locator('button:has-text("Continue to Amount")').click();

    // Step 2: Amount
    await page.locator('input[aria-label="Transfer Amount in Naira"]').fill('2500');
    await page.locator('button:has-text("Review Details")').click();

    // Step 3: Review
    await page.locator('button:has-text("Authorize with PIN")').click();

    // Step 4: PIN Entry
    await page.locator('button:text-is("1")').click();
    await page.locator('button:text-is("2")').click();
    await page.locator('button:text-is("3")').click();
    await page.locator('button:text-is("4")').click();

    // Rapidly double-click confirm button
    const confirmBtn = page.locator('[data-testid="confirm-transfer-btn"]');
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.dblclick();

    // Step 5: Verify success screen
    await expect(page.locator('[data-testid="send-step-5"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Transfer Successful')).toBeVisible();

    // Assert that EXACTLY one transfer request was dispatched over the wire
    expect(transferRequestCount).toBe(1);
  });
});
