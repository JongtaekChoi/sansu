'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import GeneratorParamsJson from '@/specs/u1-1/generatorParams.json';
import { mulberry32 } from '@/lib/u1-1/rng';
import type { AddProblem, GeneratorParams } from '@/lib/u1-1/types';

import { Choices } from '@/components/Choices';
import { ProgressDots } from '@/components/ProgressDots';
import { RenderView } from '@/components/RenderView';
import { Stage, type StagePulse } from '@/components/Stage';

import { generateProblemsByMode, getMode } from '@/lib/modes';

import styles from './play.module.scss';

type Feedback = { kind: 'none' | 'correct' | 'wrong' };

type PersistedPlaySession = {
  v: 1;
  modeId: string;
  seed: number;
  problems: AddProblem[];
  order: number[];
  cursor: number;
  phase: 'main' | 'retry';
  retryQueue: number[];
  wrongCounts: Record<number, number>;
  completed: boolean;
  savedAt: number;
};

const PLAY_SESSION_KEY = 'sansu.play.v1';

function playTone(freq: number, ms: number, type: OscillatorType = 'sine', gain = 0.03) {
  try {
    const AudioCtx = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
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

export default function PlayPage() {
  const params = GeneratorParamsJson as unknown as GeneratorParams;

  const [modeId, setModeId] = useState('add10_nocarry');
  const [seed, setSeed] = useState(12345);
  const [autoStart, setAutoStart] = useState(false);

  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const m = sp.get('mode');
    const s = sp.get('seed');
    const hasExplicit = sp.has('mode') || sp.has('seed') || sp.has('i') || sp.has('autostart');

    if (m) setModeId(m);
    if (s && /^\d+$/.test(s)) setSeed(Number(s));
    setAutoStart(sp.has('autostart'));

    // Restore only when URL does not explicitly request a scenario.
    if (!hasExplicit) {
      try {
        const raw = localStorage.getItem(PLAY_SESSION_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as PersistedPlaySession;
        if (saved?.v !== 1) return;

        setModeId(saved.modeId || 'add10_nocarry');
        if (Number.isFinite(saved.seed)) setSeed(saved.seed);
        setProblems(Array.isArray(saved.problems) ? saved.problems : null);
        setOrder(Array.isArray(saved.order) ? saved.order : []);
        setCursor(Number.isFinite(saved.cursor) ? saved.cursor : 0);
        setPhase(saved.phase === 'retry' ? 'retry' : 'main');
        setRetryQueue(Array.isArray(saved.retryQueue) ? saved.retryQueue : []);
        setWrongCounts(saved.wrongCounts ?? {});
        setCompleted(Boolean(saved.completed));
      } catch {
        // ignore broken persistence
      }
    }
  }, []);

  const mode = useMemo(() => getMode(modeId), [modeId]);

  const [problems, setProblems] = useState<AddProblem[] | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [cursor, setCursor] = useState(0);
  const [phase, setPhase] = useState<'main' | 'retry'>('main');
  const [retryQueue, setRetryQueue] = useState<number[]>([]);
  const [wrongCounts, setWrongCounts] = useState<Record<number, number>>({});

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [revealCorrectIndex, setRevealCorrectIndex] = useState<number | null>(null);

  const [feedback, setFeedback] = useState<Feedback>({ kind: 'none' });
  const [fxPulse, setFxPulse] = useState<StagePulse>('none');
  const [hintOpen, setHintOpen] = useState(false);
  const [completed, setCompleted] = useState(false);

  const currentIndex = order.length ? order[cursor] ?? 0 : 0;
  const current = problems?.[currentIndex] ?? null;

  function updateUrl(next: { mode?: string; seed?: number; i?: number }) {
    try {
      const sp = new URLSearchParams(location.search);
      if (next.mode != null) sp.set('mode', next.mode);
      if (next.seed != null) sp.set('seed', String(next.seed));
      if (next.i != null) sp.set('i', String(next.i));
      const qs = sp.toString();
      history.replaceState(history.state, '', `${location.pathname}?${qs}`);
    } catch {}
  }

  function fxOk() {
    playTone(880, 90, 'sine', 0.035);
    setTimeout(() => playTone(1175, 110, 'sine', 0.03), 90);
    setFxPulse('ok');
    setTimeout(() => setFxPulse('none'), 650);
  }

  function fxNo() {
    playTone(220, 140, 'triangle', 0.03);
    setFxPulse('no');
    setTimeout(() => setFxPulse('none'), 320);
  }

  function newLesson(nextSeed = seed) {
    const rand = mulberry32(nextSeed);
    const generated = generateProblemsByMode(mode, params, rand);

    setProblems(generated);
    setOrder(generated.map((_, i) => i));
    setCursor(0);
    setPhase('main');
    setRetryQueue([]);
    setWrongCounts({});

    setCompleted(false);
    setSelectedIndex(null);
    setIsConfirming(false);
    setRevealCorrectIndex(null);

    updateUrl({ mode: mode.id, seed: nextSeed, i: 0 });
  }

  useEffect(() => {
    if (!autoStart) return;
    if (problems) return;
    newLesson(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // Persist progress locally (resume support)
  useEffect(() => {
    if (!problems || problems.length === 0) return;
    try {
      const payload: PersistedPlaySession = {
        v: 1,
        modeId,
        seed,
        problems,
        order,
        cursor,
        phase,
        retryQueue,
        wrongCounts,
        completed,
        savedAt: Date.now(),
      };
      localStorage.setItem(PLAY_SESSION_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage quota / permission
    }
  }, [modeId, seed, problems, order, cursor, phase, retryQueue, wrongCounts, completed]);

  function advanceNext() {
    setSelectedIndex(null);
    setIsConfirming(false);
    setRevealCorrectIndex(null);

    if (cursor + 1 < order.length) {
      const nextCursor = cursor + 1;
      const nextProblemIndex = order[nextCursor] ?? 0;
      setCursor(nextCursor);
      updateUrl({ mode: mode.id, seed, i: nextProblemIndex });
      return;
    }

    if (phase === 'main' && retryQueue.length > 0) {
      setPhase('retry');
      setOrder(retryQueue);
      setCursor(0);
      updateUrl({ mode: mode.id, seed, i: retryQueue[0] ?? 0 });
      return;
    }

    setCompleted(true);
  }

  function answerWith(n: number) {
    if (!current) return;

    if (n === current.answer) {
      setFeedback({ kind: 'correct' });
      fxOk();
      setHintOpen(false);
      setTimeout(() => {
        setFeedback({ kind: 'none' });
        advanceNext();
      }, 950);
      return;
    }

    setFeedback({ kind: 'wrong' });
    fxNo();
    setHintOpen(false);

    const baseIdx = currentIndex;

    if (phase === 'main') {
      setRetryQueue((q) => (q.includes(baseIdx) ? q : [...q, baseIdx]));
      setTimeout(() => {
        setFeedback({ kind: 'none' });
        advanceNext();
      }, 520);
      return;
    }

    setWrongCounts((m) => {
      const next = { ...m };
      next[baseIdx] = (next[baseIdx] ?? 0) + 1;
      return next;
    });

    const wc = (wrongCounts[baseIdx] ?? 0) + 1;
    if (wc >= 2 && current.choices) {
      const ci = current.choices.findIndex((x) => x === current.answer);
      if (ci >= 0) setRevealCorrectIndex(ci);
      setTimeout(() => {
        setFeedback({ kind: 'none' });
        advanceNext();
      }, 900);
    } else {
      setTimeout(() => {
        setFeedback({ kind: 'none' });
      }, 520);
    }
  }

  function confirmChoice() {
    if (!current?.choices) return;
    if (selectedIndex == null) return;
    if (isConfirming) return;

    setIsConfirming(true);
    const picked = current.choices[selectedIndex];
    answerWith(picked);
  }

  function openHint() {
    setHintOpen(true);
    setTimeout(() => setHintOpen(false), 900);
  }

  return (
    <div className={styles.shell}>
      <div className={styles.board}>
        <div className={styles.stageArea}>
          <Stage pulse={fxPulse}>
            <div className={styles.hud}>
              <ProgressDots index={Math.min(cursor, 5)} />
              <div className={styles.pill}>{mode.title}</div>
            </div>

            <div className={styles.center}>
              {!current ? (
                <div className={styles.hero}>
                  <div className={styles.title}>{mode.title}</div>
                  <div className={styles.subtitle}>{mode.subtitle}</div>
                  <div style={{ height: 16 }} />
                  <button className={styles.startBtn} onClick={() => newLesson(seed)}>
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
                    <button className={styles.hintBtn} disabled={hintOpen} onClick={openHint}>
                      힌트
                    </button>
                  </div>

                  {completed && (
                    <div className={styles.completeOverlay}>
                      <div className={styles.completeCard}>
                        <div className={styles.completeTitle}>클리어</div>
                        <div className={styles.completeSub}>다음 연습으로 갈까?</div>
                        <div className={styles.completeBtns}>
                          <button className={styles.smallBtn} onClick={() => (location.href = '/')}>홈</button>
                          <button className={styles.smallBtn} onClick={() => newLesson(seed)}>다시</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {hintOpen && (
                    <div className={styles.hint}>
                      <div className={styles.hintCard}>
                        <div className={styles.hintCanvas} aria-hidden />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </Stage>
        </div>

        {current?.choices && !completed && (
          <div className={styles.playControls}>
            <Choices
              choices={current.choices}
              selectedIndex={revealCorrectIndex ?? selectedIndex}
              onSelect={(i) => {
                if (revealCorrectIndex != null || isConfirming) return;
                setSelectedIndex(i);
              }}
            />
            <button className={styles.confirmBtn} disabled={selectedIndex == null || isConfirming} onClick={confirmChoice}>
              확인
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
