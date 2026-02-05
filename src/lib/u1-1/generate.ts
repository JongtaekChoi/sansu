import type { AddProblem, ColorToken, GeneratorParams, LessonDef, ProblemUiType, RenderSpec } from './types';
import { pickOne, shuffle } from './rng';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function keyOf(a: number, b: number) {
  const x = Math.max(a, b);
  const y = Math.min(a, b);
  return `${x}+${y}`;
}

function chooseUi(index: number, params: GeneratorParams): ProblemUiType {
  // Default: first N are choice, rest keypad
  // (MVP currently uses all choice by setting choiceCount=problemCount)
  return index < params.lesson.choiceCount ? 'choice' : 'keypad';
}

export function buildChoiceOptions(
  a: number,
  b: number,
  answer: number,
  params: GeneratorParams,
  rand: () => number,
): number[] {
  const { min, max } = params.choiceDistractors;

  const candidates: number[] = [];
  for (const spec of params.choiceDistractors.candidates) {
    let v: number | null = null;
    if (spec === 'ans-1') v = answer - 1;
    else if (spec === 'ans+1') v = answer + 1;
    else if (spec === 'ans-2') v = answer - 2;
    else if (spec === 'ans+2') v = answer + 2;
    else if (spec === 'abs(a-b)') v = Math.abs(a - b);
    else if (spec === 'a') v = a;
    else if (spec === 'b') v = b;

    if (v === null) continue;
    v = clamp(v, min, max);
    if (v === answer) continue;
    candidates.push(v);
  }
  // unique
  const uniq = Array.from(new Set(candidates));
  const distractors: number[] = [];
  for (const v of shuffle(uniq, rand)) {
    if (distractors.length >= 3) break;
    if (v !== answer) distractors.push(v);
  }

  // fallback #1: random fill within [min,max] but deterministic bounded
  if (distractors.length < 3) {
    const pool: number[] = [];
    for (let v = min; v <= max; v++) {
      if (v !== answer && !distractors.includes(v)) pool.push(v);
    }
    for (const v of shuffle(pool, rand)) {
      if (distractors.length >= 3) break;
      distractors.push(v);
    }
  }

  // fallback #2 (extreme edge): expand range a bit, still clamped to non-negative
  if (distractors.length < 3) {
    const eMin = Math.max(0, min - 5);
    const eMax = max + 5;
    const pool: number[] = [];
    for (let v = eMin; v <= eMax; v++) {
      if (v !== answer && !distractors.includes(v)) pool.push(v);
    }
    for (const v of shuffle(pool, rand)) {
      if (distractors.length >= 3) break;
      distractors.push(v);
    }
  }

  // last resort: allow duplicates (never hang)
  while (distractors.length < 3) {
    const v = clamp(answer + (Math.floor(rand() * 11) - 5), min, max);
    if (v !== answer) distractors.push(v);
    else distractors.push(clamp(answer + 1, min, max));
  }

  return shuffle([answer, ...distractors.slice(0, 3)], rand);
}

function pickPairForLesson(lesson: LessonDef, params: GeneratorParams, rand: () => number) {
  const maxSum = lesson.maxSum;

  // determine a,b via simple focus rules
  const focus = lesson.focus;

  // helper: pick by preferred small
  const pickPreferredSmall = () => {
    const small = lesson.preferredSmall?.length ? pickOne(lesson.preferredSmall, rand) : null;
    return small;
  };

  for (let attempt = 0; attempt < 200; attempt++) {
    let a = 0;
    let b = 0;

    if (focus === 'ZERO') {
      b = 0;
      a = Math.floor(rand() * (maxSum + 1));
    } else if (focus === 'ONE') {
      b = 1;
      a = Math.floor(rand() * maxSum);
    } else if (focus === 'ZERO_ONE_MIX' || focus === 'MIX_WITH_ONE') {
      b = rand() < 0.5 ? 0 : 1;
      a = Math.floor(rand() * (maxSum - b + 1));
    } else if (focus === 'SMALL_2_3' || focus === 'SMALL_4_5' || focus === 'MIX_WITH_2_3') {
      const preferred = pickPreferredSmall();
      b = preferred ?? (2 + Math.floor(rand() * 2));
      a = Math.floor(rand() * (maxSum - b + 1));
    } else {
      // SUM_LE_*, REVIEW, MIX, CAPSTONE
      a = Math.floor(rand() * (maxSum + 1));
      b = Math.floor(rand() * (maxSum + 1));
    }

    // normalize + enforce sum constraint
    const sum = a + b;
    if (sum > maxSum) continue;
    if (a < params.constraints.min || b < params.constraints.min) continue;
    if (a > params.constraints.max || b > params.constraints.max) continue;

    return { a, b };
  }

  throw new Error(`Failed to pick pair for ${lesson.lessonId}`);
}

function pickColor(rand: () => number, avoid?: ColorToken): ColorToken {
  const colors: ColorToken[] = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'];
  const pool = avoid ? colors.filter((c) => c !== avoid) : colors;
  return pool[Math.floor(rand() * pool.length)] ?? 'c1';
}

function factorPairs(n: number): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  for (let a = 1; a <= n; a++) {
    if (n % a === 0) pairs.push([a, n / a]);
  }
  return pairs;
}

