import { describe, expect, it } from 'vitest';
import { calculateWinPercentage, formatCamelCase } from './gameHelpers';

describe('gameHelpers', () => {
  it('formats win percentage consistently', () => {
    expect(calculateWinPercentage(1, 2)).toBe('50%');
  });

  it('formats camelCase labels for display', () => {
    expect(formatCamelCase('gameIndex')).toBe('Game Index');
  });
});
