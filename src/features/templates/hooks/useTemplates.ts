"use client";

/**
 * React Query hook for templates list
 *
 * Provides data fetching for available templates.
 *
 * @see Story 7.2: Creation de Note depuis Template
 */

import { useQuery } from "@tanstack/react-query";
import type { TemplatesListResponse } from "../types";

/**
 * Query keys for templates
 */
export const templateKeys = {
  all: ["templates"] as const,
  list: () => ["templates", "list"] as const,
  detail: (id: string) => ["templates", "detail", id] as const,
};

/**
 * Options for useTemplates hook
 */
export interface UseTemplatesOptions {
  /** Whether to fetch immediately (default: true) */
  enabled?: boolean;
}

/**
 * Fetch templates from API
 */
async function fetchTemplates(): Promise<TemplatesListResponse> {
  const response = await fetch("/api/templates");

  if (!response.ok) {
    let errorMessage = "Failed to fetch templates";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Hook to fetch all available templates
 *
 * @param options - Hook options
 * @returns React Query result with templates list
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useTemplates();
 * if (isLoading) return <Spinner />;
 * if (error) return <Error message={error.message} />;
 * return <TemplateList templates={data.data} />;
 * ```
 */
export function useTemplates(options: UseTemplatesOptions = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: templateKeys.list(),
    queryFn: fetchTemplates,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - templates don't change frequently
  });
}
