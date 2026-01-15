"use client";

/**
 * React Query hooks for folder permissions
 *
 * Provides data fetching and mutations for managing folder permissions.
 *
 * @see Story 8.4: Permissions par Dossier
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { WorkspaceRole } from "@prisma/client";
import type { FolderPermissionWithUser } from "../services/folder-permissions.service";

/**
 * Query keys for folder permissions
 */
export const folderPermissionKeys = {
  all: ["folder-permissions"] as const,
  list: (folderId: string) => ["folder-permissions", "list", folderId] as const,
  privacy: (folderId: string) => ["folder-permissions", "privacy", folderId] as const,
};

/**
 * Response type for permissions list
 */
interface PermissionsListResponse {
  data: FolderPermissionWithUser[];
}

/**
 * Response type for single permission
 */
interface PermissionResponse {
  data: FolderPermissionWithUser;
}

/**
 * Response type for privacy update
 */
interface PrivacyResponse {
  data: { id: string; isPrivate: boolean };
}

/**
 * Input type for setting folder permission
 */
interface SetFolderPermissionInput {
  userId: string;
  role: WorkspaceRole;
}

/**
 * Fetch permissions of a folder
 */
async function fetchPermissions(folderId: string): Promise<PermissionsListResponse> {
  const response = await fetch(`/api/folders/${folderId}/permissions`);

  if (!response.ok) {
    let errorMessage = "Failed to fetch permissions";
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
 * Add/set a permission on a folder
 */
async function setPermission(
  folderId: string,
  data: SetFolderPermissionInput
): Promise<PermissionResponse> {
  const response = await fetch(`/api/folders/${folderId}/permissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorMessage = "Failed to set permission";
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
 * Update a user's permission role
 */
async function updatePermissionRole(
  folderId: string,
  userId: string,
  role: WorkspaceRole
): Promise<PermissionResponse> {
  const response = await fetch(`/api/folders/${folderId}/permissions/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });

  if (!response.ok) {
    let errorMessage = "Failed to update permission role";
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
 * Remove a user's permission from a folder
 */
async function removePermission(folderId: string, userId: string): Promise<void> {
  const response = await fetch(`/api/folders/${folderId}/permissions/${userId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    let errorMessage = "Failed to remove permission";
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
 * Update folder privacy
 */
async function updatePrivacy(
  folderId: string,
  isPrivate: boolean
): Promise<PrivacyResponse> {
  const response = await fetch(`/api/folders/${folderId}/privacy`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isPrivate }),
  });

  if (!response.ok) {
    let errorMessage = "Failed to update folder privacy";
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
 * Options for useFolderPermissions hook
 */
export interface UseFolderPermissionsOptions {
  /** Whether to fetch immediately (default: true) */
  enabled?: boolean;
}

/**
 * Hook to fetch all permissions of a folder
 *
 * @param folderId - Folder ID
 * @param options - Hook options
 * @returns React Query result with permissions list
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useFolderPermissions(folderId);
 * if (isLoading) return <Skeleton />;
 * if (error) return <Error message={error.message} />;
 * return <PermissionsList permissions={data.data} />;
 * ```
 */
export function useFolderPermissions(
  folderId: string,
  options: UseFolderPermissionsOptions = {}
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: folderPermissionKeys.list(folderId),
    queryFn: () => fetchPermissions(folderId),
    enabled: enabled && !!folderId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to set a permission on a folder
 *
 * @param folderId - Folder ID
 * @returns Mutation for setting a permission
 */
export function useSetFolderPermission(folderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SetFolderPermissionInput) => setPermission(folderId, data),
    onSuccess: () => {
      // Invalidate permissions list
      queryClient.invalidateQueries({ queryKey: folderPermissionKeys.list(folderId) });
    },
  });
}

/**
 * Hook to update a user's permission role on a folder
 *
 * @param folderId - Folder ID
 * @returns Mutation for updating permission role
 */
export function useUpdateFolderPermissionRole(folderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: WorkspaceRole }) =>
      updatePermissionRole(folderId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderPermissionKeys.list(folderId) });
    },
  });
}

/**
 * Hook to remove a user's permission from a folder
 *
 * @param folderId - Folder ID
 * @returns Mutation for removing a permission
 */
export function useRemoveFolderPermission(folderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => removePermission(folderId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderPermissionKeys.list(folderId) });
    },
  });
}

/**
 * Hook to update folder privacy
 *
 * @param folderId - Folder ID
 * @returns Mutation for updating privacy
 */
export function useSetFolderPrivacy(folderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (isPrivate: boolean) => updatePrivacy(folderId, isPrivate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderPermissionKeys.privacy(folderId) });
      // Also invalidate folder list since privacy changed
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
  });
}
