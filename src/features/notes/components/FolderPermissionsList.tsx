"use client";

/**
 * Folder Permissions List Component
 *
 * Displays a list of folder permissions with role management.
 * Shows avatar, name, email, role selector, and remove button.
 * Includes a toggle for folder privacy.
 *
 * @see Story 8.4: Permissions par Dossier
 */

import { useState } from "react";
import { Trash2, Shield, Edit3, Eye, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import {
  useFolderPermissions,
  useUpdateFolderPermissionRole,
  useRemoveFolderPermission,
  useSetFolderPrivacy,
} from "../hooks/useFolderPermissions";
import type { FolderPermissionWithUser } from "../services/folder-permissions.service";
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
 * Role descriptions in French
 */
const roleDescriptions: Record<WorkspaceRole, string> = {
  ADMIN: "Acces complet au dossier",
  EDITOR: "Peut creer et modifier les notes",
  VIEWER: "Peut uniquement consulter les notes",
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

/**
 * Get initials from name or email
 */
function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.split(" ").filter((p) => p.length > 0);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

export interface FolderPermissionsListProps {
  /** Folder ID */
  folderId: string;
  /** Whether the folder is currently private */
  isPrivate: boolean;
  /** Whether current user can manage permissions */
  canManage: boolean;
  /** Current user's ID */
  currentUserId: string;
}

/**
 * Permissions list loading skeleton
 */
function PermissionsListSkeleton() {
  return (
    <div className="space-y-3" data-testid="permissions-list-skeleton">
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
 * Single permission item row
 */
function PermissionItem({
  permission,
  canManage,
  isCurrentUser,
  onRoleChange,
  onRemove,
  isUpdating,
}: {
  permission: FolderPermissionWithUser;
  canManage: boolean;
  isCurrentUser: boolean;
  onRoleChange: (userId: string, role: WorkspaceRole) => void;
  onRemove: (permission: FolderPermissionWithUser) => void;
  isUpdating: boolean;
}) {
  const RoleIcon = getRoleIcon(permission.role);

  return (
    <div
      className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
      data-testid={`permission-item-${permission.id}`}
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <Avatar className="h-10 w-10">
          {permission.user.avatar && (
            <AvatarImage
              src={permission.user.avatar}
              alt={permission.user.name || permission.user.email}
            />
          )}
          <AvatarFallback>
            {getInitials(permission.user.name, permission.user.email)}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">
              {permission.user.name || permission.user.email}
            </h3>
            {isCurrentUser && (
              <Badge variant="outline" className="text-xs">
                Vous
              </Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {permission.user.email}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {canManage && !isCurrentUser ? (
          /* Role selector for editable permissions */
          <Select
            value={permission.role}
            onValueChange={(value: WorkspaceRole) =>
              onRoleChange(permission.userId, value)
            }
            disabled={isUpdating}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <RoleIcon className="h-4 w-4" />
                  <span>{roleLabels[permission.role]}</span>
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
            <span>{roleLabels[permission.role]}</span>
          </div>
        )}

        {/* Remove button (not for self) */}
        {canManage && !isCurrentUser && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove(permission)}
                  aria-label={`Retirer ${permission.user.name || permission.user.email}`}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={isUpdating}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Retirer la permission</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}

/**
 * Folder permissions list with role management
 *
 * Displays all folder permissions with ability to change roles and remove.
 * Includes a toggle for folder privacy (isPrivate).
 *
 * @example
 * ```tsx
 * <FolderPermissionsList
 *   folderId={folderId}
 *   isPrivate={folder.isPrivate}
 *   canManage={true}
 *   currentUserId={session.user.id}
 * />
 * ```
 */
export function FolderPermissionsList({
  folderId,
  isPrivate,
  canManage,
  currentUserId,
}: FolderPermissionsListProps) {
  const { data, isLoading, error } = useFolderPermissions(folderId);
  const updateRole = useUpdateFolderPermissionRole(folderId);
  const removePermission = useRemoveFolderPermission(folderId);
  const setPrivacy = useSetFolderPrivacy(folderId);

  const [permissionToRemove, setPermissionToRemove] =
    useState<FolderPermissionWithUser | null>(null);

  const handleRoleChange = (userId: string, role: WorkspaceRole) => {
    updateRole.mutate({ userId, role });
  };

  const handleRemoveClick = (permission: FolderPermissionWithUser) => {
    setPermissionToRemove(permission);
  };

  const handleRemoveConfirm = () => {
    if (permissionToRemove) {
      removePermission.mutate(permissionToRemove.userId, {
        onSuccess: () => setPermissionToRemove(null),
      });
    }
  };

  const handlePrivacyChange = (checked: boolean) => {
    setPrivacy.mutate(checked);
  };

  if (isLoading) {
    return <PermissionsListSkeleton />;
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-md bg-destructive/10 p-4 text-sm text-destructive"
        data-testid="permissions-list-error"
      >
        Erreur lors du chargement des permissions: {error.message}
      </div>
    );
  }

  const permissions = data?.data || [];

  return (
    <>
      {/* Privacy toggle */}
      <div className="mb-6 flex items-center justify-between rounded-lg border bg-card p-4">
        <div className="flex items-center gap-3">
          {isPrivate ? (
            <Lock className="h-5 w-5 text-amber-500" />
          ) : (
            <Unlock className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <Label htmlFor="private-toggle" className="text-base font-medium">
              Dossier prive
            </Label>
            <p className="text-sm text-muted-foreground">
              {isPrivate
                ? "Seuls les utilisateurs avec permission peuvent acceder"
                : "Accessible a tous les membres du workspace"}
            </p>
          </div>
        </div>
        <Switch
          id="private-toggle"
          checked={isPrivate}
          onCheckedChange={handlePrivacyChange}
          disabled={!canManage || setPrivacy.isPending}
          aria-label="Basculer dossier prive"
        />
      </div>

      {/* Permissions list */}
      {permissions.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12"
          data-testid="permissions-list-empty"
        >
          <Shield className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">
            Aucune permission specifique
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isPrivate
              ? "Ajoutez des permissions pour autoriser l'acces"
              : "Ce dossier herite des permissions du workspace"}
          </p>
        </div>
      ) : (
        <div
          className="space-y-3"
          role="list"
          aria-label="Liste des permissions"
          data-testid="permissions-list"
        >
          {permissions.map((permission) => (
            <PermissionItem
              key={permission.id}
              permission={permission}
              canManage={canManage}
              isCurrentUser={permission.userId === currentUserId}
              onRoleChange={handleRoleChange}
              onRemove={handleRemoveClick}
              isUpdating={
                updateRole.isPending || removePermission.isPending
              }
            />
          ))}
        </div>
      )}

      {/* Remove confirmation dialog */}
      <AlertDialog
        open={!!permissionToRemove}
        onOpenChange={() => setPermissionToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer cette permission ?</AlertDialogTitle>
            <AlertDialogDescription>
              {permissionToRemove && (
                <>
                  <strong>
                    {permissionToRemove.user.name ||
                      permissionToRemove.user.email}
                  </strong>{" "}
                  n&apos;aura plus acces specifique a ce dossier.
                  {isPrivate && (
                    <>
                      {" "}
                      Comme le dossier est prive, il ne pourra plus y acceder.
                    </>
                  )}
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
              {removePermission.isPending ? "Retrait..." : "Retirer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
