/**
 * SearchBar Component Tests
 *
 * @see Story 5.6: Homepage Dynamique (AC: #4)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBar } from "./SearchBar";

// Mock useRouter
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("SearchBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render search input with placeholder", () => {
    render(<SearchBar />);

    const input = screen.getByRole("searchbox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute(
      "placeholder",
      "Rechercher une note... (Ctrl+K)"
    );
  });

  it("should render with custom placeholder", () => {
    render(<SearchBar placeholder="Custom placeholder" />);

    const input = screen.getByRole("searchbox");
    expect(input).toHaveAttribute("placeholder", "Custom placeholder");
  });

  it("should have aria-label for accessibility", () => {
    render(<SearchBar />);

    const input = screen.getByLabelText("Rechercher une note");
    expect(input).toBeInTheDocument();
  });

  it("should render Ctrl+K keyboard shortcut indicator", () => {
    render(<SearchBar />);

    expect(screen.getByText("K")).toBeInTheDocument();
  });

  it("should update value on input change", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);

    const input = screen.getByRole("searchbox");
    await user.type(input, "test search");

    expect(input).toHaveValue("test search");
  });

  it("should navigate to dashboard with search query on submit", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);

    const input = screen.getByRole("searchbox");
    await user.type(input, "my query");

    const form = input.closest("form");
    fireEvent.submit(form!);

    expect(mockPush).toHaveBeenCalledWith("/dashboard?search=my%20query");
  });

  it("should navigate to dashboard without query when empty", async () => {
    render(<SearchBar />);

    const input = screen.getByRole("searchbox");
    const form = input.closest("form");
    fireEvent.submit(form!);

    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("should trim whitespace from search query", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);

    const input = screen.getByRole("searchbox");
    await user.type(input, "  trimmed  ");

    const form = input.closest("form");
    fireEvent.submit(form!);

    expect(mockPush).toHaveBeenCalledWith("/dashboard?search=trimmed");
  });

  it("should NOT navigate on focus (allow typing first)", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);

    const input = screen.getByRole("searchbox");
    await user.click(input);

    // Should NOT navigate on focus
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("should apply custom className", () => {
    const { container } = render(<SearchBar className="custom-class" />);

    const form = container.querySelector("form");
    expect(form).toHaveClass("custom-class");
  });

  it("should render search icon", () => {
    const { container } = render(<SearchBar />);

    // Search icon from lucide-react
    const searchIcon = container.querySelector("svg");
    expect(searchIcon).toBeInTheDocument();
  });
});
