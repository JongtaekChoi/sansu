'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { mulberry32 } from '@/lib/u1-1/rng';
import type { AddProblem, LessonDef, GeneratorParams } from '@/lib/u1-1/types';
import { GeneratorParamsSchema, LessonDefsFileSchema } from '@/lib/u1-1/schema';

import { Choices } from '@/components/Choices';
import { ProgressDots } from '@/components/ProgressDots';
import { RenderView } from '@/components/RenderView';
import { Stage, type StagePulse } from '@/components/Stage';

import styles from './page.module.scss';

type Feedback = {
  kind: 'none' | 'correct' | 'wrong';
};

type UnitSpec = {
  lessonDefs: LessonDef[];
  params: GeneratorParams;
  generateLesson: typeof import('@/lib/u1-1/generate').generateLesson;
};

async function loadU11(): Promise<UnitSpec> {
  const [lessonDefsMod, paramsMod, gen] = await Promise.all([
    import('@/specs/u1-1/lessonDefs.json'),
    import('@/specs/u1-1/generatorParams.json'),
    import('@/lib/u1-1/generate'),
  ]);

  // Dynamic JSON import yields `{ default: ... }` in many bundlers.
  const lessonDefsRaw = (lessonDefsMod as any).default ?? lessonDefsMod;
  const paramsRaw = (paramsMod as any).default ?? paramsMod;

  const lessonDefsFile = LessonDefsFileSchema.parse(lessonDefsRaw);
  const paramsFile = GeneratorParamsSchema.parse(paramsRaw);

  return {
    lessonDefs: lessonDefsFile.lessons,
    params: paramsFile,
    generateLesson: gen.generateLesson,
  };
}

function playTone(freq: number, ms: number, type: OscillatorType = 'sine', gain = 0.03) {
  try {
    const AudioCtx = AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;

    osc.connect(g);
    g.connect(ctx.destination);

    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, ms);
  } catch {
    // ignore
  }
}

