export type ProblemUiType = 'keypad' | 'choice';

export type ColorToken = 'c1' | 'c2' | 'c3' | 'c4' | 'c5' | 'c6' | 'c7' | 'c8';

export type RenderSpec =
  | {
      type: 'gridRect';
      rows: number;
      cols: number;
      gap?: number;
      radius?: number;
      fill?: ColorToken | string;
    }
  | {
      type: 'arrayDots';
      count: number;
      perRow: number;
      gap?: number;
      dotSize?: number;
      fill?: ColorToken | string;
    };

export type ArithChoiceProblem = {
  kind: 'ARITH_CHOICE';
  unitId: 'U1-1';
  op: '+';
  a: number;
  b: number;
  answer: number;
  ui: 'choice';
  choices: number[];
};

export type RenderChoiceCountProblem = {
  kind: 'RENDER_CHOICE_COUNT';
  unitId: 'U1-1';
  ui: 'choice';
  renderSpec: RenderSpec;
  answer: number; // count
  choices: number[];
};

export type AddProblem = ArithChoiceProblem | RenderChoiceCountProblem;

export type LessonDef = {
  lessonId: string;
  stage: 'A' | 'B' | 'C' | 'D';
  focus: string;
  maxSum: number;
  preferredSmall?: number[];
};

export type GeneratorParams = {
  constraints: {
    min: number;
    max: number;
    maxSum: number;
  };
  lesson: {
    problemCount: number;
    choiceCount: number;
    keypadCount: number;
  };
  antiRepeat: {
    noDuplicateInLesson: boolean;
    recentProblemCacheSize: number;
  };
  choiceDistractors: {
    candidates: string[];
    min: number;
    max: number;
  };
};
