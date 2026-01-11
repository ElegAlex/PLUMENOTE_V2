/**
 * Folders Service
 *
 * Business logic for folder CRUD operations with ownership verification.
 * Supports hierarchical folder structure with self-referential relations.
 *
 * @see Story 5.1: Modele Folder et Structure Hierarchique
 */

import { prisma } from "@/lib/prisma";
import { NotFoundError, ForbiddenError, ConflictError } from "@/lib/api-error";
import { logger } from "@/lib/logger";
import type {
  Folder,
  FolderWithChildren,
  FolderWithNotesTree,
  FolderWithCount,
  NoteInTree,
  CreateFolderInput,
  UpdateFolderInput,
} from "../types";

/**
 * Selection fields for Folder responses
 */
const folderSelect = {
  id: true,
  name: true,
  parentId: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
} as const;

/**
 * Selection fields for Folder with counts
 */
const folderWithCountSelect = {
  ...folderSelect,
  _count: {
    select: {
      notes: true,
      children: true,
    },
  },
} as const;

/**
 * Create a new folder
 *
 * @throws {NotFoundError} If parent folder doesn't exist
 * @throws {ForbiddenError} If user doesn't own the parent folder
 * @throws {ConflictError} If folder name already exists at same level
 */
export async function createFolder(
  userId: string,
  data: CreateFolderInput
): Promise<Folder> {
  // Verify parent folder exists and belongs to user (if parentId provided)
  if (data.parentId) {
    const parent = await prisma.folder.findUnique({
      where: { id: data.parentId },
      select: { createdById: true },
    });

    if (!parent) {
      throw new NotFoundError(`Parent folder with ID '${data.parentId}' not found`);
    }

    if (parent.createdById !== userId) {
      throw new ForbiddenError("You do not have permission to use this parent folder");
    }
  }

  // Check for duplicate folder name at same level
  const existing = await prisma.folder.findFirst({
    where: {
      createdById: userId,
      name: data.name,
      parentId: data.parentId ?? null,
    },
  });

  if (existing) {
    throw new ConflictError(
      `A folder named '${data.name}' already exists ${data.parentId ? "in this folder" : "at root level"}`
    );
  }

  const folder = await prisma.folder.create({
    data: {
      name: data.name,
      parentId: data.parentId ?? null,
      createdById: userId,
    },
    select: folderSelect,
  });

  logger.info({ folderId: folder.id, userId, parentId: folder.parentId }, "Folder created");
  return folder;
}

/**
 * Get a folder by ID with ownership verification
 *
 * @throws {NotFoundError} If folder doesn't exist
 * @throws {ForbiddenError} If user doesn't own the folder
 */
export async function getFolderById(folderId: string, userId: string): Promise<Folder> {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    select: folderSelect,
  });

  if (!folder) {
    throw new NotFoundError(`Folder with ID '${folderId}' not found`);
  }

  if (folder.createdById !== userId) {
    logger.warn({ folderId, userId, ownerId: folder.createdById }, "Unauthorized folder access attempt");
    throw new ForbiddenError("You do not have permission to access this folder");
  }

  return folder;
}

/**
 * Get all folders for a user (flat list with counts)
 */
export async function getUserFolders(userId: string): Promise<FolderWithCount[]> {
  const folders = await prisma.folder.findMany({
    where: { createdById: userId },
    select: folderWithCountSelect,
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
  });

  return folders;
}

/**
 * Get folders as hierarchical tree structure
 */
export async function getUserFoldersTree(userId: string): Promise<FolderWithChildren[]> {
  const folders = await prisma.folder.findMany({
    where: { createdById: userId },
    select: folderSelect,
    orderBy: { name: "asc" },
  });

  // Build tree from flat list
  return buildFolderTree(folders);
}

/**
 * Get folders as hierarchical tree structure with notes included
 * @see Story 5.4: Sidebar et Navigation Arborescente
 */
