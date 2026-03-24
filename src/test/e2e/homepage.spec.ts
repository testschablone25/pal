import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loaded without errors
    await expect(page).toHaveTitle(/PAL|Nightclub/);
  });
});