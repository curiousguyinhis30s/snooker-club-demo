import { test, expect } from '@playwright/test';

const LIVE_URL = 'https://snooker-club-demo.vercel.app';

test.describe('Full App Flow Verification', () => {
  test('complete login and app functionality', async ({ page }) => {
    await page.goto(LIVE_URL);
    await page.waitForLoadState('networkidle');

    // Screenshot 1: Initial load
    await page.screenshot({ path: 'tests/screenshots/1-initial-load.png', fullPage: true });
    console.log('Page loaded');

    // Fill in SuperAdmin credentials
    await page.fill('input[type="text"], input[placeholder*="username" i], input[placeholder*="superadmin" i]', 'superadmin');
    await page.fill('input[type="password"], input[placeholder*="pin" i]', '999999');

    // Screenshot 2: Credentials filled
    await page.screenshot({ path: 'tests/screenshots/2-credentials-filled.png', fullPage: true });

    // Click Sign In
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(2000);

    // Screenshot 3: After login
    await page.screenshot({ path: 'tests/screenshots/3-after-login.png', fullPage: true });

    // Check if we're in the app
    const url = page.url();
    console.log('Current URL:', url);

    // Look for app elements
    const sidebar = await page.locator('nav, aside, [class*="sidebar"]').count();
    const tables = await page.locator('text=/table|snooker|pool|booking/i').count();
    console.log('Sidebar elements:', sidebar);
    console.log('Table/booking elements:', tables);

    // Verify logged in
    expect(tables > 0 || sidebar > 0).toBeTruthy();
  });

  test('verify data loss warning appears correctly', async ({ page }) => {
    await page.goto(LIVE_URL);
    await page.waitForLoadState('networkidle');

    // Simulate data loss scenario:
    // 1. Set fingerprint (indicates user HAD data)
    // 2. Set auth_users with only superadmin (no owner = data was lost)
    await page.evaluate(() => {
      // Set fingerprint to indicate data existed before
      localStorage.setItem('snooker_data_fingerprint', 'fp-2-0-1234567890');

      // Set auth_users with ONLY superadmin (no owner)
      const superadminOnly = [{
        id: 'superadmin-001',
        role: 'superadmin',
        name: 'SuperAdmin',
        username: 'superadmin',
        pin: '$2a$10$hashedpin',
        active: true
      }];
      localStorage.setItem('auth_users', JSON.stringify(superadminOnly));
    });

    // Reload to trigger data loss check
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Screenshot: Data loss warning should appear
    await page.screenshot({ path: 'tests/screenshots/4-data-loss-warning.png', fullPage: true });

    // Check for the warning modal
    const warningTitle = await page.locator('text=/Data.*Lost|Data.*Missing/i').count();
    const restoreButton = await page.locator('button:has-text("Restore"), button:has-text("Backup")').count();
    const startFreshButton = await page.locator('button:has-text("Start Fresh")').count();

    console.log('Warning title found:', warningTitle);
    console.log('Restore button found:', restoreButton);
    console.log('Start Fresh button found:', startFreshButton);

    // Clean up
    await page.evaluate(() => {
      localStorage.clear();
    });

    // The warning should show
    expect(warningTitle > 0 || restoreButton > 0).toBeTruthy();
  });
});
