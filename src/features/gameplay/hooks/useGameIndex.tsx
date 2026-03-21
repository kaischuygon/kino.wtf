import { useEffect, useState } from 'react';
import type { Route } from '../../../routes';
import { getGameIndex } from '../../../helpers/gameHelpers';

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
 * React hook that returns the current `gameIndex` for a given `route` and keeps
 * it up-to-date. It updates automatically:
 * - when a `storage` event is received for keys starting with `<route.title>_` (useful for cross-tab updates),
 * - and via the dev helper `window.__simulateNextDay(routeTitle)` (development builds only) to make same-tab testing easier.
 *
 */
export default function useGameIndex(route: Route, forcedIndex?: number) {
  const currentIndex = getGameIndex(route);
  const resolvedForcedIndex =
    typeof forcedIndex === 'number' && Number.isFinite(forcedIndex)
      ? Math.max(0, Math.min(Math.floor(forcedIndex), currentIndex))
      : undefined;

  const [index, setIndex] = useState<number>(currentIndex);

  useEffect(() => {
    let mounted = true;

    const update = (newIndex: number) => {
      if (!mounted) return;
      setIndex(newIndex);
    };

    if (typeof resolvedForcedIndex === 'number') {
      return () => {
        mounted = false;
      };
    }

    // listen for storage changes from other tabs
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key.startsWith(`${route.title}_`)) {
        const nextIndex = parseStoredGameIndex(e.newValue);
        if (typeof nextIndex === 'number') update(nextIndex);
      }
    };

    window.addEventListener('storage', onStorage);

    return () => {
      mounted = false;
      window.removeEventListener('storage', onStorage);
      // clearTimeout(timeout);
    };
  }, [resolvedForcedIndex, route]);

  return resolvedForcedIndex ?? index;
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
    const stateKey = `${routeTitle}_game_state`;
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