export default function Home() {
  const [safeMode, setSafeMode] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [autoStart, setAutoStart] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  useEffect(() => {
    try {
      const sp = new URLSearchParams(location.search);
      setSafeMode(sp.has('safe'));
      setDevMode(sp.has('dev'));
      setAutoStart(sp.has('autostart'));

      const urlLesson = sp.get('lesson');
      const urlSeed = sp.get('seed');
      const urlI = sp.get('i');

      if (urlLesson) setLessonId(urlLesson);
      if (urlSeed && /^\d+$/.test(urlSeed)) setSeed(Number(urlSeed));
      if (urlI && /^\d+$/.test(urlI)) setStartIndex(Number(urlI));
    } catch {
      setSafeMode(false);
      setDevMode(false);
      setAutoStart(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [unit, setUnit] = useState<UnitSpec | null>(null);
  const [unitError, setUnitError] = useState<string | null>(null);
  const [unitLoading, setUnitLoading] = useState(false);

  const [lessonId, setLessonId] = useState('U1-1-L01');
  const [seed, setSeed] = useState(12345);

  // reserved for future hint animations (keep deterministic RNG around)
  const hintRandRef = useRef(mulberry32(seed ^ 0x9e3779b9));

  const [recentKeys, setRecentKeys] = useState<string[]>([]);
  const [problems, setProblems] = useState<AddProblem[] | null>(null);
  const [index, setIndex] = useState(0);

  function updateUrl(next: { lesson?: string; seed?: number; i?: number }) {
    try {
      const sp = new URLSearchParams(location.search);
      if (next.lesson != null) sp.set('lesson', next.lesson);
      if (next.seed != null) sp.set('seed', String(next.seed));
      if (next.i != null) sp.set('i', String(next.i));
      const qs = sp.toString();
      const url = `${location.pathname}${qs ? `?${qs}` : ''}`;
      history.replaceState(history.state, '', url);
    } catch {
      // ignore
    }
  }
  const [feedback, setFeedback] = useState<Feedback>({ kind: 'none' });
  const [fxPulse, setFxPulse] = useState<StagePulse>('none');
  const [wrongOnce, setWrongOnce] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [completed, setCompleted] = useState(false);

  const current = problems?.[index] ?? null;

  useEffect(() => {
    // Load unit spec lazily after mount.
    // If even this causes a hang, ?safe=1 will help isolate.
    if (safeMode) return;

    let cancelled = false;
    setUnitLoading(true);
    setUnitError(null);

    const watchdog = setTimeout(() => {
      if (cancelled) return;
      setUnitError('U1-1 로딩이 오래 걸려요. 새로고침하거나 잠시 후 다시 시도해줘.');
    }, 4000);

    loadU11()
      .then((u) => {
        if (cancelled) return;
        setUnit(u);
      })
      .catch((e) => {
        if (cancelled) return;
        setUnitError(String(e?.message ?? e));
      })
      .finally(() => {
        if (cancelled) return;
        clearTimeout(watchdog);
        setUnitLoading(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(watchdog);
    };
  }, [safeMode]);

  // Optional auto-start for shareable URLs
  useEffect(() => {
    if (!autoStart) return;
    if (safeMode) return;
    if (!unit) return;
    if (completed) return;

    // start once
    if (!problems) {
      newLesson(lessonId, seed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, unit]);

  // Keep URL in sync when lesson/seed changes (shareable state)
  useEffect(() => {
    updateUrl({ lesson: lessonId, seed });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, seed]);

  function fxOk() {
    playTone(880, 90, 'sine', 0.035);
    setTimeout(() => playTone(1175, 110, 'sine', 0.03), 90);
    setFxPulse('ok');
    // keep the green state a bit longer
    setTimeout(() => setFxPulse('none'), 650);
  }

  function fxNo() {
    playTone(220, 140, 'triangle', 0.03);
    setFxPulse('no');
    setTimeout(() => setFxPulse('none'), 320);
  }

  function newLesson(nextLessonId = lessonId, nextSeed = seed) {
    if (!unit) return;

    setIsGenerating(true);
    requestAnimationFrame(() => {
      const t0 = performance.now();
      try {
        setError(null);
        const ld = unit.lessonDefs.find((l) => l.lessonId === nextLessonId);
        if (!ld) throw new Error(`Lesson not found: ${nextLessonId}`);

        const r = mulberry32(nextSeed);
        const rk = recentKeys.slice();
        const generated = unit.generateLesson('U1-1', ld, unit.params, r, rk);
        if (!Array.isArray(generated) || generated.length === 0) {
          throw new Error('문제를 생성하지 못했어');
        }

        setRecentKeys(rk);
        setProblems(generated);
        const i0 = Math.max(0, Math.min(startIndex, generated.length - 1));
        setIndex(i0);
        setCompleted(false);
        updateUrl({ lesson: nextLessonId, seed: nextSeed, i: i0 });
        setFeedback({ kind: 'none' });
        setFxPulse('none');
        setWrongOnce(false);
        setHintOpen(false);

        void t0;
      } catch (e: any) {
        setError(String(e?.message ?? e));
        setProblems(null);
      } finally {
        setIsGenerating(false);
      }
    });
  }

  function answerWith(n: number) {
    if (!current) return;

    const ok = n === current.answer;
    if (ok) {
      setFeedback({ kind: 'correct' });
      fxOk();
      setWrongOnce(false);
      setHintOpen(false);

      const isLast = index >= ((unit?.params.lesson.problemCount ?? 6) - 1);

      setTimeout(() => {
        setFeedback({ kind: 'none' });
        if (isLast) {
          setCompleted(true);
        } else {
          setIndex((i) => {
            const ni = i + 1;
            updateUrl({ lesson: lessonId, seed, i: ni });
            return ni;
          });
        }
      }, 950);
      return;
    }

    setFeedback({ kind: 'wrong' });
    fxNo();
    setWrongOnce(true);
  }

  function openHint() {
    if (!current) return;
    void hintRandRef.current;
    setHintOpen(true);
    setFeedback({ kind: 'none' });
    setFxPulse('none');
  }

  const lessonOptions = useMemo(() => unit?.lessonDefs.map((l) => l.lessonId) ?? [], [unit]);

  if (safeMode) {
    return (
      <main style={{ padding: 24, color: 'white', fontFamily: 'system-ui' }}>
        SAFE MODE<br />
        If this renders instantly, the hang is in unit loading or generation.
      </main>
    );
  }

  return (
    <div className={styles.shell}>
      {(unitLoading || isGenerating) && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingCard}>
            <div className={styles.spinner} />
            <div className={styles.loadingText}>{isGenerating ? '로딩…' : '준비중…'}</div>
          </div>
        </div>
      )}

      <div className={styles.board}>
        <Stage pulse={fxPulse}>
          <div className={styles.hud}>
            <ProgressDots index={index} />
            <div className={styles.pill}>U1-1</div>
          </div>

          <div className={styles.center}>
            {!current ? (
              <div className={styles.hero}>
                <div className={styles.title}>U1-1</div>
                <div className={styles.subtitle}>0~10 덧셈</div>
                <div style={{ height: 16 }} />
                <button
                  className={styles.startBtn}
                  disabled={!unit || unitLoading || isGenerating}
                  onClick={() => newLesson()}
                >
                  시작하기
                </button>
              </div>
            ) : (
              <>
                <div className={styles.problem}>
                  {current.kind === 'ARITH_CHOICE' ? (
                    <>
                      <div className={styles.expr}>
                        {current.a} <span className={styles.op}>+</span> {current.b}
                      </div>
                      <div className={styles.eq}>=</div>
                      <div className={styles.q}>?</div>
                    </>
                  ) : (
                    <div className={styles.renderPrompt}>
                      <div className={styles.renderTitle}>몇 개야?</div>
                      <RenderView spec={current.renderSpec} />
                    </div>
                  )}
                </div>

                <div className={styles.below}>
                  {wrongOnce && !hintOpen && (
                    <button className={styles.hintBtn} onClick={openHint}>
                      힌트
                    </button>
                  )}
                </div>

                {/* Answers inside stage */}
                {current.choices && !completed && (
                  <div className={styles.answerPanel}>
                    <Choices choices={current.choices} onPick={answerWith} />
                  </div>
                )}

                {completed && (
                  <div className={styles.completeOverlay}>
                    <div className={styles.completeCard}>
                      <div className={styles.completeTitle}>클리어</div>
                      <div className={styles.completeSub}>다음 레슨으로 갈까?</div>
                      <div className={styles.completeBtns}>
                        <button
                          className={styles.smallBtn}
                          onClick={() => {
                            // next lesson
                            const idx = lessonOptions.indexOf(lessonId);
                            const nextId = lessonOptions[Math.min(idx + 1, lessonOptions.length - 1)] ?? lessonId;
                            setLessonId(nextId);
                            newLesson(nextId, seed);
                          }}
                        >
                          다음
                        </button>
                        <button className={styles.smallBtn} onClick={() => newLesson(lessonId, seed)}>
                          다시
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {hintOpen && (
                  <div className={styles.hint} onClick={() => setHintOpen(false)}>
                    <div className={styles.hintCard} onClick={(e) => e.stopPropagation()}>
                      <div className={styles.hintCanvas} aria-hidden />
                      <button className={styles.hintClose} onClick={() => setHintOpen(false)}>
                        닫기
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Stage>
      </div>

      {devMode && (
        <div className={styles.controls}>
          <div className={styles.panel}>
          {unitError && (
            <div className={styles.errorBox}>
              <div className={styles.errorTitle}>로딩 오류</div>
              <div className={styles.errorMsg}>{unitError}</div>
            </div>
          )}

          <div className={styles.row}>
            <label className={styles.label}>레슨</label>
            <select className={styles.select} value={lessonId} onChange={(e) => setLessonId(e.target.value)} disabled={!unit}>
              {lessonOptions.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Seed</label>
            <input
              className={styles.input}
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value || '0'))}
              inputMode="numeric"
            />
          </div>

          <div style={{ height: 12 }} />

          {error && (
            <div className={styles.errorBox}>
              <div className={styles.errorTitle}>오류</div>
              <div className={styles.errorMsg}>{error}</div>
            </div>
          )}

          <div className={styles.mutedHelp}>개발 패널</div>

          <div style={{ height: 10 }} />

          <div className={styles.smallBtnRow}>
            <button
              className={styles.smallBtn}
              disabled={!unit || isGenerating}
              onClick={() => {
                const next = seed + 1;
                setSeed(next);
                newLesson(lessonId, next);
              }}
            >
              새로 뽑기
            </button>
            <button className={styles.smallBtn} disabled={!unit || isGenerating} onClick={() => newLesson()}>
              시작
            </button>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
