import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { render } from "../../test/utils";
import Header from "../Header";

// Mock fetch for analytics API
globalThis.fetch = vi.fn();

describe("Header Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders header with title and navigation", () => {
    render(<Header />);

    expect(screen.getByText("Kids")).toBeInTheDocument();
    expect(screen.getByText("Progress")).toBeInTheDocument();
    expect(screen.getByText("🏠")).toBeInTheDocument();
    expect(screen.getByText("📊")).toBeInTheDocument();
  });

  it("fetches and displays analytics data", async () => {
    const mockAnalytics = {
      totalWritings: 10,
      averageScore: 8.5,
      totalTime: 240,
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockAnalytics),
    } as Response);

    render(<Header />);

    await waitFor(() => {
      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getByText("8.5")).toBeInTheDocument();
      expect(screen.getByText("4h")).toBeInTheDocument();
    });
  });

  it("handles analytics fetch error gracefully", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("API Error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<Header />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to fetch analytics:",
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it("applies correct styling classes", () => {
    render(<Header />);

    const header = screen.getByRole("banner");
    expect(header).toHaveClass(
      "bg-gradient-to-r",
      "from-purple-500",
      "to-pink-500"
    );
  });

  it("displays time in correct format", async () => {
    const mockAnalytics = {
      totalWritings: 5,
      averageScore: 7.5,
      totalTime: 90, // 1.5 hours
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockAnalytics),
    } as Response);

    render(<Header />);

    await waitFor(() => {
      expect(screen.getByText("1.5h")).toBeInTheDocument();
    });
  });
});
