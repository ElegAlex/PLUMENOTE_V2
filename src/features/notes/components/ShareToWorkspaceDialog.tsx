"use client";

/**
 * Share To Workspace Dialog Component
 *
 * Modal dialog for sharing (copying) a note from personal workspace
 * to a team workspace. The original note remains unchanged.
 *
 * @see Story 8.6: Partage vers Espace Équipe
 */

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Share2, AlertCircle, Loader2, FolderOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWritableWorkspaces } from "@/features/workspaces/hooks/useWritableWorkspaces";
import { useFoldersInWorkspace } from "@/features/workspaces/hooks/useFoldersInWorkspace";
import { useShareNote } from "../hooks/useShareNote";

/**
 * Props for ShareToWorkspaceDialog
 */
export interface ShareToWorkspaceDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** ID of the note to share */
  noteId: string;
  /** Title of the note (for display) */
  noteTitle: string;
  /** Optional callback after successful share */
  onSuccess?: (workspaceName: string) => void;
}

/**
 * Dialog for sharing a note from personal workspace to a team workspace
 *
 * Features:
 * - Lists only team workspaces where user can write (OWNER, ADMIN, EDITOR)
 * - Optional folder selection within the selected workspace
 * - Empty state when no team workspaces available
 * - Loading states for workspace and folder fetching
 *
 * @example
 * ```tsx
 * <ShareToWorkspaceDialog
 *   open={shareDialogOpen}
 *   onOpenChange={setShareDialogOpen}
 *   noteId={noteToShare.id}
 *   noteTitle={noteToShare.title}
 *   onSuccess={(name) => toast.success(`Note partagée vers ${name}`)}
 * />
 * ```
 */
export function ShareToWorkspaceDialog({
  open,
  onOpenChange,
  noteId,
  noteTitle,
  onSuccess,
}: ShareToWorkspaceDialogProps) {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");

  // Fetch writable workspaces
  const { workspaces, isLoading: isLoadingWorkspaces } = useWritableWorkspaces({
    enabled: open,
  });

  // Fetch folders in selected workspace
  const { folders, isLoading: isLoadingFolders } = useFoldersInWorkspace(
    selectedWorkspaceId || undefined,
    { enabled: open && !!selectedWorkspaceId }
  );

  // Share mutation
  const { shareNote, isSharing } = useShareNote();

  // Reset selection when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedWorkspaceId("");
      setSelectedFolderId("");
    }
  }, [open]);

  // Handle share action
  const handleShare = () => {
    if (!selectedWorkspaceId) return;

    const targetWorkspace = workspaces?.find((ws) => ws.id === selectedWorkspaceId);

    shareNote(
      {
        sourceNoteId: noteId,
        targetWorkspaceId: selectedWorkspaceId,
        targetFolderId: selectedFolderId && selectedFolderId !== "root" ? selectedFolderId : undefined,
      },
      {
        onSuccess: () => {
          if (onSuccess && targetWorkspace) {
            onSuccess(targetWorkspace.name);
          } else {
            toast.success(`Note partagée vers ${targetWorkspace?.name || "l'espace équipe"}`);
          }
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error("Erreur lors du partage", {
            description: error.message,
          });
        },
      }
    );
  };

  // Check if there are no writable workspaces
  const hasNoWorkspaces = !isLoadingWorkspaces && (!workspaces || workspaces.length === 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Partager vers un espace équipe
          </DialogTitle>
          <DialogDescription>
            Partager &quot;{noteTitle}&quot; vers un espace de travail.
            <br />
            <span className="text-muted-foreground/80">
              Une copie sera créée - la note originale restera dans votre espace personnel.
            </span>
          </DialogDescription>
        </DialogHeader>

        {hasNoWorkspaces ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">Aucun espace équipe disponible</p>
              <p className="text-sm text-muted-foreground mt-1">
                Contactez un administrateur pour rejoindre un espace de travail
                avec droits d&apos;écriture.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            {/* Workspace selection */}
            <div className="grid gap-2">
              <Label htmlFor="workspace-select">Espace de travail</Label>
              <Select
                value={selectedWorkspaceId}
                onValueChange={(value) => {
                  setSelectedWorkspaceId(value);
                  setSelectedFolderId(""); // Reset folder when workspace changes
                }}
                disabled={isLoadingWorkspaces}
              >
                <SelectTrigger id="workspace-select">
                  {isLoadingWorkspaces ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chargement...
                    </span>
                  ) : (
                    <SelectValue placeholder="Sélectionner un espace..." />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {workspaces?.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>
                      <span className="flex items-center gap-2">
                        {ws.name}
                        <span className="text-xs text-muted-foreground">
                          ({ws.role === "OWNER" ? "Propriétaire" : ws.role})
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Folder selection (optional, shown when workspace is selected) */}
            {selectedWorkspaceId && (
              <div className="grid gap-2">
                <Label htmlFor="folder-select" className="flex items-center gap-1">
                  <FolderOpen className="h-4 w-4" />
                  Dossier (optionnel)
                </Label>
                <Select
                  value={selectedFolderId}
                  onValueChange={setSelectedFolderId}
                  disabled={isLoadingFolders}
                >
                  <SelectTrigger id="folder-select">
                    {isLoadingFolders ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Chargement...
                      </span>
                    ) : (
                      <SelectValue placeholder="Racine de l'espace" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="root">Racine de l&apos;espace</SelectItem>
                    {folders?.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleShare}
            disabled={!selectedWorkspaceId || isSharing || hasNoWorkspaces}
          >
            {isSharing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Partage en cours...
              </>
            ) : (
              <>
                <Share2 className="mr-2 h-4 w-4" />
                Partager
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
