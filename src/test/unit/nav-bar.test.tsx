/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NavBar } from "@/components/nav-bar";

// Mock next/navigation
vi.mock("next/navigation", () => ({
	usePathname: vi.fn(() => "/"),
	useRouter: vi.fn(() => ({
		push: vi.fn(),
		replace: vi.fn(),
	})),
}));

// Mock i18n
vi.mock("@/lib/i18n", () => ({
	useI18n: vi.fn(() => ({
		locale: "de",
		toggleLocale: vi.fn(),
	})),
}));

// Mock supabase browser client
vi.mock("@/lib/supabase/browser", () => ({
	createClient: vi.fn(() => ({
		auth: {
			getUser: vi.fn(() =>
				Promise.resolve({ data: { user: null }, error: null }),
			),
			onAuthStateChange: vi.fn(() => ({
				data: { subscription: { unsubscribe: vi.fn() } },
			})),
		},
	})),
	resetClient: vi.fn(),
}));

// We import the real canAccessRoute for accurate tests
const { canAccessRoute } = await vi.importActual<typeof import("@/lib/permissions")>(
	"@/lib/permissions",
);

// Mock useUser to control roles
const mockUseUser = vi.fn();
vi.mock("@/lib/user-context", () => ({
	useUser: () => mockUseUser(),
	UserProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock fetch for sign-out
globalThis.fetch = vi.fn(() =>
	Promise.resolve({ ok: true, text: () => Promise.resolve("") }),
) as unknown as typeof fetch;

function renderNavBar(roles: string[] = ["admin"], loading = false) {
	mockUseUser.mockReturnValue({
		userId: "test-user-id",
		userEmail: "test@example.com",
		userRoles: roles,
		loading,
		refresh: vi.fn(),
	});
	return render(<NavBar />);
}

describe("NavBar", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("nav items rendering", () => {
		it("renders all nav items for admin role", () => {
			renderNavBar(["admin"]);
			expect(screen.getByText("Dashboard")).toBeInTheDocument();
			expect(screen.getByText("Events")).toBeInTheDocument();
			expect(screen.getByText("Door")).toBeInTheDocument();
			expect(screen.getByText("Künstler")).toBeInTheDocument();
			expect(screen.getByText("Staff")).toBeInTheDocument();
			expect(screen.getByText("Aufgaben")).toBeInTheDocument();
			expect(screen.getByText("Guest Lists")).toBeInTheDocument();
			expect(screen.getByText("Venues")).toBeInTheDocument();
			expect(screen.getByText("Inventar")).toBeInTheDocument();
			expect(screen.getByText("Contacts")).toBeInTheDocument();
		});

		it("renders nav items for manager role", () => {
			renderNavBar(["manager"]);
			expect(screen.getByText("Dashboard")).toBeInTheDocument();
			expect(screen.getByText("Events")).toBeInTheDocument();
			expect(screen.getByText("Künstler")).toBeInTheDocument();
			expect(screen.getByText("Staff")).toBeInTheDocument();
			expect(screen.getByText("Aufgaben")).toBeInTheDocument();
			expect(screen.getByText("Venues")).toBeInTheDocument();
			expect(screen.getByText("Inventar")).toBeInTheDocument();
			expect(screen.getByText("Contacts")).toBeInTheDocument();
		});

		it("hides restricted items from unauthorized roles", () => {
			// azubi can only access dashboard
			renderNavBar(["azubi"]);
			expect(screen.getByText("Dashboard")).toBeInTheDocument();
			expect(screen.queryByText("Events")).not.toBeInTheDocument();
			expect(screen.queryByText("Door")).not.toBeInTheDocument();
			expect(screen.queryByText("Künstler")).not.toBeInTheDocument();
			expect(screen.queryByText("Staff")).not.toBeInTheDocument();
			expect(screen.queryByText("Aufgaben")).not.toBeInTheDocument();
			expect(screen.queryByText("Guest Lists")).not.toBeInTheDocument();
			expect(screen.queryByText("Venues")).not.toBeInTheDocument();
			expect(screen.queryByText("Inventar")).not.toBeInTheDocument();
			expect(screen.queryByText("Contacts")).not.toBeInTheDocument();
		});

		it("shows door item for night-management role", () => {
			renderNavBar(["night-management"]);
			expect(screen.getByText("Dashboard")).toBeInTheDocument();
			expect(screen.getByText("Events")).toBeInTheDocument();
			expect(screen.getByText("Door")).toBeInTheDocument();
			// night-management does NOT have access to artists
			expect(screen.queryByText("Künstler")).not.toBeInTheDocument();
		});

		it("shows guest lists for social-media role", () => {
			renderNavBar(["social-media"]);
			expect(screen.getByText("Dashboard")).toBeInTheDocument();
			expect(screen.getByText("Events")).toBeInTheDocument();
			expect(screen.getByText("Guest Lists")).toBeInTheDocument();
			expect(screen.queryByText("Door")).not.toBeInTheDocument();
		});

		it("shows inventory for tech role", () => {
			renderNavBar(["tech"]);
			expect(screen.getByText("Dashboard")).toBeInTheDocument();
			expect(screen.getByText("Inventar")).toBeInTheDocument();
			expect(screen.getByText("Venues")).toBeInTheDocument();
			expect(screen.queryByText("Contacts")).not.toBeInTheDocument();
		});

		it("shows contacts for backoffice role", () => {
			renderNavBar(["backoffice"]);
			expect(screen.getByText("Dashboard")).toBeInTheDocument();
			expect(screen.getByText("Contacts")).toBeInTheDocument();
		});

		it("shows all nav items during loading state (no flash)", () => {
			renderNavBar(["admin"], true);
			expect(screen.getByText("Dashboard")).toBeInTheDocument();
			expect(screen.getByText("Door")).toBeInTheDocument();
			expect(screen.getByText("Guest Lists")).toBeInTheDocument();
			expect(screen.getByText("Venues")).toBeInTheDocument();
			expect(screen.getByText("Inventar")).toBeInTheDocument();
			expect(screen.getByText("Contacts")).toBeInTheDocument();
		});

		it("shows only dashboard when user has no roles", () => {
			renderNavBar([]);
			expect(screen.getByText("Dashboard")).toBeInTheDocument();
			expect(screen.queryByText("Events")).not.toBeInTheDocument();
			expect(screen.queryByText("Door")).not.toBeInTheDocument();
		});

		it("grants access via any role in multi-role user", () => {
			// azubi alone has nothing, but azubi + booking gets booking's access
			renderNavBar(["azubi", "booking"]);
			expect(screen.getByText("Dashboard")).toBeInTheDocument();
			expect(screen.getByText("Events")).toBeInTheDocument();
			expect(screen.getByText("Künstler")).toBeInTheDocument();
		});
	});

	describe("scrollable container", () => {
		it("renders desktop nav with overflow-x-auto and scrollbar-hide", () => {
			renderNavBar(["admin"]);
			// The desktop nav container should have overflow and scrollbar-hide classes
			const navContainer = document.querySelector(".hidden.md\\:flex");
			expect(navContainer).not.toBeNull();
			expect(navContainer?.className).toContain("overflow-x-auto");
			expect(navContainer?.className).toContain("scrollbar-hide");
			expect(navContainer?.className).toContain("flex-nowrap");
		});

		it("renders gradient fade element on the right edge", () => {
			renderNavBar(["admin"]);
			const gradientEl = document.querySelector(".bg-gradient-to-l");
			expect(gradientEl).not.toBeNull();
			expect(gradientEl?.className).toContain("from-zinc-950/80");
			expect(gradientEl?.className).toContain("to-transparent");
		});

		it("nav links have whitespace-nowrap to prevent wrapping", () => {
			renderNavBar(["admin"]);
			const links = screen.getAllByRole("link");
			// Filter for NavLinks (they have whitespace-nowrap)
			const navLinks = links.filter((link) =>
				link.className.includes("whitespace-nowrap"),
			);
			expect(navLinks.length).toBeGreaterThan(0);
		});
	});

	describe("mobile sheet", () => {
		it("renders mobile hamburger button", () => {
			renderNavBar(["admin"]);
			const menuButton = screen.getByRole("button", {
				name: /open navigation menu/i,
			});
			expect(menuButton).toBeInTheDocument();
		});

		it("mobile sheet is a Sheet component", () => {
			renderNavBar(["admin"]);
			// The MobileNavLink items are rendered inside the Sheet
			// They should include all filtered nav items
			// Since MobileNavLink wraps in SheetClose, we verify by link presence
			const allLinks = screen.getAllByRole("link");
			const dashboardLink = allLinks.find((link) =>
				link.getAttribute("href") === "/",
			);
			expect(dashboardLink).toBeInTheDocument();
		});
	});

	describe("role-based filtering uses real canAccessRoute", () => {
		it("correctly filters using the real canAccessRoute function", () => {
			// This test validates that the barrier uses the real permissions logic
			// admin sees all
			renderNavBar(["admin"]);
			expect(screen.getByText("Door")).toBeInTheDocument();
			expect(screen.getByText("Guest Lists")).toBeInTheDocument();
		});

		it("awareness role sees door but not guest lists", () => {
			renderNavBar(["awareness"]);
			expect(screen.getByText("Door")).toBeInTheDocument();
			expect(screen.queryByText("Guest Lists")).not.toBeInTheDocument();
		});

		it("label role sees artists but not venues", () => {
			renderNavBar(["label"]);
			expect(screen.getByText("Künstler")).toBeInTheDocument();
			expect(screen.queryByText("Venues")).not.toBeInTheDocument();
		});
	});
});
