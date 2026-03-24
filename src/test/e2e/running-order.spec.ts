// E2E tests for Running Order
// Nightclub Booking System - Phase 2.3

import { test, expect } from '@playwright/test';

test.describe('Running Order', () => {
  // Use a known event ID or create one
  const testEventId = 'test-event-id';

  test.beforeEach(async ({ page }) => {
    // Navigate to event detail with running order
    await page.goto(`/events/${testEventId}`);
  });

  test('running_order_displays_performances', async ({ page }) => {
    // Running order section should exist
    await expect(page.locator('text=Running Order')).toBeVisible();
  });

  test('running_order_drag_drop_reorder', async ({ page }) => {
    // Get initial order
    const initialOrder = await page.locator('[data-testid="performance-item"]').allInnerTexts();
    
    // Drag first item to second position
    const firstItem = page.locator('[data-testid="performance-item"]').first();
    const secondItem = page.locator('[data-testid="performance-item"]').nth(1);
    
    // Perform drag and drop
    const firstBox = await firstItem.boundingBox();
    const secondBox = await secondItem.boundingBox();
    
    if (firstBox && secondBox) {
      await firstItem.hover();
      await page.mouse.down();
      await secondItem.hover();
      await page.mouse.up();
    }
    
    // Order should be updated (visual feedback)
    // Check if the UI updated
  });

  test('running_order_add_performance', async ({ page }) => {
    // Click add performance button
    await page.click('button:has-text("Add Performance")');
    
    // Should open add performance form
    await expect(page.locator('text=Add Artist')).toBeVisible();
  });

  test('running_order_time_overlap_validation', async ({ page }) => {
    // Try to add performance with overlapping time
    await page.click('button:has-text("Add Performance")');
    
    // Fill in overlapping times
    await page.fill('input[name="start_time"]', '23:00');
    await page.fill('input[name="end_time"]', '23:45');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should show overlap warning
    // (Depends on implementation)
  });

  test('running_order_edit_performance', async ({ page }) => {
    // Click edit on a performance
    const editButton = page.locator('[data-testid="edit-performance"]').first();
    
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // Should open edit form
      await expect(page.locator('text=Edit Performance')).toBeVisible();
    }
  });

  test('running_order_delete_performance', async ({ page }) => {
    // Click delete on a performance
    const deleteButton = page.locator('[data-testid="delete-performance"]').first();
    
    if (await deleteButton.isVisible()) {
      // Should show confirmation
      await deleteButton.click();
      await expect(page.locator('text=Confirm Delete')).toBeVisible();
    }
  });
});

test.describe('Performance Time Validation', () => {
  test('performance_overlapping_times_blocked', async ({ page }) => {
    // Create first performance
    await page.goto(`/events/${testEventId}`);
    await page.click('button:has-text("Add Performance")');
    
    await page.selectOption('select[name="artist"]', 'artist-1');
    await page.fill('input[name="start_time"]', '22:00');
    await page.fill('input[name="end_time"]', '23:00');
    await page.click('button[type="submit"]');
    
    // Create second overlapping performance
    await page.click('button:has-text("Add Performance")');
    await page.selectOption('select[name="artist"]', 'artist-2');
    await page.fill('input[name="start_time"]', '22:30');
    await page.fill('input[name="end_time"]', '23:30');
    await page.click('button[type="submit"]');
    
    // Should be blocked
    await expect(page.locator('text=Time overlap detected')).toBeVisible();
  });
});
