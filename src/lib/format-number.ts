/**
 * Number formatting utilities
 *
 * @see Story 10.2: Affichage du Nombre de Vues
 */

/**
 * Format a view count for human-readable display
 *
 * Rules:
 * - < 1000: exact number (e.g., "42", "999")
 * - >= 1000 and < 1M: Xk or X.Xk (e.g., "1k", "1.5k", "999.9k")
 * - >= 1M: XM or X.XM (e.g., "1M", "1.2M")
 *
 * @param count - The view count to format
 * @returns Formatted string for display
 *
 * @example
 * formatViewCount(42)       // "42"
 * formatViewCount(1500)     // "1.5k"
 * formatViewCount(1234567)  // "1.2M"
 */
export function formatViewCount(count: number): string {
  // Handle negative numbers and decimals
  const value = Math.max(0, Math.floor(count));

  if (value < 1000) {
    return value.toString();
  }

  if (value < 1_000_000) {
    const thousands = value / 1000;
    // Check if it's a whole number
    if (thousands % 1 === 0) {
      return `${thousands}k`;
    }
    // Round to 1 decimal place
    const rounded = Math.round(thousands * 10) / 10;
    // If rounding results in whole number, show without decimal
    if (rounded % 1 === 0) {
      return `${rounded}k`;
    }
    return `${rounded.toFixed(1)}k`;
  }

  const millions = value / 1_000_000;
  // Check if it's a whole number
  if (millions % 1 === 0) {
    return `${millions}M`;
  }
  // Round to 1 decimal place
  const rounded = Math.round(millions * 10) / 10;
  // If rounding results in whole number, show without decimal
  if (rounded % 1 === 0) {
    return `${rounded}M`;
  }
  return `${rounded.toFixed(1)}M`;
}