function pickRenderCountSpec(
  answer: number,
  rand: () => number,
  color: ColorToken,
  types: Array<'arrayDots' | 'gridRect'>,
): RenderSpec {
  const pickType = types.length ? types[Math.floor(rand() * types.length)] : undefined;

  if (pickType === 'arrayDots' || (!pickType && rand() < 0.5)) {
    const perRow = answer <= 5 ? 5 : answer <= 8 ? 4 : 5;
    return { type: 'arrayDots', count: answer, perRow, fill: color };
  }

  // gridRect
  const pairs = factorPairs(answer);
  const scored = pairs
    .map(([r, c]) => ({ r, c, score: Math.abs(r - c) + (Math.min(r, c) === 1 ? 2 : 0) }))
    .sort((a, b) => a.score - b.score);
  const pick = scored[Math.floor(rand() * Math.min(3, scored.length))] ?? scored[0];
  return { type: 'gridRect', rows: pick.r, cols: pick.c, gap: 6, radius: 10, fill: color };
}

export function generateLesson(
  unitId: 'U1-1',
  lesson: LessonDef,
  params: GeneratorParams,
  rand: () => number,
  recentKeys: string[],
): AddProblem[] {
  // Runtime guards (protect UI from hangs when params are malformed)
  if (!Number.isFinite(params.lesson.problemCount) || params.lesson.problemCount <= 0) {
    throw new Error('Invalid generator params: lesson.problemCount');
  }
  if (!Number.isFinite(lesson.maxSum)) {
    throw new Error('Invalid lessonDef: maxSum');
  }
  const problems: AddProblem[] = [];
  const used = new Set<string>();

  // Performance + safety: avoid O(n) includes in tight loops
  const recentSet = new Set(recentKeys);

  // Safety cap to prevent UI hangs if constraints become impossible
  const MAX_TOTAL_TRIES = 20_000;
  let totalTries = 0;

  // Optional: mix in render-count problems by rate (do NOT fix position)
  const rm = (params as any).renderMix as
    | {
        enabled: boolean;
        rate: number;
        maxPerLesson: number;
        countMin: number;
        countMax: number;
        types: Array<'arrayDots' | 'gridRect'>;
      }
    | undefined;

  const wantRender = Boolean(rm?.enabled) && rand() < (rm?.rate ?? 0);
  const renderIndex = wantRender ? Math.floor(rand() * params.lesson.problemCount) : -1;
  let renderPlaced = false;

  for (let i = 0; i < params.lesson.problemCount; i++) {
    // Optionally place a render-count problem at a random slot.
    if (!renderPlaced && i === renderIndex && (rm?.maxPerLesson ?? 1) > 0) {
      const minCount = Math.max(1, rm?.countMin ?? 1);
      const maxCount = Math.max(minCount, Math.min(rm?.countMax ?? 10, Math.max(1, lesson.maxSum), 10));
      const renderAnswer = minCount + Math.floor(rand() * (maxCount - minCount + 1));
      const renderColor = pickColor(rand, undefined);
      const renderSpec = pickRenderCountSpec(renderAnswer, rand, renderColor, rm?.types ?? ['arrayDots', 'gridRect']);
      const renderChoices = buildChoiceOptions(0, 0, renderAnswer, params, rand);
      problems.push({
        kind: 'RENDER_CHOICE_COUNT',
        unitId,
        ui: 'choice',
        renderSpec,
        answer: renderAnswer,
        choices: renderChoices,
      });
      renderPlaced = true;
      continue;
    }

    let placed = false;

    for (let attempt = 0; attempt < 400; attempt++) {
      totalTries++;
      if (totalTries > MAX_TOTAL_TRIES) {
        throw new Error(
          `generateLesson exceeded max tries (lesson=${lesson.lessonId}, stage=${lesson.stage}, focus=${lesson.focus}, i=${i})`,
        );
      }

      const { a, b } = pickPairForLesson(lesson, params, rand);
      const k = keyOf(a, b);

      // If the available unique space is too small (e.g. maxSum very small),
      // strict de-dup can make generation impossible. We relax de-dup after enough attempts.
      const relaxDedup = attempt >= 250;
      if (params.antiRepeat.noDuplicateInLesson && used.has(k) && !relaxDedup) continue;
      if (recentSet.has(k) && !relaxDedup) continue;

      const ui = chooseUi(i, params);
      const answer = a + b;

      if (ui !== 'choice') continue;

      const p: AddProblem = {
        kind: 'ARITH_CHOICE',
        unitId,
        op: '+',
        a,
        b,
        answer,
        ui: 'choice',
        choices: buildChoiceOptions(a, b, answer, params, rand),
      };

      problems.push(p);
      used.add(k);

      recentKeys.push(k);
      recentSet.add(k);
      while (recentKeys.length > params.antiRepeat.recentProblemCacheSize) {
        const removed = recentKeys.shift();
        if (removed) recentSet.delete(removed);
      }

      placed = true;
      break;
    }

    if (!placed) {
      throw new Error(
        `generateLesson could not place problem (lesson=${lesson.lessonId}, stage=${lesson.stage}, focus=${lesson.focus}, i=${i})`,
      );
    }
  }

  return problems;
}
