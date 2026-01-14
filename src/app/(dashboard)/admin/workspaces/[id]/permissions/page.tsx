/**
 * Workspace Permissions Page
 *
 * Allows owners and admins to manage workspace members and their roles.
 *
 * @see Story 8.3: Permissions par Workspace
 */

import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserRoleInWorkspace } from "@/features/workspaces/services/permissions.service";
import { WorkspacePermissionsClient } from "./client";

export const metadata: Metadata = {
  title: "Permissions du Workspace | PlumeNote Admin",
  description:
    "Gerez les membres et leurs permissions dans ce workspace.",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Workspace permissions management page
 *
 * Server component that:
 * - Verifies user is authenticated
 * - Verifies user has permission to manage this workspace (owner or admin)
 * - Fetches workspace details
 * - Renders the client-side permissions management UI
 */
export default async function WorkspacePermissionsPage({ params }: PageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id: workspaceId } = await params;

  // Fetch workspace with owner info
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      ownerId: true,
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
    },
  });

  if (!workspace) {
    redirect("/admin/workspaces");
  }

  // Check if user can manage this workspace
  const userRole = await getUserRoleInWorkspace(workspaceId, session.user.id);

  if (!userRole || (userRole !== "OWNER" && userRole !== "ADMIN")) {
    redirect("/admin/workspaces");
  }

  return (
    <WorkspacePermissionsClient
      workspace={workspace}
      currentUserRole={userRole}
      currentUserId={session.user.id}
    />
  );
}
