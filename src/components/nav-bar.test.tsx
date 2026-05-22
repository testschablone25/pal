import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NavBar } from "./nav-bar";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock the user context
vi.mock("@/lib/user-context", () => ({
  useUser: () => ({
    userRoles: ["admin"],
    loading: false,
  }),
}));

// Mock the i18n hook
vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

describe("NavBar", () => {
  it("renders the PAL logo", () => {
    render(<NavBar />);
    expect(screen.getByText("PAL")).toBeDefined();
  });

  it("renders dashboard link", () => {
    render(<NavBar />);
    expect(screen.getByText("Dashboard")).toBeDefined();
  });

  it("renders new nav items (Venues, Inventory, Contacts)", () => {
    render(<NavBar />);
    expect(screen.getByText("Venues")).toBeDefined();
    expect(screen.getByText("Inventar")).toBeDefined();
    expect(screen.getByText("Contacts")).toBeDefined();
  });

  it("renders language toggle", () => {
    render(<NavBar />);
    // LanguageToggle renders two buttons for DE/EN
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });
});
