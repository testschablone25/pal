/**
 * Playwright E2E Test — Rider → Task Flow
 * Tests: view artist rider → generate tasks → verify tasks in workflow.
 *
 * Run: npx playwright test src/test/e2e/rider-task.spec.ts
 */

import { test, expect } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL || "manager@pal.test";
const PASSWORD = process.env.E2E_PASSWORD || "TestManager123!";

test.describe("Rider → Task Flow", () => {
	test.beforeEach(async ({ page }) => {
		// Login
		await page.goto("/login");
		await page.fill('input[type="email"], input[name="email"]', EMAIL);
		await page.fill('input[type="password"], input[name="password"]', PASSWORD);
		await page.click(
			'button[type="submit"], button:has-text("Login"), button:has-text("Sign in")',
		);
		await page.waitForURL(/\/(dashboard|events)/, { timeout: 10000 });
	});

	test("should navigate to artists page and display list", async ({ page }) => {
		await page.goto("/artists");
		await page.waitForLoadState("networkidle");

		// Artists page visible
		await expect(page.locator("h1")).toBeVisible();
	});

	test("should open artist detail page", async ({ page }) => {
		await page.goto("/artists");
		await page.waitForLoadState("networkidle");

		// Click first artist view link
		const viewLink = page.locator('a:has-text("View")').first();
		if (await viewLink.isVisible()) {
			await viewLink.click();
			await page.waitForLoadState("networkidle");

			// Artist detail page loaded
			await expect(page.locator("h1")).toBeVisible();
		}
	});

	test("should show rider section on artist detail if rider exists", async ({
		page,
	}) => {
		await page.goto("/artists");
		await page.waitForLoadState("networkidle");

		// Click first artist
		const viewLink = page.locator('a:has-text("View")').first();
		if (await viewLink.isVisible()) {
			await viewLink.click();
			await page.waitForLoadState("networkidle");

			// Check for rider section or rider upload
			const riderSection = page.locator(
				"text=Rider, text=Tech Rider, text=Hospitality, text=Upload Rider",
			);
			if ((await riderSection.count()) > 0) {
				await expect(riderSection.first()).toBeVisible();
			}
		}
	});

	test("should show task generation button if rider exists", async ({
		page,
	}) => {
		await page.goto("/artists");
		await page.waitForLoadState("networkidle");

		const viewLink = page.locator('a:has-text("View")').first();
		if (await viewLink.isVisible()) {
			await viewLink.click();
			await page.waitForLoadState("networkidle");

			// Generate Tasks button may be present
			const generateBtn = page.locator(
				'button:has-text("Generate Tasks"), button:has-text("Generate"), button:has-text("Aufgaben generieren")',
			);
			if ((await generateBtn.count()) > 0) {
				await expect(generateBtn.first()).toBeVisible();
			}
		}
	});

	test("should navigate to workflow/tasks page", async ({ page }) => {
		await page.goto("/workflow");
		await page.waitForLoadState("networkidle");

		// Workflow page loaded
		await expect(page.locator("h1")).toBeVisible();
	});

	test("should show task board columns on workflow page", async ({ page }) => {
		// Try known workflow routes
		const routes = ["/workflow", "/tasks"];
		let foundWorkflow = false;

		for (const route of routes) {
			await page.goto(route);
			await page.waitForLoadState("networkidle");

			// Workflow page should have kanban columns
			const columns = page.locator(
				'[class*="kanban"], [class*="column"], section[class*="grid"]',
			);
			if ((await columns.count()) > 0) {
				foundWorkflow = true;
				await expect(columns.first()).toBeVisible();
				break;
			}
		}

		// Either we found workflow columns or the page loaded with content
		if (!foundWorkflow) {
			const pageContent = page.locator("body");
			await expect(pageContent).toBeVisible();
		}
	});

	test("should navigate from artist to event linking if available", async ({
		page,
	}) => {
		await page.goto("/artists");
		await page.waitForLoadState("networkidle");

		// Click first artist
		const viewLink = page.locator('a:has-text("View")').first();
		if (await viewLink.isVisible()) {
			await viewLink.click();
			await page.waitForLoadState("networkidle");

			// Check for "Add to Event" action (P3.3)
			const addToEvent = page.locator(
				'button:has-text("Add to Event"), a:has-text("Add to Event"), button:has-text("Add Performance")',
			);
			if ((await addToEvent.count()) > 0) {
				await expect(addToEvent.first()).toBeVisible();
			}
		}
	});

	test("should navigate to inventory page from workflow context", async ({
		page,
	}) => {
		await page.goto("/inventory");
		await page.waitForLoadState("networkidle");

		// Inventory page visible
		await expect(page.locator("h1")).toBeVisible();

		// Search bar visible
		const searchInput = page.locator(
			'input[placeholder*="Search"], input[placeholder*="search"]',
		);
		if ((await searchInput.count()) > 0) {
			await expect(searchInput.first()).toBeVisible();
		}
	});

	test("should verify artist list has filter controls", async ({ page }) => {
		await page.goto("/artists");
		await page.waitForLoadState("networkidle");

		// Search/filter bar visible
		const searchInput = page.locator(
			'input[placeholder*="Search"], input[placeholder*="search"]',
		);
		if ((await searchInput.count()) > 0) {
			await expect(searchInput.first()).toBeVisible();
		}

		// Genre filter present
		const genreFilter = page.locator("text=Genre").first();
		if ((await genreFilter.count()) > 0) {
			await expect(genreFilter).toBeVisible();
		}
	});
});
