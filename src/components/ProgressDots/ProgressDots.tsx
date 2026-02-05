'use client';

import styles from './ProgressDots.module.scss';

export function ProgressDots({ index, total = 6 }: { index: number; total?: number }) {
  return (
    <div className={styles.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={i <= index ? `${styles.dot} ${styles.dotOn}` : styles.dot} />
      ))}
    </div>
  );
}
