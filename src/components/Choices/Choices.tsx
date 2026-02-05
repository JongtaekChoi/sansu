'use client';

import styles from './Choices.module.scss';

export function Choices({ choices, onPick }: { choices: number[]; onPick: (n: number) => void }) {
  return (
    <div className={styles.choices}>
      {choices.map((c) => (
        <button key={c} className={styles.choiceBtn} onClick={() => onPick(c)}>
          {c}
        </button>
      ))}
    </div>
  );
}
