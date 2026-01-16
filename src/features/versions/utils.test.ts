/**
 * Tests for versions utility functions
 *
 * @see Story 9.2: Affichage de l'Historique des Versions
 */

import { describe, it, expect } from "vitest";
import { getInitials } from "./utils";

describe("getInitials", () => {
  it("should return initials for two-word name", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("should return initials for multi-word name", () => {
    expect(getInitials("John Michael Doe")).toBe("JD");
  });

  it("should return single initial for single-word name", () => {
    expect(getInitials("John")).toBe("J");
  });

  it("should return ? for null name", () => {
    expect(getInitials(null)).toBe("?");
  });

  it("should return ? for empty string", () => {
    expect(getInitials("")).toBe("?");
  });

  it("should handle whitespace-only name", () => {
    expect(getInitials("   ")).toBe("?");
  });

  it("should handle leading/trailing whitespace", () => {
    expect(getInitials("  John Doe  ")).toBe("JD");
  });

  it("should handle multiple spaces between words", () => {
    expect(getInitials("John    Doe")).toBe("JD");
  });

  it("should uppercase lowercase initials", () => {
    expect(getInitials("john doe")).toBe("JD");
  });

  it("should handle mixed case names", () => {
    expect(getInitials("jOHN dOE")).toBe("JD");
  });

  it("should handle names with special characters", () => {
    expect(getInitials("Jean-Pierre Dupont")).toBe("JD");
  });

  it("should handle single character name", () => {
    expect(getInitials("J")).toBe("J");
  });
});