export async function getUserFoldersTreeWithNotes(userId: string): Promise<FolderWithNotesTree[]> {
  // Fetch folders with their notes
  const folders = await prisma.folder.findMany({
    where: { createdById: userId },
    select: {
      ...folderSelect,
      notes: {
        select: {
          id: true,
          title: true,
          isFavorite: true,
          updatedAt: true,
        },
        orderBy: { title: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  // Build tree from flat list including notes
  return buildFolderTreeWithNotes(folders);
}

/**
 * Build hierarchical tree from flat folder list with notes
 */
function buildFolderTreeWithNotes(
  folders: (Folder & { notes: NoteInTree[] })[]
): FolderWithNotesTree[] {
  const folderMap = new Map<string, FolderWithNotesTree>();
  const roots: FolderWithNotesTree[] = [];

  // First pass: create all folder objects with empty children
  for (const folder of folders) {
    folderMap.set(folder.id, {
      ...folder,
      children: [],
      notes: folder.notes,
    });
  }

  // Second pass: build hierarchy
  for (const folder of folders) {
    const folderWithNotes = folderMap.get(folder.id)!;

    if (folder.parentId === null) {
      roots.push(folderWithNotes);
    } else {
      const parent = folderMap.get(folder.parentId);
      if (parent) {
        parent.children.push(folderWithNotes);
      } else {
        // Parent not found (shouldn't happen with proper constraints)
        roots.push(folderWithNotes);
      }
    }
  }

  // Sort children recursively
  const sortChildren = (items: FolderWithNotesTree[]): void => {
    items.sort((a, b) => a.name.localeCompare(b.name));
    for (const item of items) {
      sortChildren(item.children);
    }
  };
  sortChildren(roots);

  return roots;
}

/**
 * Build hierarchical tree from flat folder list
 */
function buildFolderTree(folders: Folder[]): FolderWithChildren[] {
  const folderMap = new Map<string, FolderWithChildren>();
  const roots: FolderWithChildren[] = [];

  // First pass: create all folder objects with empty children
  for (const folder of folders) {
    folderMap.set(folder.id, { ...folder, children: [] });
  }

  // Second pass: build hierarchy
  for (const folder of folders) {
    const folderWithChildren = folderMap.get(folder.id)!;

    if (folder.parentId === null) {
      roots.push(folderWithChildren);
    } else {
      const parent = folderMap.get(folder.parentId);
      if (parent) {
        parent.children.push(folderWithChildren);
      } else {
        // Parent not found (shouldn't happen with proper constraints)
        roots.push(folderWithChildren);
      }
    }
  }

  // Sort children recursively
  const sortChildren = (items: FolderWithChildren[]): void => {
    items.sort((a, b) => a.name.localeCompare(b.name));
    for (const item of items) {
      sortChildren(item.children);
    }
  };
  sortChildren(roots);

  return roots;
}

/**
 * Update a folder with ownership verification
 *
 * @throws {NotFoundError} If folder doesn't exist
 * @throws {ForbiddenError} If user doesn't own the folder
 * @throws {ConflictError} If new name already exists at target level
 * @throws {ConflictError} If trying to move folder into itself or its descendants
 */
export async function updateFolder(
  folderId: string,
  userId: string,
  data: UpdateFolderInput
): Promise<Folder> {
  // Verify ownership
  const existing = await prisma.folder.findUnique({
    where: { id: folderId },
    select: { createdById: true, name: true, parentId: true },
  });

  if (!existing) {
    throw new NotFoundError(`Folder with ID '${folderId}' not found`);
  }

  if (existing.createdById !== userId) {
    throw new ForbiddenError("You do not have permission to update this folder");
  }

  // Determine target parentId (use existing if not changing)
  const targetParentId = data.parentId !== undefined ? data.parentId : existing.parentId;
  const targetName = data.name ?? existing.name;

  // Validate parent change if parentId is being updated
  if (data.parentId !== undefined && data.parentId !== existing.parentId) {
    // Cannot be own parent
    if (data.parentId === folderId) {
      throw new ConflictError("A folder cannot be its own parent");
    }

    // Verify new parent exists and belongs to user
    if (data.parentId !== null) {
      const newParent = await prisma.folder.findUnique({
        where: { id: data.parentId },
        select: { createdById: true },
      });

      if (!newParent) {
        throw new NotFoundError(`Parent folder with ID '${data.parentId}' not found`);
      }

      if (newParent.createdById !== userId) {
        throw new ForbiddenError("You do not have permission to use this parent folder");
      }

      // Check for circular reference (cannot move into own descendants)
      const isDescendant = await checkIsDescendant(folderId, data.parentId, userId);
      if (isDescendant) {
        throw new ConflictError("Cannot move folder into its own descendant");
      }
    }
  }

  // Check for duplicate name at target level (only if name or parent changes)
  if (data.name !== undefined || data.parentId !== undefined) {
    const duplicate = await prisma.folder.findFirst({
      where: {
        createdById: userId,
        name: targetName,
        parentId: targetParentId,
        NOT: { id: folderId },
      },
    });

    if (duplicate) {
      throw new ConflictError(
        `A folder named '${targetName}' already exists ${targetParentId ? "in this folder" : "at root level"}`
      );
    }
  }

  const folder = await prisma.folder.update({
    where: { id: folderId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.parentId !== undefined && { parentId: data.parentId }),
    },
    select: folderSelect,
  });

  logger.info({ folderId, userId, updates: Object.keys(data) }, "Folder updated");
  return folder;
}

/**
 * Check if targetId is a descendant of folderId
 */
async function checkIsDescendant(
  folderId: string,
  targetId: string,
  userId: string
): Promise<boolean> {
  let currentId: string | null = targetId;

  while (currentId) {
    if (currentId === folderId) {
      return true;
    }

    const folderResult: { parentId: string | null; createdById: string } | null =
      await prisma.folder.findUnique({
        where: { id: currentId },
        select: { parentId: true, createdById: true },
      });

    if (!folderResult || folderResult.createdById !== userId) {
      break;
    }

    currentId = folderResult.parentId;
  }

  return false;
}

/**
 * Delete a folder with cascade logic
 *
 * When a folder is deleted:
 * 1. All notes in the folder are moved to the parent folder (or root if no parent)
 * 2. All child folders are moved to the parent folder (or root if no parent)
 * 3. The folder itself is deleted
 *
 * @throws {NotFoundError} If folder doesn't exist
 * @throws {ForbiddenError} If user doesn't own the folder
 */
export async function deleteFolder(folderId: string, userId: string): Promise<void> {
  // Verify ownership
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    select: { createdById: true, parentId: true },
  });

  if (!folder) {
    throw new NotFoundError(`Folder with ID '${folderId}' not found`);
  }

  if (folder.createdById !== userId) {
    throw new ForbiddenError("You do not have permission to delete this folder");
  }

  // Execute cascade in transaction
  await prisma.$transaction([
    // Move all notes to parent folder (or root)
    prisma.note.updateMany({
      where: { folderId: folderId },
      data: { folderId: folder.parentId },
    }),
    // Move all child folders to parent folder (or root)
    prisma.folder.updateMany({
      where: { parentId: folderId },
      data: { parentId: folder.parentId },
    }),
    // Delete the folder
    prisma.folder.delete({
      where: { id: folderId },
    }),
  ]);

  logger.info(
    { folderId, userId, movedToParent: folder.parentId ?? "root" },
    "Folder deleted with contents moved to parent"
  );
}

/**
 * Get folder path (breadcrumb) from root to given folder
 */
export async function getFolderPath(folderId: string, userId: string): Promise<Folder[]> {
  const path: Folder[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const folderResult: Folder | null = await prisma.folder.findUnique({
      where: { id: currentId },
      select: folderSelect,
    });

    if (!folderResult) {
      break;
    }

    if (folderResult.createdById !== userId) {
      throw new ForbiddenError("You do not have permission to access this folder");
    }

    path.unshift(folderResult);
    currentId = folderResult.parentId;
  }

  return path;
}
