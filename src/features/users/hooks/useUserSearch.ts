"use client";

/**
 * React Query hook for searching users
 *
 * Provides debounced user search functionality.
 *
 * @see Story 8.3: Permissions par Workspace
 */

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

/**
 * User search result type
 */
export interface UserSearchResult {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
}

/**
 * Response type for user search
 */
interface UserSearchResponse {
  data: UserSearchResult[];
}

/**
 * Query keys for user search
 */
export const userSearchKeys = {
  all: ["users-search"] as const,
  search: (query: string) => ["users-search", query] as const,
};

/**
 * Fetch users matching search query
 */
async function searchUsers(query: string): Promise<UserSearchResponse> {
  const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);

  if (!response.ok) {
    let errorMessage = "Failed to search users";
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
 * Options for useUserSearch hook
 */
export interface UseUserSearchOptions {
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
  /** Minimum query length to trigger search (default: 2) */
  minLength?: number;
}

/**
 * Hook for searching users with debounce
 *
 * @param query - Search query string
 * @param options - Hook options
 * @returns React Query result with search results
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState("");
 * const { data, isLoading } = useUserSearch(query);
 *
 * return (
 *   <Input
 *     value={query}
 *     onChange={(e) => setQuery(e.target.value)}
 *     placeholder="Search users..."
 *   />
 *   {isLoading ? <Spinner /> : (
 *     <ul>
 *       {data?.data.map(user => <li key={user.id}>{user.name}</li>)}
 *     </ul>
 *   )}
 * );
 * ```
 */
export function useUserSearch(
  query: string,
  options: UseUserSearchOptions = {}
) {
  const { debounceMs = 300, minLength = 2 } = options;
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  const trimmedQuery = debouncedQuery.trim();
  const shouldSearch = trimmedQuery.length >= minLength;

  return useQuery({
    queryKey: userSearchKeys.search(trimmedQuery),
    queryFn: () => searchUsers(trimmedQuery),
    enabled: shouldSearch,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
