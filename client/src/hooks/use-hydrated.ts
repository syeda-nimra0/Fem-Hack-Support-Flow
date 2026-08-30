

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => undefined;

/**
 * useHydrated — true only on the client after hydration.
 * Uses useSyncExternalStore (no setState-in-effect).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
