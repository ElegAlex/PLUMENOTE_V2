/**
 * Unit tests for number formatting utilities
 *
 * Tests cover:
 * - formatViewCount function for view count display
 * - Edge cases (0, 1, boundaries)
 * - Large numbers (thousands, millions)
 *
 * @see Story 10.2: Affichage du Nombre de Vues
 */

import { describe, it, expect } from "vitest";
import { formatViewCount } from "./format-number";

describe("formatViewCount", () => {
  describe("small numbers (< 1000)", () => {
    it("should return '0' for zero", () => {
      expect(formatViewCount(0)).toBe("0");
    });

    it("should return '1' for one", () => {
      expect(formatViewCount(1)).toBe("1");
    });

    it("should return exact number for small values", () => {
      expect(formatViewCount(42)).toBe("42");
      expect(formatViewCount(100)).toBe("100");
      expect(formatViewCount(500)).toBe("500");
    });

    it("should return '999' for boundary value", () => {
      expect(formatViewCount(999)).toBe("999");
    });
  });

  describe("thousands (1000 - 999999)", () => {
    it("should return '1k' for exactly 1000", () => {
      expect(formatViewCount(1000)).toBe("1k");
    });

    it("should return '1.5k' for 1500", () => {
      expect(formatViewCount(1500)).toBe("1.5k");
    });

    it("should return '2k' for 2000", () => {
      expect(formatViewCount(2000)).toBe("2k");
    });

    it("should return '10k' for 10000", () => {
      expect(formatViewCount(10000)).toBe("10k");
    });

    it("should return '10.5k' for 10500", () => {
      expect(formatViewCount(10500)).toBe("10.5k");
    });

    it("should return '100k' for 100000", () => {
      expect(formatViewCount(100000)).toBe("100k");
    });

    it("should return '999.9k' for 999900", () => {
      expect(formatViewCount(999900)).toBe("999.9k");
    });

    it("should handle 1234 correctly", () => {
      expect(formatViewCount(1234)).toBe("1.2k");
    });
  });

  describe("millions (>= 1000000)", () => {
    it("should return '1M' for exactly 1000000", () => {
      expect(formatViewCount(1000000)).toBe("1M");
    });

    it("should return '1.2M' for 1234567", () => {
      expect(formatViewCount(1234567)).toBe("1.2M");
    });

    it("should return '1.5M' for 1500000", () => {
      expect(formatViewCount(1500000)).toBe("1.5M");
    });

    it("should return '10M' for 10000000", () => {
      expect(formatViewCount(10000000)).toBe("10M");
    });

    it("should return '100M' for 100000000", () => {
      expect(formatViewCount(100000000)).toBe("100M");
    });
  });

  describe("edge cases", () => {
    it("should clamp negative numbers to 0", () => {
      expect(formatViewCount(-1)).toBe("0");
      expect(formatViewCount(-100)).toBe("0");
      expect(formatViewCount(-1500)).toBe("0");
    });

    it("should handle decimal inputs by flooring", () => {
      expect(formatViewCount(42.9)).toBe("42");
      expect(formatViewCount(1500.5)).toBe("1.5k");
    });
  });
});
