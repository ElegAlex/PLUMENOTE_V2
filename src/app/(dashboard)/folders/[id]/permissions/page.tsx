/**
 * Folder Permissions Page
 *
 * Allows owners and admins to manage folder permissions and privacy.
 *
 * @see Story 8.4: Permissions par Dossier
 */

import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageFolder } from "@/features/workspaces/services/permissions.service";
import { FolderPermissionsClient } from "./client";

export const metadata: Metadata = {
  title: "Permissions du Dossier | PlumeNote",
  description: "Gerez les permissions et la confidentialite de ce dossier.",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Folder permissions management page
 *
 * Server component that:
 * - Verifies user is authenticated
 * - Verifies user has permission to manage this folder
 * - Fetches folder details with path
 * - Renders the client-side permissions management UI
 */
export default async function FolderPermissionsPage({ params }: PageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id: folderId } = await params;

  // Fetch folder with workspace and path info
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    select: {
      id: true,
      name: true,
      isPrivate: true,
      createdById: true,
      workspaceId: true,
      parentId: true,
      workspace: {
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      },
    },
  });

  if (!folder) {
    redirect("/dashboard");
  }

  // Only workspace folders have permissions page
  // Personal folders don't need folder-level permissions
  if (!folder.workspaceId || !folder.workspace) {
    redirect("/dashboard");
  }

  // Check if user can manage this folder
  const canManage = await canManageFolder(session.user.id, folderId);

  if (!canManage) {
    redirect("/dashboard");
  }

  // Build folder path for breadcrumb
  const folderPath: { id: string; name: string }[] = [];
  let currentFolderId: string | null = folderId;

  while (currentFolderId) {
    const pathFolder: { id: string; name: string; parentId: string | null } | null =
      await prisma.folder.findUnique({
        where: { id: currentFolderId },
        select: { id: true, name: true, parentId: true },
      });

    if (!pathFolder) break;

    folderPath.unshift({ id: pathFolder.id, name: pathFolder.name });
    currentFolderId = pathFolder.parentId;
  }

  // Create folder object with guaranteed non-null workspace
  const folderWithWorkspace = {
    id: folder.id,
    name: folder.name,
    isPrivate: folder.isPrivate,
    createdById: folder.createdById,
    workspaceId: folder.workspaceId,
    parentId: folder.parentId,
    workspace: folder.workspace,
  };

  return (
    <FolderPermissionsClient
      folder={folderWithWorkspace}
      folderPath={folderPath}
      canManage={canManage}
      currentUserId={session.user.id}
    />
  );
}
