/**
 * useCollaboration Hook
 *
 * Manages real-time collaboration connection to Hocuspocus WebSocket server.
 * Provides Y.js document synchronization for the Tiptap editor.
 *
 * @see https://tiptap.dev/docs/hocuspocus/provider
 */

"use client";

import { HocuspocusProvider } from "@hocuspocus/provider";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";

/**
 * Connection status for the WebSocket provider
 */
export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "synced";

/**
 * Collaboration hook options
 */
export interface UseCollaborationOptions {
  /** Note ID to collaborate on */
  noteId: string;
  /** Whether to auto-connect on mount (default: true) */
  autoConnect?: boolean;
  /** WebSocket URL override (default: from env) */
  wsUrl?: string;
}

/**
 * Collaboration hook return value
 */
export interface UseCollaborationReturn {
  /** Y.js document for the note */
  ydoc: Y.Doc;
  /** HocuspocusProvider instance (null if not connected) */
  provider: HocuspocusProvider | null;
  /** Current connection status */
  status: ConnectionStatus;
  /** Whether the document is synced with server */
  isSynced: boolean;
  /** Whether connection is established */
  isConnected: boolean;
  /** Connect to collaboration server */
  connect: () => void;
  /** Disconnect from collaboration server */
  disconnect: () => void;
  /** Error message if connection failed */
  error: string | null;
}

/**
 * Default WebSocket URL from environment
 */
const DEFAULT_WS_URL =
  process.env.NEXT_PUBLIC_HOCUSPOCUS_URL || "ws://localhost:1234";

/**
 * Hook for managing real-time collaboration on a note
 *
 * @example
 * ```tsx
 * const { ydoc, provider, status, isConnected } = useCollaboration({
 *   noteId: "abc123",
 * });
 *
 * // Use ydoc with Tiptap Collaboration extension
 * const editor = useEditor({
 *   extensions: [
 *     Collaboration.configure({ document: ydoc }),
 *     CollaborationCursor.configure({ provider }),
 *   ],
 * });
 * ```
 */
export function useCollaboration(
  options: UseCollaborationOptions
): UseCollaborationReturn {
  const { noteId, autoConnect = true, wsUrl = DEFAULT_WS_URL } = options;

  // Auth session for token
  const { data: session, status: sessionStatus } = useSession();

  // State for connection status and error
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);

  // State for provider (triggers re-render when changed)
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);

  // Y.Doc is created once per noteId using useState initializer
  const [ydoc] = useState(() => new Y.Doc());

  // Ref to track if we're mounted (for async operations)
  const isMountedRef = useRef(true);

  /**
   * Connect to collaboration server
   */
  const connect = useCallback(() => {
    // Don't connect if already connected or connecting
    if (
      provider &&
      (connectionStatus === "connected" || connectionStatus === "connecting")
    ) {
      return;
    }

    // Need session token to authenticate
    if (sessionStatus !== "authenticated" || !session) {
      setError("Authentication required");
      return;
    }

    // Get auth token from session
    // Auth.js v5 stores the session token in the session object
    const token = (session as { accessToken?: string }).accessToken;
    if (!token) {
      setError("No access token available");
      return;
    }

    setConnectionStatus("connecting");
    setError(null);

    try {
      // Create new provider
      const newProvider = new HocuspocusProvider({
        url: wsUrl,
        name: `note-${noteId}`,
        document: ydoc,
        token,

        // Event handlers
        onConnect: () => {
          if (isMountedRef.current) {
            setConnectionStatus("connected");
            setError(null);
          }
        },

        onDisconnect: () => {
          if (isMountedRef.current) {
            setConnectionStatus("disconnected");
          }
        },

        onSynced: () => {
          if (isMountedRef.current) {
            setConnectionStatus("synced");
          }
        },

        onAuthenticationFailed: ({ reason }) => {
          if (isMountedRef.current) {
            setError(`Authentication failed: ${reason}`);
            setConnectionStatus("disconnected");
          }
        },

        onClose: ({ event }) => {
          if (isMountedRef.current && event.code !== 1000) {
            // Not a normal close
            setError(`Connection closed: ${event.reason || "Unknown error"}`);
          }
        },
      });

      setProvider(newProvider);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create provider"
      );
      setConnectionStatus("disconnected");
    }
  }, [noteId, wsUrl, ydoc, session, sessionStatus, connectionStatus, provider]);

  /**
   * Disconnect from collaboration server
   */
  const disconnect = useCallback(() => {
    if (provider) {
      provider.destroy();
      setProvider(null);
    }
    setConnectionStatus("disconnected");
  }, [provider]);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && sessionStatus === "authenticated") {
      connect();
    }

    // Cleanup on unmount
    return () => {
      if (provider) {
        provider.destroy();
      }
    };
  }, [autoConnect, sessionStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reconnect when noteId changes
  useEffect(() => {
    if (provider && connectionStatus !== "disconnected") {
      disconnect();
      if (autoConnect) {
        // Small delay to ensure clean disconnect
        const timer = setTimeout(connect, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [noteId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ydoc,
    provider,
    status: connectionStatus,
    isSynced: connectionStatus === "synced",
    isConnected:
      connectionStatus === "connected" || connectionStatus === "synced",
    connect,
    disconnect,
    error,
  };
}

export default useCollaboration;
