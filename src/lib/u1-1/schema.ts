import { z } from 'zod';

export const LessonDefSchema = z.object({
  lessonId: z.string(),
  stage: z.enum(['A', 'B', 'C', 'D']),
  focus: z.string(),
  maxSum: z.number().int().nonnegative(),
  preferredSmall: z.array(z.number().int().nonnegative()).optional(),
});

export const LessonDefsFileSchema = z.object({
  unitId: z.literal('U1-1'),
  lessons: z.array(LessonDefSchema).min(1),
});

export const GeneratorParamsSchema = z.object({
  unitId: z.literal('U1-1'),
  description: z.string(),
  constraints: z.object({
    min: z.number().int(),
    max: z.number().int(),
    maxSum: z.number().int(),
  }),
  lesson: z.object({
    problemCount: z.number().int().positive(),
    choiceCount: z.number().int().nonnegative(),
    keypadCount: z.number().int().nonnegative(),
  }),
  choiceDistractors: z.object({
    candidates: z.array(z.string()).min(1),
    min: z.number().int(),
    max: z.number().int(),
  }),
  antiRepeat: z.object({
    noDuplicateInLesson: z.boolean(),
    recentProblemCacheSize: z.number().int().nonnegative(),
  }),
});

export type LessonDefsFile = z.infer<typeof LessonDefsFileSchema>;
export type GeneratorParamsFile = z.infer<typeof GeneratorParamsSchema>;
