/**
 * usePresence Hook
 *
 * Tracks presence of other users on a note using the Yjs Awareness API.
 * Provides real-time updates of connected users with their activity status.
 *
 * @see Story 4-5: Indicateur de Présence
 */

"use client";

import { HocuspocusProvider } from "@hocuspocus/provider";
import { useEffect, useState, useCallback, useRef } from "react";

/**
 * Represents a user present on the note
 */
export interface PresenceUser {
  /** Unique client ID from Yjs awareness */
  clientId: number;
  /** User's display name */
  name: string;
  /** User's unique color (HSL) */
  color: string;
  /** User's avatar URL (optional) */
  avatar?: string;
  /** Whether user is actively interacting (not idle) */
  isActive: boolean;
  /** Timestamp of last activity */
  lastActivity: number;
}

/**
 * Options for the usePresence hook
 */
export interface UsePresenceOptions {
  /** HocuspocusProvider instance (null if not connected) */
  provider: HocuspocusProvider | null;
  /** Idle timeout in milliseconds (default: 30000ms = 30 seconds) */
  idleTimeout?: number;
  /** Interval for checking idle status (default: 5000ms = 5 seconds) */
  checkInterval?: number;
}

/**
 * Return value from the usePresence hook
 */
export interface UsePresenceReturn {
  /** List of other users present on the note */
  users: PresenceUser[];
  /** Total count of present users (excluding self) */
  userCount: number;
}

/**
 * Default idle timeout: 30 seconds
 */
const DEFAULT_IDLE_TIMEOUT = 30000;

/**
 * Default check interval: 5 seconds
 */
const DEFAULT_CHECK_INTERVAL = 5000;

/**
 * Stable empty array reference to prevent unnecessary re-renders
 */
const EMPTY_USERS: PresenceUser[] = [];

/**
 * Hook for tracking presence of other users on a note
 *
 * Uses the Yjs Awareness API via HocuspocusProvider to track
 * connected users and their activity status.
 *
 * @example
 * ```tsx
 * const { users, userCount } = usePresence({
 *   provider,
 *   idleTimeout: 30000,
 * });
 *
 * return (
 *   <div>
 *     {users.map(user => (
 *       <Avatar key={user.clientId} name={user.name} />
 *     ))}
 *   </div>
 * );
 * ```
 */
export function usePresence(options: UsePresenceOptions): UsePresenceReturn {
  const {
    provider,
    idleTimeout = DEFAULT_IDLE_TIMEOUT,
    checkInterval = DEFAULT_CHECK_INTERVAL,
  } = options;

  const [users, setUsers] = useState<PresenceUser[]>([]);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Extract presence users from awareness states
   */
  const updateUsers = useCallback(() => {
    if (!provider?.awareness) {
      setUsers(EMPTY_USERS);
      return;
    }

    const awareness = provider.awareness;
    const now = Date.now();
    const states = Array.from(awareness.getStates().entries());
    const localClientId = awareness.clientID;

    const presenceUsers: PresenceUser[] = states
      // Filter out self
      .filter(([clientId]) => clientId !== localClientId)
      // Filter out entries without user data
      .filter(([, state]) => state?.user)
      // Map to PresenceUser
      .map(([clientId, state]) => ({
        clientId,
        name: state.user?.name || "Anonyme",
        color: state.user?.color || "#888888",
        avatar: state.user?.avatar,
        isActive: now - (state.user?.lastActivity || 0) < idleTimeout,
        lastActivity: state.user?.lastActivity || 0,
      }))
      // Sort by activity (active users first, then by name)
      .sort((a, b) => {
        if (a.isActive !== b.isActive) {
          return a.isActive ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

    setUsers(presenceUsers);
  }, [provider, idleTimeout]);

  // Subscribe to awareness changes
  useEffect(() => {
    if (!provider?.awareness) {
      // Clear users when provider disconnects.
      // This is intentional: when provider becomes null (disconnect/unmount),
      // we must synchronously clear the user list to avoid showing stale data.
      // The lint rule warns against this pattern, but it's the correct behavior
      // for handling external state synchronization.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUsers(EMPTY_USERS);
      return;
    }

    const awareness = provider.awareness;

    // Handler for awareness changes (called async by Yjs)
    const handleChange = () => {
      updateUsers();
    };

    // Subscribe to awareness changes
    awareness.on("change", handleChange);

    // Trigger initial update via requestAnimationFrame to avoid sync setState
    const rafId = requestAnimationFrame(() => {
      updateUsers();
    });

    // Cleanup
    return () => {
      cancelAnimationFrame(rafId);
      awareness.off("change", handleChange);
    };
  }, [provider, updateUsers]);

  // Periodic check for idle status updates
  useEffect(() => {
    if (!provider?.awareness) {
      return;
    }

    // Set up interval to recheck idle status
    checkIntervalRef.current = setInterval(() => {
      updateUsers();
    }, checkInterval);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [provider, checkInterval, updateUsers]);

  return {
    users,
    userCount: users.length,
  };
}

export default usePresence;
