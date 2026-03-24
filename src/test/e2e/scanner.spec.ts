import { test, expect } from '@playwright/test';

test.describe('Door Scanner Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/door');
  });

  test('should display scanner page with all tabs', async ({ page }) => {
    // Check page title
    await expect(page.getByRole('heading', { name: 'Door Control' })).toBeVisible();
    
    // Check tabs are present
    await expect(page.getByRole('tab', { name: 'Scanner' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Manual Entry' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Dashboard' })).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    // Default is scanner tab
    await expect(page.getByText('QR Code Scanner')).toBeVisible();
    
    // Switch to Manual Entry
    await page.getByRole('tab', { name: 'Manual Entry' }).click();
    await expect(page.getByText('Manual Check-in')).toBeVisible();
    await expect(page.getByText('Add Walk-in Guest')).toBeVisible();
    
    // Switch to Dashboard
    await page.getByRole('tab', { name: 'Dashboard' }).click();
    await expect(page.getByText('Current Occupancy')).toBeVisible();
  });

  test('should show manual token input', async ({ page }) => {
    await page.getByRole('tab', { name: 'Manual Entry' }).click();
    
    // Check manual token input exists
    await expect(page.getByLabel('Enter QR Token or Guest ID')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Check In' })).toBeVisible();
  });

  test('should show walk-in form', async ({ page }) => {
    await page.getByRole('tab', { name: 'Manual Entry' }).click();
    
    // Check walk-in form fields
    await expect(page.getByLabel('Guest Name *')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Phone')).toBeVisible();
    await expect(page.getByLabel('Category *')).toBeVisible();
    await expect(page.getByLabel('Plus Ones')).toBeVisible();
  });

  test('should display capacity dashboard', async ({ page }) => {
    await page.getByRole('tab', { name: 'Dashboard' }).click();
    
    // Check dashboard elements - may show loading or error depending on backend
    // Either loading state or actual data should be visible
    const dashboardContent = page.locator('[class*="space-y-4"]');
    await expect(dashboardContent).toBeVisible();
  });
});

test.describe('Guest Entry Form', () => {
  test('should validate required fields', async ({ page }) => {
    await page.goto('/door');
    await page.getByRole('tab', { name: 'Manual Entry' }).click();
    
    // Try to submit without required fields
    await page.getByRole('button', { name: 'Add to Guest List' }).click();
    
    // Should show validation error for name
    await expect(page.getByText('Name must be at least 2 characters')).toBeVisible();
  });

  test('should have category options', async ({ page }) => {
    await page.goto('/door');
    await page.getByRole('tab', { name: 'Manual Entry' }).click();
    
    // Open category dropdown
    await page.getByLabel('Category *').click();
    
    // Check all options are present
    await expect(page.getByRole('option', { name: 'Presale' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Guestlist' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Walk-in' })).toBeVisible();
  });
});
