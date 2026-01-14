"use client";

/**
 * Workspace Permissions Client Component
 *
 * Client-side component for managing workspace members.
 * Handles state for dialogs and integrates with members feature.
 *
 * @see Story 8.3: Permissions par Workspace
 */

import { useState } from "react";
import Link from "next/link";
import { Plus, ArrowLeft, Crown, Shield, Edit3, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MembersList } from "@/features/workspaces/components/MembersList";
import { AddMemberDialog } from "@/features/workspaces/components/AddMemberDialog";
import { useWorkspaceMembers } from "@/features/workspaces/hooks/useWorkspaceMembers";
import type { WorkspaceRole } from "@/features/workspaces/types";

/**
 * Role labels in French
 */
const roleLabels: Record<WorkspaceRole | "OWNER", string> = {
  OWNER: "Proprietaire",
  ADMIN: "Administrateur",
  EDITOR: "Editeur",
  VIEWER: "Lecteur",
};

/**
 * Get role icon component
 */
function getRoleIcon(role: WorkspaceRole | "OWNER") {
  switch (role) {
    case "OWNER":
      return Crown;
    case "ADMIN":
      return Shield;
    case "EDITOR":
      return Edit3;
    case "VIEWER":
      return Eye;
  }
}

/**
 * Get initials from name or email
 */
function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.split(" ").filter(p => p.length > 0);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

interface WorkspacePermissionsClientProps {
  workspace: {
    id: string;
    name: string;
    ownerId: string;
    owner: {
      id: string;
      name: string | null;
      email: string;
      avatar: string | null;
    };
  };
  currentUserRole: "OWNER" | WorkspaceRole;
  currentUserId: string;
}

/**
 * Client-side workspace permissions management UI
 *
 * Provides:
 * - Back link to workspaces list
 * - Owner info card
 * - Members list with role management
 * - Add member button and dialog
 */
export function WorkspacePermissionsClient({
  workspace,
  currentUserRole,
  currentUserId,
}: WorkspacePermissionsClientProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { data: membersData } = useWorkspaceMembers(workspace.id);

  const canManage = currentUserRole === "OWNER" || currentUserRole === "ADMIN";
  const members = membersData?.data || [];
  const existingMemberIds = [workspace.ownerId, ...members.map((m) => m.userId)];

  const OwnerRoleIcon = getRoleIcon("OWNER");

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/admin/workspaces"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux workspaces
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Permissions: {workspace.name}
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerez les membres et leurs roles dans ce workspace.
        </p>
      </div>

      {/* Owner card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" />
            Proprietaire
          </CardTitle>
          <CardDescription>
            Le proprietaire a tous les droits sur ce workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                {workspace.owner.avatar && (
                  <AvatarImage
                    src={workspace.owner.avatar}
                    alt={workspace.owner.name || workspace.owner.email}
                  />
                )}
                <AvatarFallback>
                  {getInitials(workspace.owner.name, workspace.owner.email)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {workspace.owner.name || workspace.owner.email}
                </p>
                <p className="text-sm text-muted-foreground">
                  {workspace.owner.email}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1">
              <OwnerRoleIcon className="h-3 w-3" />
              {roleLabels.OWNER}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Members card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Membres</CardTitle>
            <CardDescription className="mt-1.5">
              {members.length === 0
                ? "Aucun membre invite pour le moment."
                : `${members.length} membre${members.length > 1 ? "s" : ""} dans ce workspace.`}
            </CardDescription>
          </div>
          {canManage && (
            <Button
              onClick={() => setAddDialogOpen(true)}
              data-testid="add-member-button"
            >
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un membre
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <MembersList
            workspaceId={workspace.id}
            ownerId={workspace.ownerId}
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
          />
        </CardContent>
      </Card>

      {/* Role legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Legende des roles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(["OWNER", "ADMIN", "EDITOR", "VIEWER"] as const).map((role) => {
              const Icon = getRoleIcon(role);
              const descriptions: Record<typeof role, string> = {
                OWNER: "Tous les droits, peut transferer la propriete",
                ADMIN: "Gere le workspace et les permissions",
                EDITOR: "Cree et modifie les notes",
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

      {/* Add member dialog */}
      <AddMemberDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        workspaceId={workspace.id}
        existingMemberIds={existingMemberIds}
      />
    </div>
  );
}
