'use client';

import { useMemo, useRef, useState } from 'react';

import CopyKo from '@/specs/u1-1/copy_ko.json';
import LessonDefsJson from '@/specs/u1-1/lessonDefs.json';
import GeneratorParamsJson from '@/specs/u1-1/generatorParams.json';

import { generateLesson } from '@/lib/u1-1/generate';
import { mulberry32, pickOne, shuffle } from '@/lib/u1-1/rng';
import type { AddProblem, LessonDef } from '@/lib/u1-1/types';

type Feedback = {
  kind: 'none' | 'correct' | 'wrong';
};

function fmt(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

function pickLine(key: keyof typeof CopyKo, rand: () => number, vars?: Record<string, string | number>) {
  const pool = CopyKo[key] as string[];
  const line = pickOne(pool, rand);
  return vars ? fmt(line, vars) : line;
}

function computeHint(problem: AddProblem, rand: () => number) {
  const a = problem.a;
  const b = problem.b;
  const big = Math.max(a, b);
  const small = Math.min(a, b);
  const ans = problem.answer;

  if (a === 0 || b === 0) {
    return [
      pickLine('hint.open', rand),
      pickLine('hint.zero_rule', rand),
      pickLine('hint.conclude', rand, { ans }),
    ];
  }

  if (a === 1 || b === 1) {
    return [
      pickLine('hint.open', rand),
      pickLine('hint.one_rule', rand),
      pickLine('hint.conclude', rand, { ans }),
    ];
  }

  return [
    pickLine('hint.open', rand),
    pickLine('hint.count_on', rand, { big }),
    pickLine('hint.count_steps', rand, { small }),
    pickLine('hint.conclude', rand, { ans }),
  ];
}

function Stage({ children, pulse }: { children: React.ReactNode; pulse: 'none' | 'ok' | 'no' }) {
  return (
    <div className="stageWrap">
      <div className={pulse === 'ok' ? 'stage stageOk' : pulse === 'no' ? 'stage stageNo' : 'stage'}>
        {children}
      </div>
      <style jsx>{`
        .stageWrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          padding: 12px;
        }
        .stage {
          width: min(100%, 720px);
          height: auto;
          aspect-ratio: 1 / 1;
          background: linear-gradient(180deg, #111a2c, #0d1424);
          border: 2px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
          position: relative;
          overflow: hidden;
          transition: border-color 120ms ease, box-shadow 120ms ease;
        }
        .stageOk {
          border-color: rgba(107, 203, 119, 0.95);
          box-shadow: 0 0 0 6px rgba(107, 203, 119, 0.12), 0 12px 30px rgba(0, 0, 0, 0.35);
        }
        .stageNo {
          border-color: rgba(255, 107, 107, 0.95);
          box-shadow: 0 0 0 6px rgba(255, 107, 107, 0.10), 0 12px 30px rgba(0, 0, 0, 0.35);
        }
      `}</style>
    </div>
  );
}

function ProgressDots({ index }: { index: number }) {
  return (
    <div className="dots">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={i <= index ? 'dot dotOn' : 'dot'} />
      ))}
      <style jsx>{`
        .dots {
          display: flex;
          gap: 8px;
        }
        .dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.18);
        }
        .dotOn {
          background: rgba(124, 92, 255, 0.95);
        }
      `}</style>
    </div>
  );
}

function Keypad({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit: () => void }) {
  const buttons = ['1','2','3','4','5','6','7','8','9','0'];
  return (
    <div className="pad">
      <div className="display">{value || ' '}</div>
      <div className="grid">
        {buttons.map((d) => (
          <button key={d} className="btn" onClick={() => onChange((value + d).slice(0, 2))}>
            {d}
          </button>
        ))}
        <button className="btn ghost" onClick={() => onChange(value.slice(0, -1))}>지우기</button>
        <button className="btn primary" onClick={onSubmit}>확인</button>
      </div>
      <style jsx>{`
        .pad {
          background: rgba(19, 26, 42, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 12px;
        }
        .display {
          height: 48px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          font-weight: 800;
          margin-bottom: 10px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .btn {
          height: 56px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          color: var(--text);
          font-size: 20px;
          font-weight: 800;
          touch-action: manipulation;
        }
        .btn:active {
          transform: translateY(1px);
        }
        .ghost {
          grid-column: span 2;
          background: rgba(255, 255, 255, 0.04);
        }
        .primary {
          background: rgba(124, 92, 255, 0.95);
          border-color: rgba(124, 92, 255, 0.95);
        }
      `}</style>
    </div>
  );
}

