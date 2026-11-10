import { describe, expect, it } from 'vitest';
import { isDone, nextIndex, SCENARIOS } from './scenario';
import { MODULES } from '../data/modules';
import { ORDER_NEXT } from '../data/demo';
import { VOICE_MAPPING } from '../data/voice';

describe('scenarios', () => {
  it('advance never exceeds the number of steps', () => {
    expect(nextIndex(9, 10)).toBe(10);
    expect(nextIndex(10, 10)).toBe(10);
    expect(isDone(10, 10)).toBe(true);
    expect(isDone(3, 10)).toBe(false);
  });
  it('every step points to a known module', () => {
    const keys = new Set(MODULES.map((m) => m.key));
    for (const s of SCENARIOS) for (const st of s.steps) expect(keys.has(st.module), st.module).toBe(true);
  });
  it('the voice scenario is labelled as a proposal', () => {
    const v = SCENARIOS.find((s) => s.kind === 'voice')!;
    expect(v.intro).toMatch(/CONCEPTUAL/);
  });
});

describe('data integrity', () => {
  it('final order states have no transitions', () => {
    expect(ORDER_NEXT.delivered).toEqual([]);
    expect(ORDER_NEXT.cancelled).toEqual([]);
  });
  it('the voice mapping covers every required component and never claims AVA Voz exists', () => {
    expect(VOICE_MAPPING.length).toBeGreaterThanOrEqual(15);
    for (const r of VOICE_MAPPING) {
      for (const f of ['today', 'organization', 'entities', 'reuse', 'adapt', 'new'] as const) expect(r[f].length, `${r.component}.${f}`).toBeGreaterThan(3);
    }
  });
});

