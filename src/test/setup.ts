import { beforeAll, afterEach, afterAll, vi } from "vitest";
import "@testing-library/jest-dom";
import React from "react";

beforeAll(() => {
	// Global test setup
});

afterEach(() => {
	// Cleanup after each test
	vi.restoreAllMocks();
});

afterAll(() => {
	// Global teardown
});

// Mock next/navigation globally for component tests
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		refresh: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		prefetch: vi.fn(),
	}),
	usePathname: () => "/",
	useSearchParams: () => new URLSearchParams(),
}));

// Mock next/link globally for component tests
vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		[key: string]: unknown;
	}) => {
		return React.createElement("a", { href, ...props }, children);
	},
}));
