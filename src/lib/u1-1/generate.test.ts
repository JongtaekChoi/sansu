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
          expect(p.op).toBe('+');
          expect(p.a).toBeGreaterThanOrEqual((params as any).constraints.min);
          expect(p.b).toBeGreaterThanOrEqual((params as any).constraints.min);
          expect(p.a).toBeLessThanOrEqual((params as any).constraints.max);
          expect(p.b).toBeLessThanOrEqual((params as any).constraints.max);
          expect(p.a + p.b).toBeLessThanOrEqual(lesson.maxSum);

          if (p.ui === 'choice') {
            assertChoices(p, (params as any).choiceDistractors.min, (params as any).choiceDistractors.max);
          }
        }
      }
    }
  });

  it('handles answer=0 choices (never hangs, still 4 options)', () => {
    const rand = mulberry32(12345);
    // Manually build a tiny lesson that can yield answer 0 (0+0)
    const lesson = { lessonId: 'TEST', stage: 'A', focus: 'ZERO', maxSum: 0 } as any;
    const recent: string[] = [];
    const probs = generateLesson('U1-1', lesson, params as any, rand, recent);
    expect(probs.length).toBe((params as any).lesson.problemCount);
    const p = probs[0];
    expect(p.answer).toBe(0);
    assertChoices(p, (params as any).choiceDistractors.min, (params as any).choiceDistractors.max);
  });
});
