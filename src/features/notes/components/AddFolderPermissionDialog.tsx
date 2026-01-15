"use client";

/**
 * Add Folder Permission Dialog Component
 *
 * Modal dialog for adding a permission to a folder.
 * Features user search with autocomplete and role selection.
 *
 * @see Story 8.4: Permissions par Dossier
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Search, Shield, Edit3, Eye, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUserSearch, type UserSearchResult } from "@/features/users/hooks/useUserSearch";
import { useSetFolderPermission } from "../hooks/useFolderPermissions";
import type { WorkspaceRole } from "@prisma/client";

/**
 * Role labels in French
 */
const roleLabels: Record<WorkspaceRole, string> = {
  ADMIN: "Administrateur",
  EDITOR: "Éditeur",
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

export interface AddFolderPermissionDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Folder ID to add permission to */
  folderId: string;
  /** Folder name (for display) */
  folderName: string;
  /** List of existing permission user IDs to exclude from search */
  existingUserIds: string[];
}

/**
 * Add folder permission dialog with user search and role selection
 *
 * Opens a modal with user search autocomplete and role picker.
 * Handles adding permission with toast notifications.
 *
 * @example
 * ```tsx
 * <AddFolderPermissionDialog
 *   open={dialogOpen}
 *   onOpenChange={setDialogOpen}
 *   folderId={folderId}
 *   folderName={folder.name}
 *   existingUserIds={permissions.map(p => p.userId)}
 * />
 * ```
 */
export function AddFolderPermissionDialog({
  open,
  onOpenChange,
  folderId,
  folderName,
  existingUserIds,
}: AddFolderPermissionDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [selectedRole, setSelectedRole] = useState<WorkspaceRole>("VIEWER");
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: searchResults, isLoading: isSearching } = useUserSearch(searchQuery);
  const setPermission = useSetFolderPermission(folderId);

  // Filter out existing permission holders from search results
  const filteredResults = (searchResults?.data || []).filter(
    (user) => !existingUserIds.includes(user.id)
  );

  const handleSelectUser = useCallback((user: UserSearchResult) => {
    setSelectedUser(user);
    setSearchQuery("");
    setSearchOpen(false);
  }, []);

  const handleClearUser = useCallback(() => {
    setSelectedUser(null);
  }, []);

  const handleSubmit = async () => {
    if (!selectedUser) return;

    try {
      await setPermission.mutateAsync({
        userId: selectedUser.id,
        role: selectedRole,
      });
      toast.success(
        `${selectedUser.name || selectedUser.email} a maintenant acces au dossier "${folderName}"`
      );
      handleClose();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erreur lors de l'ajout de la permission";
      toast.error(message);
    }
  };

  const handleClose = () => {
    setSearchQuery("");
    setSelectedUser(null);
    setSelectedRole("VIEWER");
    setSearchOpen(false);
    onOpenChange(false);
  };

  const RoleIcon = getRoleIcon(selectedRole);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" data-testid="add-permission-dialog">
        <DialogHeader>
          <DialogTitle>Ajouter une permission</DialogTitle>
          <DialogDescription>
            Recherchez un utilisateur et attribuez-lui un acces au dossier &quot;{folderName}&quot;.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User search */}
          <div className="space-y-2">
            <Label htmlFor="user-search">Utilisateur</Label>
            {selectedUser ? (
              <div className="flex items-center justify-between rounded-md border bg-muted/50 p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    {selectedUser.avatar && (
                      <AvatarImage
                        src={selectedUser.avatar}
                        alt={selectedUser.name || selectedUser.email}
                      />
                    )}
                    <AvatarFallback>
                      {getInitials(selectedUser.name, selectedUser.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {selectedUser.name || selectedUser.email}
                    </p>
                    {selectedUser.name && (
                      <p className="text-xs text-muted-foreground">
                        {selectedUser.email}
                      </p>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleClearUser}>
                  Changer
                </Button>
              </div>
            ) : (
              <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                <PopoverTrigger asChild>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="user-search"
                      placeholder="Rechercher par nom ou email..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (e.target.value.length >= 2) {
                          setSearchOpen(true);
                        }
                      }}
                      onFocus={() => {
                        if (searchQuery.length >= 2) {
                          setSearchOpen(true);
                        }
                      }}
                      className="pl-9"
                      autoComplete="off"
                    />
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[--radix-popover-trigger-width] p-0"
                  align="start"
                >
                  <Command>
                    <CommandList>
                      {isSearching ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          <span className="ml-2 text-sm text-muted-foreground">
                            Recherche...
                          </span>
                        </div>
                      ) : filteredResults.length === 0 ? (
                        <CommandEmpty>
                          {searchQuery.length < 2
                            ? "Tapez au moins 2 caracteres"
                            : "Aucun utilisateur trouve"}
                        </CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {filteredResults.map((user) => (
                            <CommandItem
                              key={user.id}
                              value={user.email}
                              onSelect={() => handleSelectUser(user)}
                              className="cursor-pointer"
                            >
                              <Avatar className="h-8 w-8">
                                {user.avatar && (
                                  <AvatarImage
                                    src={user.avatar}
                                    alt={user.name || user.email}
                                  />
                                )}
                                <AvatarFallback>
                                  {getInitials(user.name, user.email)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="ml-2 flex-1">
                                <p className="text-sm font-medium">
                                  {user.name || user.email}
                                </p>
                                {user.name && (
                                  <p className="text-xs text-muted-foreground">
                                    {user.email}
                                  </p>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Role selection */}
          <div className="space-y-2">
            <Label htmlFor="role-select">Role</Label>
            <Select
              value={selectedRole}
              onValueChange={(value: WorkspaceRole) => setSelectedRole(value)}
            >
              <SelectTrigger id="role-select" className="w-full">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <RoleIcon className="h-4 w-4" />
                    <span>{roleLabels[selectedRole]}</span>
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
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedUser || setPermission.isPending}
          >
            {setPermission.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ajout...
              </>
            ) : (
              "Ajouter"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
