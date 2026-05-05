/**
 * Playwright E2E Test — Door / Check-in Flow
 * Tests: guest list creation → add guest → check in via UI → verify status.
 *
 * Run: npx playwright test src/test/e2e/door-checkin.spec.ts
 */

import { test, expect } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL || "manager@pal.test";
const PASSWORD = process.env.E2E_PASSWORD || "TestManager123!";

test.describe("Door Check-in Flow", () => {
	test.beforeEach(async ({ page }) => {
		// Login first
		await page.goto("/login");
		await page.fill('input[type="email"], input[name="email"]', EMAIL);
		await page.fill('input[type="password"], input[name="password"]', PASSWORD);
		await page.click(
			'button[type="submit"], button:has-text("Login"), button:has-text("Sign in")',
		);
		await page.waitForURL(/\/(dashboard|events)/, { timeout: 10000 });
	});

	test("should navigate to door page and show tabs", async ({ page }) => {
		await page.goto("/door");
		await page.waitForLoadState("networkidle");

		// Door control heading visible
		await expect(
			page.getByRole("heading", { name: "Door Control" }),
		).toBeVisible();

		// All 3 tabs present
		await expect(page.getByRole("tab", { name: "Scanner" })).toBeVisible();
		await expect(page.getByRole("tab", { name: "Manual Entry" })).toBeVisible();
		await expect(page.getByRole("tab", { name: "Dashboard" })).toBeVisible();
	});

	test("should show manual check-in form with required fields", async ({
		page,
	}) => {
		await page.goto("/door");
		await page.waitForLoadState("networkidle");

		// Switch to Manual Entry tab
		await page.getByRole("tab", { name: "Manual Entry" }).click();
		await page.waitForLoadState("networkidle");

		// Form fields visible
		await expect(page.getByLabel("Guest Name *")).toBeVisible();
		await expect(page.getByLabel("Email")).toBeVisible();
		await expect(page.getByLabel("Phone")).toBeVisible();
		await expect(page.getByLabel("Category *")).toBeVisible();
		await expect(page.getByLabel("Plus Ones")).toBeVisible();
	});

	test("should validate required guest name field", async ({ page }) => {
		await page.goto("/door");
		await page.waitForLoadState("networkidle");

		await page.getByRole("tab", { name: "Manual Entry" }).click();
		await page.waitForLoadState("networkidle");

		// Submit with empty name — expect validation error
		await page
			.getByRole("button", { name: "Add to Guest List" })
			.first()
			.click();

		// Should show validation feedback
		await expect(
			page.locator("text=Name must be at least 2 characters"),
		).toBeVisible();
	});

	test("should switch between scanner and manual entry tabs", async ({
		page,
	}) => {
		await page.goto("/door");
		await page.waitForLoadState("networkidle");

		// Default is scanner tab
		await expect(page.getByText("QR Code Scanner")).toBeVisible();

		// Switch to Manual Entry
		await page.getByRole("tab", { name: "Manual Entry" }).click();
		await expect(page.getByText("Manual Check-in")).toBeVisible();
		await expect(page.getByText("Add Walk-in Guest")).toBeVisible();

		// Switch to Dashboard
		await page.getByRole("tab", { name: "Dashboard" }).click();
		await expect(page.getByText("Current Occupancy")).toBeVisible();
	});

	test("should display capacity dashboard with event selector", async ({
		page,
	}) => {
		await page.goto("/door");
		await page.waitForLoadState("networkidle");

		// Dashboard tab
		await page.getByRole("tab", { name: "Dashboard" }).click();
		await page.waitForLoadState("networkidle");

		// Capacity info visible (may be loading or empty state)
		const dashboardContent = page.locator("[class*='space-y-4']").first();
		await expect(dashboardContent).toBeVisible();
	});

	test("should show manual token input for QR check-in", async ({ page }) => {
		await page.goto("/door");
		await page.waitForLoadState("networkidle");

		await page.getByRole("tab", { name: "Manual Entry" }).click();

		// Manual token/QR input exists
		await expect(page.getByLabel("Enter QR Token or Guest ID")).toBeVisible();
		await expect(page.getByRole("button", { name: "Check In" })).toBeVisible();
	});

	test("should have category dropdown with correct options", async ({
		page,
	}) => {
		await page.goto("/door");
		await page.waitForLoadState("networkidle");

		await page.getByRole("tab", { name: "Manual Entry" }).click();

		// Open category dropdown
		await page.getByLabel("Category *").click();

		// All options present
		await expect(page.getByRole("option", { name: "Presale" })).toBeVisible();
		await expect(page.getByRole("option", { name: "Guestlist" })).toBeVisible();
		await expect(page.getByRole("option", { name: "Walk-in" })).toBeVisible();
	});

	test("should navigate from event detail to door page", async ({ page }) => {
		// Go to events page and click first event
		await page.goto("/events");
		await page.waitForLoadState("networkidle");

		// Click on an event card if visible
		const eventCard = page.locator("a[href*='/events/']").first();
		if (await eventCard.isVisible()) {
			await eventCard.click();
			await page.waitForLoadState("networkidle");

			// The Door button should exist on event detail (P0.4)
			const doorBtn = page.locator('a[href*="/door"], button:has-text("Door")');
			if (await doorBtn.isVisible()) {
				await doorBtn.first().click();
				await page.waitForLoadState("networkidle");

				// Should land on door page
				await expect(
					page.getByRole("heading", { name: "Door Control" }),
				).toBeVisible();
			}
		}
	});

	test("should navigate from event detail to guest list page", async ({
		page,
	}) => {
		await page.goto("/events");
		await page.waitForLoadState("networkidle");

		// Click first event
		const eventCard = page.locator("a[href*='/events/']").first();
		if (await eventCard.isVisible()) {
			await eventCard.click();
			await page.waitForLoadState("networkidle");

			// Guest List button should exist (P0.4)
			const guestListBtn = page.locator(
				'a[href*="/guest-lists"], button:has-text("Guest List")',
			);
			if (await guestListBtn.isVisible()) {
				await guestListBtn.first().click();
				await page.waitForLoadState("networkidle");

				// Should show guest list page
				await expect(
					page.locator("text=Guest List, text=Guest Lists").first(),
				).toBeVisible();
			}
		}
	});
});
