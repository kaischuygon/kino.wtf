import { useEffect, useState } from 'react';
import type { GameMode } from './gamePersistence';
import { supabase } from './supabase';

/**
 * Games are released by index, not derived from the calendar. The database
 * (public.release_next_games, run by pg_cron) releases at most one new game per
 * mode per period, at midnight in this time zone. Keep in sync with
 * public.release_period_for_mode in the Supabase migrations.
 */
export const GAME_RELEASE_TIME_ZONE = 'America/Denver';

const CACHE_TTL_MS = 60_000;
const currentIndexCache = new Map<GameMode, { value: Promise<number>; fetchedAt: number }>();

/**
 * Latest released game index for a mode, or -1 if nothing has been released
 * (or Supabase is not configured). Cached briefly so the route and the history
 * modal share one request.
 */
export function loadCurrentGameIndex(gameMode: GameMode): Promise<number> {
  const cached = currentIndexCache.get(gameMode);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.value;

  const value = (async () => {
    if (!supabase) return -1;
    const { data, error } = await supabase.rpc('get_current_game_index', {
      p_game_mode: gameMode,
    });
    if (error) throw error;
    return typeof data === 'number' && Number.isFinite(data) ? data : -1;
  })();

  value.catch(() => currentIndexCache.delete(gameMode));
  currentIndexCache.set(gameMode, { value, fetchedAt: Date.now() });
  return value;
}

/** React wrapper around loadCurrentGameIndex. Returns null while loading. */
export function useCurrentGameIndex(gameMode: GameMode | null): number | null {
  const [state, setState] = useState<{ gameMode: GameMode | null; index: number } | null>(null);

  useEffect(() => {
    if (!gameMode) return;
    let mounted = true;

    loadCurrentGameIndex(gameMode)
      .then((index) => {
        if (mounted) setState({ gameMode, index });
      })
      .catch(() => {
        if (mounted) setState({ gameMode, index: -1 });
      });

    return () => {
      mounted = false;
    };
  }, [gameMode]);

  if (!gameMode) return -1;
  return state?.gameMode === gameMode ? state.index : null;
}

export interface Countdown {
  days?: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const SECONDS_PER_DAY = 24 * 60 * 60;
const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

function zonedClock(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '0';

  return {
    daysSinceMonday: WEEKDAY_INDEX[get('weekday')] ?? 0,
    secondsIntoDay: Number(get('hour')) * 3600 + Number(get('minute')) * 60 + Number(get('second')),
  };
}

/**
 * Time remaining until the next release boundary: the next midnight (daily) or
 * the next Monday midnight (weekly) in GAME_RELEASE_TIME_ZONE.
 *
 * Note: on daylight-saving transition days the result can be off by an hour.
 */
export function getTimeUntilNextRelease(
  frequency: 'daily' | 'weekly',
  now: Date = new Date(),
  timeZone: string = GAME_RELEASE_TIME_ZONE,
): Countdown {
  const { daysSinceMonday, secondsIntoDay } = zonedClock(now, timeZone);

  const remaining =
    frequency === 'weekly'
      ? (7 - daysSinceMonday) * SECONDS_PER_DAY - secondsIntoDay
      : SECONDS_PER_DAY - secondsIntoDay;

  const safe = Math.max(0, remaining);
  const hours = Math.floor((safe % SECONDS_PER_DAY) / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (frequency === 'weekly') {
    return { days: Math.floor(safe / SECONDS_PER_DAY), hours, minutes, seconds };
  }
  // Daily countdowns never show a days component (24h reads as 0d otherwise).
  return { hours: Math.floor(safe / 3600), minutes, seconds };
}
