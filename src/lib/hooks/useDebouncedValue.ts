/**
 * Hook to debounce a value
 *
 * Returns the debounced version of a value that only updates
 * after the specified delay has passed without changes.
 *
 * @see Story 6.2: Command Palette et Recherche (Task 3)
 */

import { useState, useEffect } from "react";

/**
 * Debounces a value, returning the new value only after the delay has passed
 * @param value - The value to debounce
 * @param delay - The debounce delay in milliseconds
 * @returns The debounced value
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
