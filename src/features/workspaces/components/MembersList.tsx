"use client";

/**
 * Members List Component
 *
 * Displays a list of workspace members with role management.
 * Shows avatar, name, email, role selector, and remove button.
 *
 * @see Story 8.3: Permissions par Workspace
 */

import { useState } from "react";
import { Trash2, Crown, Shield, Edit3, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWorkspaceMembers, useUpdateMemberRole, useRemoveMember } from "../hooks/useWorkspaceMembers";
import type { WorkspaceMemberWithUser, WorkspaceRole } from "../types";

/**
 * Role labels in French
 */
const roleLabels: Record<WorkspaceRole | "OWNER", string> = {
  OWNER: "Propriétaire",
  ADMIN: "Administrateur",
  EDITOR: "Éditeur",
  VIEWER: "Lecteur",
};

/**
 * Role descriptions in French
 */
const roleDescriptions: Record<WorkspaceRole, string> = {
  ADMIN: "Peut gerer le workspace et les permissions",
  EDITOR: "Peut creer et modifier les notes",
  VIEWER: "Peut uniquement consulter les notes",
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

export interface MembersListProps {
  /** Workspace ID */
  workspaceId: string;
  /** Owner's user ID (to display owner specially) */
  ownerId: string;
  /** Current user's role in workspace */
  currentUserRole: "OWNER" | WorkspaceRole;
  /** Current user's ID */
  currentUserId: string;
}

/**
 * Members list loading skeleton
 */
function MembersListSkeleton() {
  return (
    <div className="space-y-3" data-testid="members-list-skeleton">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-lg border p-4"
        >
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Single member item row
 */
function MemberItem({
  member,
  isOwner,
  canManage,
  isCurrentUser,
  onRoleChange,
  onRemove,
  isUpdating,
}: {
  member: WorkspaceMemberWithUser;
  isOwner: boolean;
  canManage: boolean;
  isCurrentUser: boolean;
  onRoleChange: (memberId: string, role: WorkspaceRole) => void;
  onRemove: (member: WorkspaceMemberWithUser) => void;
  isUpdating: boolean;
}) {
  const displayRole = isOwner ? "OWNER" : member.role;
  const RoleIcon = getRoleIcon(displayRole);

  return (
    <div
      className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
      data-testid={`member-item-${member.id}`}
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <Avatar className="h-10 w-10">
          {member.user.avatar && (
            <AvatarImage src={member.user.avatar} alt={member.user.name || member.user.email} />
          )}
          <AvatarFallback>
            {getInitials(member.user.name, member.user.email)}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">
              {member.user.name || member.user.email}
            </h3>
            {isOwner && (
              <Badge variant="secondary" className="text-xs">
                <Crown className="mr-1 h-3 w-3" />
                Propriétaire
              </Badge>
            )}
            {isCurrentUser && !isOwner && (
              <Badge variant="outline" className="text-xs">
                Vous
              </Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {member.user.email}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Role indicator for owner or read-only */}
        {isOwner ? (
          <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
            <RoleIcon className="h-4 w-4 text-muted-foreground" />
            <span>{roleLabels[displayRole]}</span>
          </div>
        ) : canManage && !isCurrentUser ? (
          /* Role selector for editable members */
          <Select
            value={member.role}
            onValueChange={(value: WorkspaceRole) => onRoleChange(member.id, value)}
            disabled={isUpdating}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <RoleIcon className="h-4 w-4" />
                  <span>{roleLabels[member.role]}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(["ADMIN", "EDITOR", "VIEWER"] as WorkspaceRole[]).map((role) => {
                const Icon = getRoleIcon(role);
                return (
                  <SelectItem key={role} value={role}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <div>
                        <div>{roleLabels[role]}</div>
                        <div className="text-xs text-muted-foreground">
                          {roleDescriptions[role]}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        ) : (
          /* Read-only role indicator */
          <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
            <RoleIcon className="h-4 w-4 text-muted-foreground" />
            <span>{roleLabels[displayRole]}</span>
          </div>
        )}

        {/* Remove button (not for owner or self) */}
        {canManage && !isOwner && !isCurrentUser && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove(member)}
                  aria-label={`Retirer ${member.user.name || member.user.email}`}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={isUpdating}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Retirer du workspace</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}

/**
 * Members list with role management
 *
 * Displays all workspace members with ability to change roles and remove members.
 * Only owners and admins can manage members.
 *
 * @example
 * ```tsx
 * <MembersList
 *   workspaceId={workspaceId}
 *   ownerId={workspace.ownerId}
 *   currentUserRole="OWNER"
 *   currentUserId={session.user.id}
 * />
 * ```
 */
export function MembersList({
  workspaceId,
  ownerId,
  currentUserRole,
  currentUserId,
}: MembersListProps) {
  const { data, isLoading, error } = useWorkspaceMembers(workspaceId);
  const updateRole = useUpdateMemberRole(workspaceId);
  const removeMember = useRemoveMember(workspaceId);

  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMemberWithUser | null>(null);

  const canManage = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  const handleRoleChange = (memberId: string, role: WorkspaceRole) => {
    updateRole.mutate({ memberId, role });
  };

  const handleRemoveClick = (member: WorkspaceMemberWithUser) => {
    setMemberToRemove(member);
  };

  const handleRemoveConfirm = () => {
    if (memberToRemove) {
      removeMember.mutate(memberToRemove.id, {
        onSuccess: () => setMemberToRemove(null),
      });
    }
  };

  if (isLoading) {
    return <MembersListSkeleton />;
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-md bg-destructive/10 p-4 text-sm text-destructive"
        data-testid="members-list-error"
      >
        Erreur lors du chargement des membres: {error.message}
      </div>
    );
  }

  const members = data?.data || [];

  if (members.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12"
        data-testid="members-list-empty"
      >
        <Shield className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">Aucun membre invite</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Invitez des utilisateurs pour collaborer
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className="space-y-3"
        role="list"
        aria-label="Liste des membres"
        data-testid="members-list"
      >
        {members.map((member) => (
          <MemberItem
            key={member.id}
            member={member}
            isOwner={member.userId === ownerId}
            canManage={canManage}
            isCurrentUser={member.userId === currentUserId}
            onRoleChange={handleRoleChange}
            onRemove={handleRemoveClick}
            isUpdating={updateRole.isPending || removeMember.isPending}
          />
        ))}
      </div>

      {/* Remove confirmation dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce membre ?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove && (
                <>
                  <strong>{memberToRemove.user.name || memberToRemove.user.email}</strong> sera retire du workspace et n&apos;aura plus acces aux notes.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMember.isPending ? "Retrait..." : "Retirer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
