"use client";

/**
 * Folder Permissions Client Component
 *
 * Client-side component for managing folder permissions.
 * Shows inherited workspace permissions and folder-specific overrides.
 *
 * @see Story 8.4: Permissions par Dossier
 */

import { useState } from "react";
import Link from "next/link";
import { Plus, ArrowLeft, ChevronRight, FolderIcon, Shield, Edit3, Eye, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { FolderPermissionsList } from "@/features/notes/components/FolderPermissionsList";
import { AddFolderPermissionDialog } from "@/features/notes/components/AddFolderPermissionDialog";
import { useFolderPermissions } from "@/features/notes/hooks/useFolderPermissions";
import type { WorkspaceRole } from "@prisma/client";

/**
 * Role labels in French
 */
const roleLabels: Record<WorkspaceRole, string> = {
  ADMIN: "Administrateur",
  EDITOR: "Editeur",
  VIEWER: "Lecteur",
};

/**
 * Get role icon component
 */
function getRoleIcon(role: WorkspaceRole) {
  switch (role) {
    case "ADMIN":
      return Shield;
    case "EDITOR":
      return Edit3;
    case "VIEWER":
      return Eye;
  }
}

export interface FolderPermissionsClientProps {
  folder: {
    id: string;
    name: string;
    isPrivate: boolean;
    createdById: string;
    workspaceId: string;
    parentId: string | null;
    workspace: {
      id: string;
      name: string;
      ownerId: string;
    };
  };
  folderPath: { id: string; name: string }[];
  canManage: boolean;
  currentUserId: string;
}

/**
 * Client-side folder permissions management UI
 *
 * Provides:
 * - Breadcrumb navigation showing folder path
 * - Back link to folder
 * - Inherited workspace permissions info
 * - Folder-specific permissions list
 * - Add permission button and dialog
 * - Role legend
 */
export function FolderPermissionsClient({
  folder,
  folderPath,
  canManage,
  currentUserId,
}: FolderPermissionsClientProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { data: permissionsData } = useFolderPermissions(folder.id);

  const permissions = permissionsData?.data || [];
  const existingUserIds = permissions.map((p) => p.userId);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          href={`/folders/${folder.id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au dossier
        </Link>
      </div>

      {/* Header with breadcrumb */}
      <div className="space-y-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/workspaces/${folder.workspaceId}`}>
                {folder.workspace.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            {folderPath.map((pathItem, index) => (
              <BreadcrumbItem key={pathItem.id}>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
                {index === folderPath.length - 1 ? (
                  <BreadcrumbPage className="flex items-center gap-1.5">
                    <FolderIcon className="h-4 w-4" />
                    {pathItem.name}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={`/folders/${pathItem.id}`}>
                    {pathItem.name}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            ))}
          </BreadcrumbList>
        </Breadcrumb>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Permissions: {folder.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerez les acces specifiques a ce dossier.
          </p>
        </div>
      </div>

      {/* Inherited permissions info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            Permissions heritees
          </CardTitle>
          <CardDescription>
            Les membres du workspace &quot;{folder.workspace.name}&quot; ont
            acces selon leur role workspace, sauf si le dossier est prive.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">
            <p>
              {folder.isPrivate ? (
                <>
                  Ce dossier est <strong className="text-foreground">prive</strong>.
                  Seuls les utilisateurs avec une permission specifique peuvent y acceder.
                </>
              ) : (
                <>
                  Ce dossier est <strong className="text-foreground">public</strong>.
                  Tous les membres du workspace y ont acces selon leur role.
                  Les permissions specifiques peuvent restreindre cet acces.
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Folder-specific permissions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Permissions specifiques</CardTitle>
            <CardDescription className="mt-1.5">
              {permissions.length === 0
                ? "Aucune permission specifique definie."
                : `${permissions.length} permission${permissions.length > 1 ? "s" : ""} specifique${permissions.length > 1 ? "s" : ""}.`}
            </CardDescription>
          </div>
          {canManage && (
            <Button
              onClick={() => setAddDialogOpen(true)}
              data-testid="add-permission-button"
            >
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une permission
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <FolderPermissionsList
            folderId={folder.id}
            isPrivate={folder.isPrivate}
            canManage={canManage}
            currentUserId={currentUserId}
          />
        </CardContent>
      </Card>

      {/* Role legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Legende des roles</CardTitle>
          <CardDescription>
            Les permissions de dossier ne peuvent que restreindre, jamais etendre les droits workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {(["ADMIN", "EDITOR", "VIEWER"] as WorkspaceRole[]).map((role) => {
              const Icon = getRoleIcon(role);
              const descriptions: Record<WorkspaceRole, string> = {
                ADMIN: "Acces complet au dossier et sous-dossiers",
                EDITOR: "Cree et modifie les notes du dossier",
                VIEWER: "Consultation uniquement",
              };
              return (
                <div key={role} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{roleLabels[role]}</p>
                    <p className="text-xs text-muted-foreground">
                      {descriptions[role]}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Add permission dialog */}
      <AddFolderPermissionDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        folderId={folder.id}
        folderName={folder.name}
        existingUserIds={existingUserIds}
      />
    </div>
  );
}
