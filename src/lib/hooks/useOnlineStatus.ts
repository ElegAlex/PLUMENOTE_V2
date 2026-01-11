"use client";

/**
 * Online Status Hook
 *
 * Detects browser online/offline status using Navigator API.
 * Updates reactively when connection state changes.
 *
 * @see Story 3.4: Sauvegarde Automatique des Notes
 * @see AC #2: Indicateur "Hors ligne"
 */

import { useState, useEffect } from "react";

/**
 * Hook to detect online/offline status
 *
 * @returns boolean - true if online, false if offline
 *
 * @example
 * ```tsx
 * const isOnline = useOnlineStatus();
 *
 * if (!isOnline) {
 *   return <div>You are offline</div>;
 * }
 * ```
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
