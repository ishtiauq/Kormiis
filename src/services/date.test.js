import { describe, it, expect } from 'vitest';
import { formatDate, formatDateShort, formatDateTime, getRelativeTime } from './date.js';

describe('date helpers handle multiple input shapes', () => {
  it('formats an epoch number (notification timestamp)', () => {
    const ts = new Date('2026-01-15T10:30:00Z').getTime();
    expect(formatDate(ts)).not.toBe('--');
    expect(formatDate(ts)).toContain('2026');
  });

  it('formats a Date instance', () => {
    expect(formatDate(new Date('2026-01-15T00:00:00'))).toContain('2026');
  });

  it('formats ISO and date-only strings', () => {
    expect(formatDate('2026-01-15')).toContain('2026');
    expect(formatDate('2026-01-15T10:30:00Z')).toContain('2026');
    expect(formatDateShort('2026-01-15')).toContain('Jan');
  });

  it('formats a Firestore-style timestamp object', () => {
    const ts = { seconds: Math.floor(new Date('2026-01-15T00:00:00Z').getTime() / 1000) };
    expect(formatDate(ts)).toContain('2026');
    expect(formatDateTime(ts)).toContain('2026');
  });

  it('returns fallbacks for invalid input instead of throwing', () => {
    expect(formatDate(null)).toBe('--');
    expect(formatDate(undefined)).toBe('--');
    expect(formatDate('not-a-date')).toBe('--');
    expect(getRelativeTime(null)).toBe('');
  });

  it('getRelativeTime does not throw for old epoch timestamps', () => {
    const old = Date.now() - 30 * 24 * 60 * 60 * 1000;
    expect(() => getRelativeTime(old)).not.toThrow();
    expect(getRelativeTime(old)).not.toBe('');
  });
});
