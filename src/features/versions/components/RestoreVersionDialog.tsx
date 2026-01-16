"use client";

/**
 * RestoreVersionDialog Component
 *
 * Confirmation dialog before restoring a note to a previous version.
 * Shows version details and warning about the operation.
 *
 * @see Story 9.3: Restauration de Version
 * @see AC: #1 - Confirmation via Dialog
 * @see AC: #2 - Le contenu de la note est remplacé par la version sélectionnée
 */

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { RotateCcw, Loader2 } from "lucide-react";
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

/**
 * Props for RestoreVersionDialog
 */
export interface RestoreVersionDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Version number to restore */
  versionNumber: number;
  /** Date the version was created */
  versionDate: Date | string;
  /** Name of the user who created the version */
  versionAuthor?: string | null;
  /** Callback when user confirms restoration */
  onConfirm: () => void;
  /** Whether restoration is in progress */
  isRestoring: boolean;
}

/**
 * Format date for display in French
 */
function formatVersionDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "d MMMM yyyy 'à' HH:mm", { locale: fr });
}

/**
 * Confirmation dialog for version restoration
 *
 * Features:
 * - Shows version number and creation date
 * - Warning about creating new version
 * - Loading state during restoration
 * - Accessible (focus management, ARIA)
 *
 * @example
 * ```tsx
 * <RestoreVersionDialog
 *   open={showDialog}
 *   onOpenChange={setShowDialog}
 *   versionNumber={3}
 *   versionDate={version.createdAt}
 *   versionAuthor={version.createdBy?.name}
 *   onConfirm={() => restore(version.id)}
 *   isRestoring={isRestoring}
 * />
 * ```
 */
export function RestoreVersionDialog({
  open,
  onOpenChange,
  versionNumber,
  versionDate,
  versionAuthor,
  onConfirm,
  isRestoring,
}: RestoreVersionDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Restaurer la version {versionNumber} ?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Vous êtes sur le point de restaurer cette note à la{" "}
                <strong className="text-foreground">version {versionNumber}</strong>{" "}
                créée le {formatVersionDate(versionDate)}
                {versionAuthor && ` par ${versionAuthor}`}.
              </p>
              <p className="text-amber-600 dark:text-amber-400">
                Une nouvelle version sera créée pour conserver l'historique actuel.
                Vous pourrez annuler cette action pendant 30 secondes.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRestoring}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isRestoring}
            className="gap-2"
          >
            {isRestoring ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Restauration...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4" />
                Restaurer
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
