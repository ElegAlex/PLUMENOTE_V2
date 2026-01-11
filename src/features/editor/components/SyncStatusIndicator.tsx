"use client";

/**
 * SyncStatusIndicator Component
 *
 * Displays the current synchronization status of the collaborative editor.
 * Shows visual feedback for connection states and errors.
 *
 * @see Story 4-3: Edition Simultanee
 */

import {
  WifiOff,
  Loader2,
  Wifi,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "../hooks/useCollaboration";

export interface SyncStatusIndicatorProps {
  /** Current connection status */
  status: ConnectionStatus;
  /** Error message if any */
  error?: string | null;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Status configuration for each connection state
 */
const STATUS_CONFIG: Record<
  ConnectionStatus,
  {
    icon: typeof WifiOff;
    label: string;
    colorClass: string;
    animate?: boolean;
  }
> = {
  disconnected: {
    icon: WifiOff,
    label: "Déconnecté",
    colorClass: "text-destructive",
  },
  connecting: {
    icon: Loader2,
    label: "Connexion...",
    colorClass: "text-yellow-500",
    animate: true,
  },
  connected: {
    icon: Wifi,
    label: "Connecté",
    colorClass: "text-blue-500",
  },
  synced: {
    icon: CheckCircle,
    label: "Synchronisé",
    colorClass: "text-green-500",
  },
};

/**
 * Visual indicator for collaboration sync status
 *
 * @example
 * ```tsx
 * <SyncStatusIndicator status="synced" />
 * <SyncStatusIndicator status="disconnected" error="Connection lost" />
 * ```
 */
export function SyncStatusIndicator({
  status,
  error,
  className,
}: SyncStatusIndicatorProps) {
  // Show error state if there's an error
  if (error) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-sm text-destructive",
          className
        )}
        role="status"
        aria-live="polite"
      >
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
        <span>Erreur: {error}</span>
      </div>
    );
  }

  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm",
        config.colorClass,
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Icon
        className={cn("h-4 w-4", config.animate && "animate-spin")}
        aria-hidden="true"
      />
      <span>{config.label}</span>
    </div>
  );
}

export default SyncStatusIndicator;
