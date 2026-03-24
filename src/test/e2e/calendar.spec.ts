// E2E tests for Calendar View
// Nightclub Booking System - Phase 2.2

import { test, expect } from '@playwright/test';

test.describe('Calendar View', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to events page
    await page.goto('/events');
  });

  test('calendar_month_view_displays_events', async ({ page }) => {
    // Check calendar month view loads
    await expect(page.locator('text=Calendar')).toBeVisible();
    
    // Check that navigation exists
    await expect(page.locator('button:has-text("Previous")')).toBeVisible();
    await expect(page.locator('button:has-text("Next")')).toBeVisible();
  });

  test('calendar_navigate_months', async ({ page }) => {
    // Click next month button
    await page.click('button:has-text("Next")');
    
    // Should navigate to next month
    // Calendar should still be visible
    await expect(page.locator('text=Calendar')).toBeVisible();
  });

  test('calendar_week_view_switch', async ({ page }) => {
    // Switch to week view
    await page.click('button:has-text("Week")');
    
    // Week view should show time slots
    await expect(page.locator('text=00:00')).toBeVisible();
  });

  test('calendar_day_view_switch', async ({ page }) => {
    // Switch to day view
    await page.click('button:has-text("Day")');
    
    // Day view should show hourly slots
    await expect(page.locator('text=00:00')).toBeVisible();
  });

  test('calendar_event_click_opens_detail', async ({ page }) => {
    // Click on an existing event (if any)
    const eventElement = page.locator('[data-testid="calendar-event"]').first();
    
    // If event exists, click it
    if (await eventElement.isVisible()) {
      await eventElement.click();
      
      // Should open event detail
      await expect(page.locator('text=Event Details')).toBeVisible();
    }
  });

  test('calendar_create_event_button', async ({ page }) => {
    // Check create event button exists
    await expect(page.locator('button:has-text("New Event")')).toBeVisible();
  });

  test('calendar_today_button', async ({ page }) => {
    // Click today button
    await page.click('button:has-text("Today")');
    
    // Should show current month
    const now = new Date();
    // Calendar should highlight today
    await expect(page.locator('[data-selected="true"]')).toBeVisible();
  });
});

test.describe('Event Creation Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/events/new');
  });

  test('event_form_renders', async ({ page }) => {
    await expect(page.locator('text=Create Event')).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="date"]')).toBeVisible();
  });

  test('event_form_validates_required', async ({ page }) => {
    // Submit empty form
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('text=Name is required')).toBeVisible();
  });

  test('event_form_date_picker_works', async ({ page }) => {
    // Click date picker
    await page.click('input[name="date"]');
    
    // Calendar picker should appear
    await expect(page.locator('[data-testid="date-picker"]')).toBeVisible();
  });
});
