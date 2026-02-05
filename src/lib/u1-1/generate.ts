import type { AddProblem, GeneratorParams, LessonDef, ProblemUiType } from './types';
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

  // fallback if not enough
  let count = 0;
  while (distractors.length < 3) {
    const v = clamp(answer + (Math.floor(rand() * 10) - 2), min, max);
    if (v !== answer && !distractors.includes(v)) distractors.push(v);
    if (10 < count++) break;
  }

  return shuffle([answer, ...distractors], rand);
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

  for (let i = 0; i < params.lesson.problemCount; i++) {
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

      if (params.antiRepeat.noDuplicateInLesson && used.has(k)) continue;
      if (recentSet.has(k)) continue;

      const ui = chooseUi(i, params);
      const answer = a + b;

      const p: AddProblem = {
        unitId,
        op: '+',
        a,
        b,
        answer,
        ui,
      };

      if (ui === 'choice') {
        p.choices = buildChoiceOptions(a, b, answer, params, rand);
      }

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
