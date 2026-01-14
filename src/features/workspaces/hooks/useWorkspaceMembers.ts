"use client";

/**
 * React Query hooks for workspace members
 *
 * Provides data fetching and mutations for managing workspace members.
 *
 * @see Story 8.3: Permissions par Workspace
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { WorkspaceMemberWithUser, AddMemberInput, WorkspaceRole } from "../types";
import { workspaceKeys } from "./useWorkspaces";

/**
 * Query keys for workspace members
 */
export const memberKeys = {
  all: ["workspace-members"] as const,
  list: (workspaceId: string) => ["workspace-members", "list", workspaceId] as const,
  detail: (memberId: string) => ["workspace-members", "detail", memberId] as const,
};

/**
 * Response type for members list
 */
interface MembersListResponse {
  data: WorkspaceMemberWithUser[];
}

/**
 * Response type for single member
 */
interface MemberResponse {
  data: WorkspaceMemberWithUser;
}

/**
 * Fetch members of a workspace
 */
async function fetchMembers(workspaceId: string): Promise<MembersListResponse> {
  const response = await fetch(`/api/workspaces/${workspaceId}/members`);

  if (!response.ok) {
    let errorMessage = "Failed to fetch members";
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
 * Add a member to a workspace
 */
async function addMember(
  workspaceId: string,
  data: AddMemberInput
): Promise<MemberResponse> {
  const response = await fetch(`/api/workspaces/${workspaceId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorMessage = "Failed to add member";
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
 * Update a member's role
 */
async function updateMemberRole(
  workspaceId: string,
  memberId: string,
  role: WorkspaceRole
): Promise<MemberResponse> {
  const response = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });

  if (!response.ok) {
    let errorMessage = "Failed to update member role";
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
 * Remove a member from a workspace
 */
async function removeMember(
  workspaceId: string,
  memberId: string
): Promise<void> {
  const response = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    let errorMessage = "Failed to remove member";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
}

/**
 * Options for useWorkspaceMembers hook
 */
export interface UseWorkspaceMembersOptions {
  /** Whether to fetch immediately (default: true) */
  enabled?: boolean;
}

/**
 * Hook to fetch all members of a workspace
 *
 * @param workspaceId - Workspace ID
 * @param options - Hook options
 * @returns React Query result with members list
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useWorkspaceMembers(workspaceId);
 * if (isLoading) return <Skeleton />;
 * if (error) return <Error message={error.message} />;
 * return <MembersList members={data.data} />;
 * ```
 */
export function useWorkspaceMembers(
  workspaceId: string,
  options: UseWorkspaceMembersOptions = {}
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: memberKeys.list(workspaceId),
    queryFn: () => fetchMembers(workspaceId),
    enabled: enabled && !!workspaceId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to add a member to a workspace
 *
 * @param workspaceId - Workspace ID
 * @returns Mutation for adding a member
 */
export function useAddMember(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddMemberInput) => addMember(workspaceId, data),
    onSuccess: () => {
      // Invalidate members list
      queryClient.invalidateQueries({ queryKey: memberKeys.list(workspaceId) });
      // Also invalidate workspace list in case count changed
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
}

/**
 * Hook to update a member's role
 *
 * @param workspaceId - Workspace ID
 * @returns Mutation for updating member role
 */
export function useUpdateMemberRole(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: WorkspaceRole }) =>
      updateMemberRole(workspaceId, memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(workspaceId) });
    },
  });
}

/**
 * Hook to remove a member from a workspace
 *
 * @param workspaceId - Workspace ID
 * @returns Mutation for removing a member
 */
export function useRemoveMember(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => removeMember(workspaceId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
}
