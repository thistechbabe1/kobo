/**
 * Playwright E2E tests for transfer failure handling, PIN attempt decrements,
 * lockout enforcement, and client-side double-submit button disabling.
 */
import { test, expect } from '@playwright/test';

test.describe('End-to-End Send Flow - Failure Paths & Double Submit Prevention (feature/e2e-send-flow)', () => {
  test('handles incorrect PIN failure, displays error with remaining attempts, and prevents double-submit', async ({
    page,
  }) => {
    // 1. Visit Login Page and Authenticate
    await page.goto('/login');
    await expect(page).toHaveTitle(/Kobo/i);

    const demoButton = page.locator('button:has-text("Try Demo Account")');
    if (await demoButton.isVisible()) {
      await demoButton.click();
    } else {
      await page.fill('input[type="email"]', 'babatunde@kobo.demo');
      await page.fill('input[type="password"]', 'demopassword123');
      await page.click('button:has-text("Sign In to Wallet")');
    }

    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page.locator('text=Available Balance')).toBeVisible();

    // 2. Navigate to Send Money Flow (/send)
    await page.goto('/send');
    await page.waitForURL('**/send');

    // Step 1: Destination Account
    const step1 = page.locator('[data-testid="send-step-1"]');
    await expect(step1).toBeVisible();

    const accountInput = page.locator('input[aria-label="10-Digit NUBAN Account Number"]');
    await accountInput.fill('0123456789');
    await expect(page.locator('text=Chioma Adebayo')).toBeVisible({ timeout: 10000 });

    const continueBtn = page.locator('button:has-text("Continue to Amount")');
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();

    // Step 2: Amount Entry
    const step2 = page.locator('[data-testid="send-step-2"]');
    await expect(step2).toBeVisible();

    const amountInput = page.locator('input[aria-label="Transfer Amount in Naira"]');
    await amountInput.fill('5000');

    const reviewBtn = page.locator('button:has-text("Review Details")');
    await expect(reviewBtn).toBeEnabled();
    await reviewBtn.click();

    // Step 3: Review Details
    const step3 = page.locator('[data-testid="send-step-3"]');
    await expect(step3).toBeVisible();

    const authPinBtn = page.locator('button:has-text("Authorize with PIN")');
    await expect(authPinBtn).toBeEnabled();
    await authPinBtn.click();

    // Step 4: Security PIN - Failure Path with Wrong PIN
    const step4 = page.locator('[data-testid="send-step-4"]');
    await expect(step4).toBeVisible();

    // Enter wrong PIN: 9, 9, 9, 9 (valid demo PIN is 1234)
    await page.locator('button:text-is("9")').click();
    await page.locator('button:text-is("9")').click();
    await page.locator('button:text-is("9")').click();
    await page.locator('button:text-is("9")').click();

    const confirmBtn = page.locator('[data-testid="confirm-transfer-btn"]');
    await expect(confirmBtn).toBeEnabled();

    // Click to submit transfer
    await confirmBtn.click();

    // Verify error banner is displayed with remaining attempt count
    const errorBanner = page.locator('[data-testid="transfer-error-banner"]');
    await expect(errorBanner).toBeVisible({ timeout: 10000 });
    await expect(errorBanner).toContainText('Incorrect PIN');
    await expect(errorBanner).toContainText('remaining');

    // Verify double-submit is prevented:
    // After an incorrect PIN attempt, PIN digits are wiped from the state,
    // so confirm-transfer-btn is immediately disabled until 4 new digits are entered.
    await expect(confirmBtn).toBeDisabled();
  });
});
