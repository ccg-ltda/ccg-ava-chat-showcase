import { describe, expect, it } from 'vitest';

describe('no live services', () => {
  it('source has no network calls', () => {
    const sources = import.meta.glob(['../**/*.ts', '../**/*.tsx', '!../**/*.test.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    const entries = Object.entries(sources);
    expect(entries.length).toBeGreaterThan(20);
    for (const [file, code] of entries) expect(code, file).not.toMatch(/\bfetch\(|XMLHttpRequest|WebSocket|axios|sendBeacon/);
  });
});
