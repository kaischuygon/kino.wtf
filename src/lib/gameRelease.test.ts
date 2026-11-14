import { describe, expect, it } from 'vitest';
import { getTimeUntilNextRelease } from './gameRelease';

// Release boundary is midnight America/Denver (MST = UTC-7, MDT = UTC-6).
describe('getTimeUntilNextRelease', () => {
  it('counts down to Denver midnight for daily games (winter, MST)', () => {
    // 2026-11-14 22:30:00 MST
    const now = new Date('2026-11-15T05:30:00Z');
    expect(getTimeUntilNextRelease('daily', now)).toEqual({ hours: 1, minutes: 30, seconds: 0 });
  });

  it('counts down to Denver midnight for daily games (summer, MDT)', () => {
    // 2026-07-01 23:59:30 MDT
    const now = new Date('2026-07-02T05:59:30Z');
    expect(getTimeUntilNextRelease('daily', now)).toEqual({ hours: 0, minutes: 0, seconds: 30 });
  });

  it('uses Denver time even when UTC has already rolled over', () => {
    // 2026-11-15 01:00 UTC is still 2026-11-14 18:00 in Denver
    const now = new Date('2026-11-15T01:00:00Z');
    expect(getTimeUntilNextRelease('daily', now)).toEqual({ hours: 6, minutes: 0, seconds: 0 });
  });

  it('counts down to next Monday midnight in Denver for weekly games', () => {
    // Saturday 2026-11-14 12:00 MST -> Monday 2026-11-16 00:00 MST is 1d 12h away
    const now = new Date('2026-11-14T19:00:00Z');
    expect(getTimeUntilNextRelease('weekly', now)).toEqual({
      days: 1,
      hours: 12,
      minutes: 0,
      seconds: 0,
    });
  });

  it('restarts a full week right after the Monday boundary', () => {
    // Monday 2026-11-16 00:00:01 MST
    const now = new Date('2026-11-16T07:00:01Z');
    expect(getTimeUntilNextRelease('weekly', now)).toEqual({
      days: 6,
      hours: 23,
      minutes: 59,
      seconds: 59,
    });
  });
});
