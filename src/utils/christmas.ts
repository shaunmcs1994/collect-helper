// The app only manages Christmas collections: 23rd and 24th December.
export const CHRISTMAS_DAYS = ['12-23', '12-24'] as const;

export function isChristmasDate(isoDate: string | undefined | null): boolean {
  if (!isoDate) return false;
  return CHRISTMAS_DAYS.some((d) => isoDate.slice(5, 10) === d && isoDate.length >= 10);
}

export function christmasDay(isoDate: string): '23' | '24' | null {
  if (!isChristmasDate(isoDate)) return null;
  return isoDate.slice(8, 10) as '23' | '24';
}

export function christmasDates(year: number = new Date().getFullYear()): string[] {
  return CHRISTMAS_DAYS.map((d) => `${year}-${d}`);
}
