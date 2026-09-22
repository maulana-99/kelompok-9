"use client";

import { useSyncExternalStore, useMemo } from "react";

/**
 * The signed-in user, as stored in `localStorage` after a successful sign-in.
 * This module owns the storage key so the pages that write it and the pages
 * that read it cannot drift apart.
 */
export type SessionUser = { id: number; username: string };

const STORAGE_KEY = "user";

/**
 * `localStorage` lives outside React, so `useSyncExternalStore` is the API that
 * actually models it: it subscribes for changes and re-renders when the value
 * moves. Writing state from an effect instead would render twice per mount and
 * fight React's own scheduling.
 */
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // `storage` only fires in other tabs; the local set below covers this one.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

// The server has no `localStorage`. Returning null renders the signed-out state
// during SSR, and React swaps in the real value right after hydration.
function getServerSnapshot(): string | null {
  return null;
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function saveUser(user: SessionUser): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  emit();
}

export function clearUser(): void {
  localStorage.removeItem(STORAGE_KEY);
  emit();
}

export function useCurrentUser(): SessionUser | null {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return useMemo(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionUser;
    } catch {
      // Corrupted entry: treat it as signed out rather than crashing the page.
      return null;
    }
  }, [raw]);
}
