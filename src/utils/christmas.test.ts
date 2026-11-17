import { describe, it, expect } from 'vitest';
import { isChristmasDate, christmasDay, christmasDates } from './christmas';

describe('christmas dates', () => {
  it('accepts 23rd and 24th December', () => {
    expect(isChristmasDate('2026-12-23')).toBe(true);
    expect(isChristmasDate('2026-12-24')).toBe(true);
  });
  it('rejects other days', () => {
    expect(isChristmasDate('2026-12-25')).toBe(false);
    expect(isChristmasDate('2026-11-23')).toBe(false);
  });
  it('maps to day', () => {
    expect(christmasDay('2026-12-24')).toBe('24');
    expect(christmasDay('2026-12-22')).toBe(null);
  });
  it('builds current-year dates', () => {
    expect(christmasDates(2026)).toEqual(['2026-12-23', '2026-12-24']);
  });
});
