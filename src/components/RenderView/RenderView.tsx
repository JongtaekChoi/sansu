'use client';

import type { RenderSpec } from '@/lib/u1-1/types';
import styles from './RenderView.module.scss';

const PALETTE: Record<string, string> = {
  c1: '#7C5CFF',
  c2: '#2EC4B6',
  c3: '#FF6B6B',
  c4: '#FFD166',
  c5: '#4D96FF',
  c6: '#6BCB77',
  c7: '#FF9F1C',
  c8: '#B5179E',
};

function resolveFill(fill?: string) {
  if (!fill) return PALETTE.c1;
  return PALETTE[fill] ?? fill;
}

export function RenderView({ spec }: { spec: RenderSpec }) {
  const fill = resolveFill((spec as any).fill);

  if (spec.type === 'gridRect') {
    const rows = spec.rows;
    const cols = spec.cols;
    const gap = spec.gap ?? 6;
    const radius = spec.radius ?? 10;

    // Fit to viewBox nicely
    const cell = 40;
    const w = cols * cell + (cols - 1) * gap;
    const h = rows * cell + (rows - 1) * gap;
    const vbW = Math.max(220, w + 20);
    const vbH = Math.max(160, h + 20);
    const ox = (vbW - w) / 2;
    const oy = (vbH - h) / 2;

    return (
      <div className={styles.wrap}>
        <svg className={styles.svg} viewBox={`0 0 ${vbW} ${vbH}`} role="img" aria-label="격자 도형">
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((__, c) => (
              <rect
                key={`${r}-${c}`}
                x={ox + c * (cell + gap)}
                y={oy + r * (cell + gap)}
                width={cell}
                height={cell}
                rx={radius}
                fill={fill}
                opacity={0.95}
              />
            )),
          )}
        </svg>
      </div>
    );
  }

  // arrayDots
  const count = spec.count;
  const perRow = Math.max(1, spec.perRow);
  const gap = spec.gap ?? 12;
  const dot = spec.dotSize ?? 18;

  const rows = Math.ceil(count / perRow);
  const cols = Math.min(perRow, count);
  const w = cols * dot + (cols - 1) * gap;
  const h = rows * dot + (rows - 1) * gap;
  const vbW = Math.max(240, w + 20);
  const vbH = Math.max(170, h + 20);
  const ox = (vbW - w) / 2;
  const oy = (vbH - h) / 2;

  return (
    <div className={styles.wrap}>
      <svg className={styles.svg} viewBox={`0 0 ${vbW} ${vbH}`} role="img" aria-label="점 배열">
        {Array.from({ length: count }).map((_, i) => {
          const r = Math.floor(i / perRow);
          const c = i % perRow;
          return (
            <rect
              key={i}
              x={ox + c * (dot + gap)}
              y={oy + r * (dot + gap)}
              width={dot}
              height={dot}
              rx={Math.floor(dot / 3)}
              fill={fill}
              opacity={0.95}
            />
          );
        })}
      </svg>
    </div>
  );
}
