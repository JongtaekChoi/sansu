'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import LessonDefsJson from '@/specs/u1-1/lessonDefs.json';
import GeneratorParamsJson from '@/specs/u1-1/generatorParams.json';

import { generateLesson } from '@/lib/u1-1/generate';
import { mulberry32 } from '@/lib/u1-1/rng';
import type { AddProblem, LessonDef } from '@/lib/u1-1/types';

import { Choices } from '@/components/Choices';
import { ProgressDots } from '@/components/ProgressDots';
import { Stage, type StagePulse } from '@/components/Stage';

import styles from './page.module.scss';

type Feedback = {
  kind: 'none' | 'correct' | 'wrong';
};

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
  const lessonDefs = (LessonDefsJson as { lessons: LessonDef[] }).lessons;
  const params = GeneratorParamsJson as any;

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

  const current = problems?.[index] ?? null;

  function newLesson(nextLessonId = lessonId, nextSeed = seed) {
    try {
      setError(null);
      const ld = lessonDefs.find((l) => l.lessonId === nextLessonId);
      if (!ld) throw new Error(`Lesson not found: ${nextLessonId}`);

      const r = mulberry32(nextSeed);
      const rk = recentKeys.slice();
      const generated = generateLesson('U1-1', ld, params, r, rk);

      setRecentKeys(rk);
      setProblems(generated);
      setIndex(0);
      setFeedback({ kind: 'none' });
      setFxPulse('none');
      setWrongOnce(false);
      setHintOpen(false);
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setProblems(null);
    }
  }

  // Mobile stability: do NOT auto-start on load.
  // Some browsers can show "page unresponsive" if heavy work happens during hydration.
  // We'll start on explicit user tap.

  // Restart when lesson changes (but only if already started).
  useEffect(() => {
    if (problems) newLesson(lessonId, seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

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
    // Text hint intentionally removed. Future: SVG block animations.
    void hintRandRef.current;
    setHintOpen(true);
    setFeedback({ kind: 'none' });
    setFxPulse('none');
  }

  const lessonOptions = useMemo(() => lessonDefs.map((l) => l.lessonId), [lessonDefs]);

  return (
    <div className={styles.shell}>
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
          <div className={styles.row}>
            <label className={styles.label}>레슨</label>
            <select className={styles.select} value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
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
            <div className={styles.mutedHelp}>아래 ‘시작’을 눌러</div>
          )}

          <div style={{ height: 10 }} />

          <div className={styles.smallBtnRow}>
            <button
              className={styles.smallBtn}
              onClick={() => {
                const next = seed + 1;
                setSeed(next);
                newLesson(lessonId, next);
              }}
            >
              새로 뽑기
            </button>
            <button className={styles.smallBtn} onClick={() => newLesson()}>
              시작
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
