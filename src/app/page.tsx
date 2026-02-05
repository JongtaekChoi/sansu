'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { mulberry32 } from '@/lib/u1-1/rng';
import type { AddProblem, LessonDef } from '@/lib/u1-1/types';

import { Choices } from '@/components/Choices';
import { ProgressDots } from '@/components/ProgressDots';
import { Stage, type StagePulse } from '@/components/Stage';

import styles from './page.module.scss';

type Feedback = {
  kind: 'none' | 'correct' | 'wrong';
};

type UnitSpec = {
  lessonDefs: LessonDef[];
  params: any;
  generateLesson: typeof import('@/lib/u1-1/generate').generateLesson;
};

async function loadU11(): Promise<UnitSpec> {
  const [lessonDefsJson, paramsJson, gen] = await Promise.all([
    import('@/specs/u1-1/lessonDefs.json'),
    import('@/specs/u1-1/generatorParams.json'),
    import('@/lib/u1-1/generate'),
  ]);

  return {
    lessonDefs: (lessonDefsJson as any).lessons as LessonDef[],
    params: paramsJson as any,
    generateLesson: gen.generateLesson,
  };
}

function playTone(freq: number, ms: number, type: OscillatorType = 'sine', gain = 0.03) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;

    osc.connect(g);
    g.connect(ctx.destination);

    osc.start();
    window.setTimeout(() => {
      osc.stop();
      ctx.close();
    }, ms);
  } catch {
    // ignore
  }
}

export default function Home() {
  const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const safeMode = Boolean(sp?.get('safe'));

  const [unit, setUnit] = useState<UnitSpec | null>(null);
  const [unitError, setUnitError] = useState<string | null>(null);

  const [lessonId, setLessonId] = useState('U1-1-L01');
  const [seed, setSeed] = useState(12345);

  const hintRandRef = useRef(mulberry32(seed ^ 0x9e3779b9));

  const [recentKeys, setRecentKeys] = useState<string[]>([]);
  const [problems, setProblems] = useState<AddProblem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>({ kind: 'none' });
  const [fxPulse, setFxPulse] = useState<StagePulse>('none');
  const [wrongOnce, setWrongOnce] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const current = problems?.[index] ?? null;

  useEffect(() => {
    // Load unit spec lazily after mount.
    // If even this causes a hang, ?safe=1 will help isolate.
    if (safeMode) return;

    let cancelled = false;
    loadU11()
      .then((u) => {
        if (cancelled) return;
        setUnit(u);
      })
      .catch((e) => {
        if (cancelled) return;
        setUnitError(String(e?.message ?? e));
      });

    return () => {
      cancelled = true;
    };
  }, [safeMode]);

  function fxOk() {
    playTone(880, 90, 'sine', 0.035);
    window.setTimeout(() => playTone(1175, 110, 'sine', 0.03), 90);
    setFxPulse('ok');
    window.setTimeout(() => setFxPulse('none'), 180);
  }

  function fxNo() {
    playTone(220, 140, 'triangle', 0.03);
    setFxPulse('no');
    window.setTimeout(() => setFxPulse('none'), 220);
  }

  function newLesson(nextLessonId = lessonId, nextSeed = seed) {
    if (!unit) return;

    setIsGenerating(true);
    window.requestAnimationFrame(() => {
      const t0 = performance.now();
      try {
        setError(null);
        const ld = unit.lessonDefs.find((l) => l.lessonId === nextLessonId);
        if (!ld) throw new Error(`Lesson not found: ${nextLessonId}`);

        const r = mulberry32(nextSeed);
        const rk = recentKeys.slice();
        const generated = unit.generateLesson('U1-1', ld, unit.params, r, rk);

        setRecentKeys(rk);
        setProblems(generated);
        setIndex(0);
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

      window.setTimeout(() => {
        setFeedback({ kind: 'none' });
        setIndex((i) => Math.min(i + 1, 5));
      }, 420);
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
      {isGenerating && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingCard}>
            <div className={styles.spinner} />
            <div className={styles.loadingText}>로딩…</div>
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
              </div>
            ) : (
              <>
                <div className={styles.problem}>
                  <div className={styles.expr}>
                    {current.a} <span className={styles.op}>+</span> {current.b}
                  </div>
                  <div className={styles.eq}>=</div>
                  <div className={styles.q}>?</div>
                </div>

                <div className={styles.below}>
                  {wrongOnce && !hintOpen && (
                    <button className={styles.hintBtn} onClick={openHint}>
                      힌트
                    </button>
                  )}
                </div>

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

          {current?.choices ? (
            <Choices choices={current.choices} onPick={answerWith} />
          ) : (
            <div className={styles.mutedHelp}>{unit ? '시작' : '불러오는 중…'}</div>
          )}

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
    </div>
  );
}
