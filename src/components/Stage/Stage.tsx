'use client';

import styles from './Stage.module.scss';

export type StagePulse = 'none' | 'ok' | 'no';

export function Stage({
  children,
  pulse,
}: {
  children: React.ReactNode;
  pulse: StagePulse;
}) {
  const cls =
    pulse === 'ok' ? `${styles.stage} ${styles.stageOk}` : pulse === 'no' ? `${styles.stage} ${styles.stageNo}` : styles.stage;

  return (
    <div className={styles.stageWrap}>
      <div className={cls}>{children}</div>
    </div>
  );
}
