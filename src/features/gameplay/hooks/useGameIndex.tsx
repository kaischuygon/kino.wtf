import { useEffect, useState } from 'react';
import type { Route } from '../../../routes';
import { toGameMode } from '../../../lib/gameMode';
import { useCurrentGameIndex } from '../../../lib/gameRelease';

function isGameStateStorageKeyForRoute(key: string, routeTitle: string) {
  return key === `${routeTitle}_game_state` || key.startsWith(`game_state:${routeTitle}:`);
}

function parseStoredGameIndex(raw: string | null): number | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed?.gameIndex === 'number' ? parsed.gameIndex : undefined;
  } catch {
    return undefined;
  }
}

/**
 * useGameIndex
 *
 * Returns the `gameIndex` to show for `route`, or `null` while the latest
 * released index is loading from Supabase.
 *
 * - Defaults to the latest released game for the mode (see lib/gameRelease).
 * - `forcedIndex` (from `?game=N`) is clamped to [0, latest released].
 * - Follows `storage` events for `<route.title>` game state keys (cross-tab
 *   updates) and the dev helper `window.__simulateNextBoundary()`.
 */
export default function useGameIndex(route: Route, forcedIndex?: number): number | null {
  const currentIndex = useCurrentGameIndex(toGameMode(route.title));
  const hasForcedIndex = typeof forcedIndex === 'number' && Number.isFinite(forcedIndex);
  const [storageIndex, setStorageIndex] = useState<number | null>(null);

  useEffect(() => {
    if (hasForcedIndex) return;
    let mounted = true;

    // listen for storage changes from other tabs
    const onStorage = (e: StorageEvent) => {
      if (!mounted || !e.key) return;
      if (isGameStateStorageKeyForRoute(e.key, route.title)) {
        const nextIndex = parseStoredGameIndex(e.newValue);
        if (typeof nextIndex === 'number') setStorageIndex(nextIndex);
      }
    };

    window.addEventListener('storage', onStorage);

    return () => {
      mounted = false;
      window.removeEventListener('storage', onStorage);
    };
  }, [hasForcedIndex, route]);

  if (currentIndex === null) return null;
  if (hasForcedIndex) {
    return Math.max(0, Math.min(Math.floor(forcedIndex as number), currentIndex));
  }
  return storageIndex ?? currentIndex;
}

/**
 * Dev helper: simulate next boundary for a route by dispatching a StorageEvent.
 * This triggers same-tab listeners because we dispatch the event manually.
 *
 * Usage (in browser console):
 *   window.__getNextGame
 */
export function simulateNextBoundary() {
  const path = window.location.pathname.split('/');
  const routeTitle = path[path.length - 1];

  // Write a deterministic default per-game state so the app sees a known shape
  // (matches the defaults used by `useGame`) and will load the next game's index.
  try {
    const stateKey = `game_state:${routeTitle}:local`;
    const currentIndex = parseStoredGameIndex(localStorage.getItem(stateKey)) ?? -1;
    const nextIndex = currentIndex + 1;

    const defaultState = {
      guess: '',
      guesses: [],
      gameOver: 0,
      gameIndex: nextIndex,
    };

    const oldState = localStorage.getItem(stateKey);
    const newState = JSON.stringify(defaultState);
    localStorage.setItem(stateKey, newState);

    const stateEvent = new StorageEvent('storage', {
      key: stateKey,
      oldValue: oldState,
      newValue: newState,
      url: location.href,
      storageArea: localStorage,
    } as StorageEvent);

    window.dispatchEvent(stateEvent);
    return nextIndex;
  } catch (err) {
    // noop in case of restricted environments
    console.error('simulateNextBoundary error', err);
  }
}

// Attach helper to window in non-production for convenience
declare global {
  interface Window {
    __simulateNextBoundary?: () => number | undefined;
  }
}

if (typeof window !== 'undefined' && import.meta?.env?.MODE !== 'production') {
  (window as Window).__simulateNextBoundary = simulateNextBoundary;
}
