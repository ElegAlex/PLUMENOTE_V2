/**
 * Folder utility functions
 *
 * Shared helpers for working with folder trees.
 *
 * @see Story 5.3: Déplacement de Notes dans les Dossiers
 */

import type { FolderWithChildren } from "../types";

/**
 * Find a folder by ID in a tree structure
 *
 * @param folders - Array of folders with children
 * @param id - Folder ID to find
 * @returns The folder if found, undefined otherwise
 */
export function findFolderById(
  folders: FolderWithChildren[],
  id: string
): FolderWithChildren | undefined {
  for (const folder of folders) {
    if (folder.id === id) return folder;
    if (folder.children && folder.children.length > 0) {
      const found = findFolderById(folder.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Find folder name by ID in a tree structure
 *
 * @param folders - Array of folders with children
 * @param id - Folder ID to find
 * @param fallback - Fallback name if not found (default: "dossier")
 * @returns The folder name if found, fallback otherwise
 */
export function findFolderNameById(
  folders: FolderWithChildren[],
  id: string,
  fallback: string = "dossier"
): string {
  const folder = findFolderById(folders, id);
  return folder?.name ?? fallback;
}

/**
 * Flatten folder tree for display (with depth indicator)
 */
export interface FlatFolder {
  id: string;
  name: string;
  depth: number;
}

/**
 * Flatten a folder tree into a flat array with depth information
 *
 * @param folders - Array of folders with children
 * @param depth - Current depth (default: 0)
 * @returns Flat array of folders with depth
 */
export function flattenFolders(
  folders: FolderWithChildren[],
  depth: number = 0
): FlatFolder[] {
  const result: FlatFolder[] = [];
  for (const folder of folders) {
    result.push({ id: folder.id, name: folder.name, depth });
    if (folder.children && folder.children.length > 0) {
      result.push(...flattenFolders(folder.children, depth + 1));
    }
  }
  return result;
}