function Choices({ choices, onPick }: { choices: number[]; onPick: (n: number) => void }) {
  return (
    <div className="choices">
      {choices.map((c) => (
        <button key={c} className="cbtn" onClick={() => onPick(c)}>
          {c}
        </button>
      ))}
      <style jsx>{`
        .choices {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          background: rgba(19, 26, 42, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 12px;
        }
        .cbtn {
          height: 64px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          color: var(--text);
          font-size: 22px;
          font-weight: 900;
          touch-action: manipulation;
        }
        .cbtn:active {
          transform: translateY(1px);
        }
      `}</style>
    </div>
  );
}

export default function Home() {
  const lessonDefs = (LessonDefsJson as { lessons: LessonDef[] }).lessons;
  const params = GeneratorParamsJson as any;

  const [lessonId, setLessonId] = useState('U1-1-L01');
  const [seed, setSeed] = useState(12345);

  const rand = useMemo(() => mulberry32(seed), [seed]);
  const hintRandRef = useRef(mulberry32(seed ^ 0x9e3779b9));

  const [recentKeys, setRecentKeys] = useState<string[]>([]);
  const [problems, setProblems] = useState<AddProblem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<Feedback>({ kind: 'none' });
  const [fxPulse, setFxPulse] = useState<'none' | 'ok' | 'no'>('none');
  const [wrongOnce, setWrongOnce] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [hintLines, setHintLines] = useState<string[]>([]);

  const current = problems?.[index] ?? null;

  function newLesson(nextLessonId = lessonId, nextSeed = seed) {
    const ld = lessonDefs.find((l) => l.lessonId === nextLessonId);
    if (!ld) return;

    const r = mulberry32(nextSeed);
    const rk = recentKeys.slice();
    const generated = generateLesson('U1-1', ld, params, r, rk);

    setRecentKeys(rk);
    setProblems(generated);
    setIndex(0);
    setInput('');
    setFeedback({ kind: 'none' });
    setFxPulse('none');
    setWrongOnce(false);
    setHintOpen(false);
    setHintLines([]);
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

  function fxOk() {
    // short pleasant two-tone
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
      setHintLines([]);

      // next after short delay
      window.setTimeout(() => {
        setFeedback({ kind: 'none' });
        setInput('');
        setIndex((i) => Math.min(i + 1, 5));
      }, 420);
      return;
    }

    setFeedback({ kind: 'wrong' });
    fxNo();
    setWrongOnce(true);
  }

  function submitKeypad() {
    const n = Number(input);
    if (!Number.isFinite(n)) return;
    answerWith(n);
  }

  function openHint() {
    if (!current) return;
    const hr = hintRandRef.current;
    const lines = computeHint(current, hr);
    setHintLines(lines);
    setHintOpen(true);
    setFeedback({ kind: 'none' });
    setFxPulse('none');
  }

  const lessonOptions = useMemo(() => {
    return lessonDefs.map((l) => l.lessonId);
  }, [lessonDefs]);

  const control = (
    <>
      {current?.ui === 'choice' && current.choices ? (
        <Choices choices={current.choices} onPick={answerWith} />
      ) : (
        <Keypad value={input} onChange={setInput} onSubmit={submitKeypad} />
      )}

      <div style={{ height: 10 }} />

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          className="smallBtn"
          onClick={() => {
            const next = seed + 1;
            setSeed(next);
            newLesson(lessonId, next);
          }}
        >
          새로 뽑기
        </button>
        <button
          className="smallBtn"
          onClick={() => {
            if (!problems) newLesson();
          }}
        >
          시작
        </button>
        <style jsx>{`
          .smallBtn {
            flex: 1;
            height: 44px;
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.12);
            background: rgba(255, 255, 255, 0.06);
            color: var(--text);
            font-weight: 800;
            touch-action: manipulation;
          }
        `}</style>
      </div>
    </>
  );

  return (
    <div className="shell">
      <div className="board">
        <Stage pulse={fxPulse}>
          <div className="hud">
            <ProgressDots index={index} />
            <div className="pill">U1-1</div>
          </div>

          <div className="center">
            {!current ? (
              <div className="hero">
                <div className="title">{pickLine('lesson.start', rand)}</div>
                <div className="subtitle">U1-1 (0~10 덧셈) 레슨을 시작해보자</div>
              </div>
            ) : (
              <>
                <div className="problem">
                  <div className="expr">
                    {current.a} <span className="op">+</span> {current.b}
                  </div>
                  <div className="eq">=</div>
                  <div className="q">?</div>
                </div>

                <div className="below">
                  {wrongOnce && !hintOpen && (
                    <button className="hintBtn" onClick={openHint}>
                      힌트
                    </button>
                  )}
                </div>

                {hintOpen && (
                  <div className="hint">
                    <div className="hintCard">
                      {hintLines.map((l, i) => (
                        <div key={i} className="hintLine">
                          {l}
                        </div>
                      ))}
                      <div style={{ height: 10 }} />
                      <button className="hintClose" onClick={() => setHintOpen(false)}>
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

      <div className="controls">
        <div className="panel">
          <div className="row">
            <label>레슨</label>
            <select value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
              {lessonOptions.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>

          <div className="row">
            <label>Seed</label>
            <input
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value || '0'))}
              inputMode="numeric"
            />
          </div>

          <div style={{ height: 12 }} />
          {control}
        </div>
      </div>

      <style jsx>{`
        .shell {
          height: 100vh;
          width: 100vw;
          display: flex;
          gap: 12px;
          padding: 12px;
        }
        .board {
          flex: 1;
          min-width: 0;
        }
        .controls {
          width: 360px;
          max-width: 46vw;
        }
        .panel {
          height: 100%;
          border-radius: 18px;
          background: rgba(19, 26, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 14px;
          overflow: auto;
        }
        .row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 10px;
        }
        label {
          color: var(--muted);
          font-weight: 700;
          font-size: 14px;
        }
        select,
        input {
          width: 220px;
          height: 40px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          color: var(--text);
          padding: 0 10px;
          font-weight: 800;
        }

        .hud {
          position: absolute;
          top: 14px;
          left: 14px;
          right: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          pointer-events: none;
        }
        .pill {
          pointer-events: none;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          font-weight: 900;
        }

        .center {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 64px 18px 18px;
        }
        .hero {
          text-align: center;
        }
        .title {
          font-size: 32px;
          font-weight: 900;
        }
        .subtitle {
          margin-top: 10px;
          color: var(--muted);
          font-weight: 700;
        }

        .problem {
          display: flex;
          align-items: baseline;
          gap: 14px;
          font-weight: 900;
          letter-spacing: -0.02em;
        }
        .expr {
          font-size: 72px;
        }
        .op {
          color: rgba(124, 92, 255, 0.95);
        }
        .eq {
          font-size: 64px;
          color: rgba(255, 255, 255, 0.75);
        }
        .q {
          font-size: 72px;
          color: rgba(255, 255, 255, 0.95);
        }

        .below {
          margin-top: 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          align-items: center;
        }
        .fb {
          padding: 10px 14px;
          border-radius: 999px;
          font-weight: 900;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
        }
        .fbOk {
          border-color: rgba(107, 203, 119, 0.7);
        }
        .fbNo {
          border-color: rgba(255, 107, 107, 0.7);
        }
        .hintBtn {
          height: 44px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid rgba(124, 92, 255, 0.4);
          background: rgba(124, 92, 255, 0.18);
          color: var(--text);
          font-weight: 900;
        }

        .hint {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 16px;
        }
        .hintCard {
          margin: 0 auto;
          max-width: 620px;
          border-radius: 18px;
          background: rgba(10, 14, 26, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.12);
          padding: 14px;
          backdrop-filter: blur(8px);
        }
        .hintLine {
          font-weight: 900;
          font-size: 18px;
          margin: 6px 0;
        }
        .hintClose {
          width: 100%;
          height: 42px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          color: var(--text);
          font-weight: 900;
        }

        @media (orientation: portrait) {
          .shell {
            flex-direction: column;
          }
          .controls {
            width: 100%;
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
