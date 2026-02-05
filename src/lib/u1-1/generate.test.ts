import { describe, expect, it } from 'vitest';

import lessonDefs from '@/specs/u1-1/lessonDefs.json';
import params from '@/specs/u1-1/generatorParams.json';

import { generateLesson } from './generate';
import { mulberry32 } from './rng';

function assertChoices(p: any, min: number, max: number) {
  expect(Array.isArray(p.choices)).toBe(true);
  expect(p.choices.length).toBe(4);
  expect(new Set(p.choices).has(p.answer)).toBe(true);
  for (const c of p.choices) {
    expect(Number.isFinite(c)).toBe(true);
    // choices are expected to be in configured range
    expect(c).toBeGreaterThanOrEqual(min);
    expect(c).toBeLessThanOrEqual(max);
  }
}

describe('U1-1 generator', () => {
  it('generates 6 problems for each lesson across many seeds (no hangs) and keeps constraints', () => {
    const lessons = (lessonDefs as any).lessons as any[];

    for (let seed = 1; seed <= 200; seed++) {
      for (const lesson of lessons) {
        const rand = mulberry32(seed);
        const recent: string[] = [];
        const probs = generateLesson('U1-1', lesson, params as any, rand, recent);

        expect(probs.length).toBe((params as any).lesson.problemCount);

        for (const p of probs) {
          if (p.kind === 'ARITH_CHOICE') {
            expect(p.op).toBe('+');
            expect(p.a).toBeGreaterThanOrEqual((params as any).constraints.min);
            expect(p.b).toBeGreaterThanOrEqual((params as any).constraints.min);
            expect(p.a).toBeLessThanOrEqual((params as any).constraints.max);
            expect(p.b).toBeLessThanOrEqual((params as any).constraints.max);
            expect(p.a + p.b).toBeLessThanOrEqual(lesson.maxSum);
          } else {
            // render count
            expect(p.answer).toBeGreaterThanOrEqual(1);
            expect(p.answer).toBeLessThanOrEqual(Math.min(10, Math.max(1, lesson.maxSum)));
          }

          assertChoices(p, (params as any).choiceDistractors.min, (params as any).choiceDistractors.max);
        }
      }
    }
  });

  it('handles answer=0 choice generation (still 4 options)', async () => {
    const rand = mulberry32(12345);
    const { buildChoiceOptions } = await import('./generate');

    const choices = buildChoiceOptions(0, 0, 0, params as any, rand);
    expect(choices.length).toBe(4);
    expect(new Set(choices).has(0)).toBe(true);
  });
});
