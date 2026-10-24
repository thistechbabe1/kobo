/**
 * Playwright E2E verification for transaction statement CSV export functionality on /transactions.
 * Asserts filter application, row count in button label, download triggering, suggested filename format,
 * and parity between exported CSV rows and the total number of matching filtered transactions.
 *
 * Seed data note: The demo seed data contains 5 historical transactions (which fits on 1 page since pageSize=10).
 * Multi-page export across multiple pages (15 transactions spanning 2 pages) is comprehensively tested
 * in unit test `tests/unit/transactions.test.tsx`.
 */
import { test, expect } from '@playwright/test';

test.describe('Transactions Statement Export (feature/statement-export)', () => {
  test('applies filter, asserts row count in button, downloads CSV, and verifies all matching rows are exported', async ({
    page,
  }) => {
    // 1. Authenticate with demo account
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

    // 2. Navigate to /transactions
    await page.goto('/transactions');
    await page.waitForURL('**/transactions');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Initially with 5 seeded transactions, the button label shows row count: "Export CSV (5)"
    const exportBtn = page.locator('button:has-text("Export CSV")');
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).toBeEnabled();
    await expect(exportBtn).toHaveText(/Export CSV \(5\)/);

    // 3. Apply a filter to narrow matching rows
    const searchInput = page.locator('input[type="search"]');
    await searchInput.fill('Salary');
    await page.waitForTimeout(400); // Wait for filter evaluation

    // Button label updates reactively with filtered row count
    await expect(exportBtn).toHaveText(/Export CSV \(1\)/);

    // Count currently visible rows in the table
    const visibleRowCount = await page.locator('table tbody tr').count();
    expect(visibleRowCount).toBe(1);

    // 4. Click Export CSV and wait for browser download event
    const downloadPromise = page.waitForEvent('download');
    await exportBtn.click();
    const download = await downloadPromise;

    // 5. Assert suggested file name format: kobo-statement-YYYY-MM-DD.csv
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/^kobo-statement-\d{4}-\d{2}-\d{2}\.csv$/);

    // 6. Read downloaded stream and verify row count matches visible rows + 1 header
    const stream = await download.createReadStream();
    expect(stream).not.toBeNull();
    const chunks: Buffer[] = [];
    if (stream) {
      for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
      }
    }
    const csvContent = Buffer.concat(chunks).toString('utf-8');
    const lines = csvContent.trim().split(/\r?\n/).filter((line) => line.trim().length > 0);

    expect(lines[0]).toBe('Date,Reference,Type,Narration,Recipient,Amount,Fee,Status');
    // Header + 1 filtered record matching "Salary" across all pages
    expect(lines.length).toBe(visibleRowCount + 1);

    // 7. Clear filter and verify button resets to full count
    await searchInput.fill('');
    await page.waitForTimeout(400);
    await expect(exportBtn).toHaveText(/Export CSV \(5\)/);
  });
});
