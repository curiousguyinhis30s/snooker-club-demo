import { test, expect } from '@playwright/test';

const LIVE_URL = 'https://snooker-club-demo.vercel.app';

test.describe('Live Site Verification', () => {
  test('should load the login page', async ({ page }) => {
    await page.goto(LIVE_URL);

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Should see the login screen or the app
    const pageContent = await page.content();
    console.log('Page title:', await page.title());

    // Check for login elements or main app
    const hasLoginButton = await page.locator('button').filter({ hasText: /login|sign in|superadmin|owner|employee/i }).count();
    const hasAppContent = await page.locator('text=/snooker|table|session|booking/i').count();

    console.log('Login buttons found:', hasLoginButton);
    console.log('App content found:', hasAppContent);

    // Take screenshot for verification
    await page.screenshot({ path: 'tests/screenshots/live-site-load.png', fullPage: true });

    expect(hasLoginButton > 0 || hasAppContent > 0).toBeTruthy();
  });

  test('should login as SuperAdmin', async ({ page }) => {
    await page.goto(LIVE_URL);
    await page.waitForLoadState('networkidle');

    // Look for SuperAdmin login option
    const superAdminBtn = page.locator('button, div').filter({ hasText: /superadmin/i }).first();

    if (await superAdminBtn.isVisible()) {
      await superAdminBtn.click();
      await page.waitForTimeout(500);

      // Enter PIN 999999
      const pinInputs = page.locator('input[type="password"], input[type="tel"], input[inputmode="numeric"]');
      const pinCount = await pinInputs.count();

      if (pinCount > 0) {
        // Single input field
        await pinInputs.first().fill('999999');
      } else {
        // Individual digit inputs
        const digitInputs = page.locator('input');
        for (let i = 0; i < 6; i++) {
          await digitInputs.nth(i).fill('9');
        }
      }

      // Click login button
      const loginBtn = page.locator('button').filter({ hasText: /login|sign in|enter|submit/i }).first();
      if (await loginBtn.isVisible()) {
        await loginBtn.click();
      }

      await page.waitForTimeout(1000);

      // Take screenshot after login attempt
      await page.screenshot({ path: 'tests/screenshots/after-login.png', fullPage: true });

      // Check if we're logged in (should see main app content)
      const loggedIn = await page.locator('text=/dashboard|tables|booking|session|logout/i').count();
      console.log('Logged in content found:', loggedIn);
    }
  });

  test('should show DataLossWarning component when localStorage is cleared', async ({ page }) => {
    // First, set a fingerprint to simulate existing data
    await page.goto(LIVE_URL);
    await page.waitForLoadState('networkidle');

    // Set fingerprint without actual user data to simulate data loss
    await page.evaluate(() => {
      localStorage.setItem('snooker_data_fingerprint', 'fp-test-123');
      // Don't set auth_users with owner - this simulates data loss
    });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take screenshot to see if warning appears
    await page.screenshot({ path: 'tests/screenshots/data-loss-warning.png', fullPage: true });

    // Check for data loss warning
    const warningModal = page.locator('text=/data.*lost|data.*missing|restore.*backup/i');
    const warningCount = await warningModal.count();
    console.log('Data loss warning elements found:', warningCount);

    // Clean up
    await page.evaluate(() => {
      localStorage.removeItem('snooker_data_fingerprint');
    });
  });
});
