import { describe, expect, it } from 'vitest'
import {
  calculateWinPercentage,
  formatCamelCase,
  getDaysSince,
  getWeeksSince,
} from './gameHelpers'

describe('gameHelpers', () => {
  it('returns zero days when dates are on same local day', () => {
    const start = new Date(2026, 0, 1, 1)
    const current = new Date(2026, 0, 1, 23)

    expect(getDaysSince(start, current)).toBe(0)
  })

  it('clamps negative day offsets to zero', () => {
    const start = new Date(2026, 0, 2)
    const current = new Date(2026, 0, 1)

    expect(getDaysSince(start, current)).toBe(0)
  })

  it('returns one week for dates seven days apart', () => {
    const start = new Date(2026, 0, 1)
    const current = new Date(2026, 0, 8)

    expect(getWeeksSince(start, current)).toBe(1)
  })

  it('formats win percentage consistently', () => {
    expect(calculateWinPercentage(1, 2)).toBe('50%')
  })

  it('formats camelCase labels for display', () => {
    expect(formatCamelCase('gameIndex')).toBe('Game Index')
  })
})
