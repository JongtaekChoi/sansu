import type { AddProblem, ColorToken, RenderSpec } from '@/lib/u1-1/types';
import type { GeneratorParams } from '@/lib/u1-1/types';
import { buildChoiceOptions } from '@/lib/u1-1/generate';

export type ModeId = 'add10_nocarry' | 'add10_carry' | 'add20_nocarry' | 'count10';

export type ModePreset = {
  id: ModeId;
  title: string;
  subtitle: string;
  // arithmetic
  min: number;
  max: number;
  sumMax: number;
  carry: 'none' | 'must' | 'any';
  // render mix
  renderRate: number; // 0..1
  // render count range
  countMin: number;
  countMax: number;
};

export const MODES: ModePreset[] = [
  {
    id: 'add10_nocarry',
    title: '1~10 덧셈',
    subtitle: '받아올림 없음',
    min: 1,
    max: 9,
    sumMax: 9,
    carry: 'none',
    renderRate: 0.2,
    countMin: 1,
    countMax: 10,
  },
  {
    id: 'add10_carry',
    title: '받아올림 덧셈',
    subtitle: '1자리에서 10 넘기기',
    min: 1,
    max: 9,
    sumMax: 18,
    carry: 'must',
    renderRate: 0.2,
    countMin: 1,
    countMax: 10,
  },
  {
    id: 'add20_nocarry',
    title: '1~20 덧셈',
    subtitle: '받아올림 없음',
    min: 1,
    max: 19,
    sumMax: 20,
    carry: 'none',
    renderRate: 0.25,
    countMin: 1,
    countMax: 10,
  },
  {
    id: 'count10',
    title: '개수세기',
    subtitle: '1~10',
    min: 1,
    max: 9,
    sumMax: 9,
    carry: 'any',
    renderRate: 0.8,
    countMin: 1,
    countMax: 10,
  },
];

export function getMode(id: string | null | undefined): ModePreset {
  const found = MODES.find((m) => m.id === id);
  return found ?? MODES[0]!;
}

const PALETTE: ColorToken[] = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'];

function pickColor(rand: () => number, avoid?: ColorToken): ColorToken {
  const pool = avoid ? PALETTE.filter((c) => c !== avoid) : PALETTE;
  return pool[Math.floor(rand() * pool.length)] ?? 'c1';
}

function factorPairs(n: number): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  for (let a = 1; a <= n; a++) {
    if (n % a === 0) pairs.push([a, n / a]);
  }
  return pairs;
}

function pickRenderCountSpec(answer: number, rand: () => number, color: ColorToken): RenderSpec {
  // dots vs grid
  if (rand() < 0.5) {
    const perRow = answer <= 5 ? 5 : answer <= 8 ? 4 : 5;
    return { type: 'arrayDots', count: answer, perRow, fill: color };
  }

  const pairs = factorPairs(answer);
  const scored = pairs
    .map(([r, c]) => ({ r, c, score: Math.abs(r - c) + (Math.min(r, c) === 1 ? 2 : 0) }))
    .sort((a, b) => a.score - b.score);
  const pick = scored[Math.floor(rand() * Math.min(3, scored.length))] ?? scored[0];
  return { type: 'gridRect', rows: pick.r, cols: pick.c, gap: 6, radius: 10, fill: color };
}

function pickArithPair(mode: ModePreset, rand: () => number): { a: number; b: number } {
  for (let attempt = 0; attempt < 2000; attempt++) {
    const a = mode.min + Math.floor(rand() * (mode.max - mode.min + 1));
    const b = mode.min + Math.floor(rand() * (mode.max - mode.min + 1));
    const sum = a + b;

    if (sum > mode.sumMax) continue;

    const carry = (a % 10) + (b % 10) >= 10;
    if (mode.carry === 'none' && carry) continue;
    if (mode.carry === 'must' && !carry) continue;

    return { a, b };
  }

  // Fallback: guarantee something
  return { a: mode.min, b: mode.min };
}

export function generateProblemsByMode(
  mode: ModePreset,
  params: GeneratorParams,
  rand: () => number,
): AddProblem[] {
  const N = params.lesson.problemCount;
  const problems: AddProblem[] = [];

  let lastColor: ColorToken | undefined;

  for (let i = 0; i < N; i++) {
    const useRender = rand() < mode.renderRate;

    if (useRender) {
      const countMin = Math.max(1, mode.countMin);
      const countMax = Math.max(countMin, mode.countMax);
      const answer = countMin + Math.floor(rand() * (countMax - countMin + 1));
      const color = pickColor(rand, lastColor);
      lastColor = color;
      const renderSpec = pickRenderCountSpec(answer, rand, color);
      const choices = buildChoiceOptions(0, 0, answer, params, rand);
      problems.push({ kind: 'RENDER_CHOICE_COUNT', unitId: 'U1-1', ui: 'choice', renderSpec, answer, choices });
      continue;
    }

    const { a, b } = pickArithPair(mode, rand);
    const answer = a + b;
    const choices = buildChoiceOptions(a, b, answer, params, rand);
    problems.push({ kind: 'ARITH_CHOICE', unitId: 'U1-1', op: '+', a, b, answer, ui: 'choice', choices });
  }

  return problems;
}
