export type ProblemUiType = 'keypad' | 'choice';

export type AddProblem = {
  unitId: 'U1-1';
  op: '+';
  a: number;
  b: number;
  answer: number;
  ui: ProblemUiType;
  // for choice problems
  choices?: number[];
};

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
