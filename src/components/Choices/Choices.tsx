'use client';

import styles from './Choices.module.scss';

export function Choices({
  choices,
  selectedIndex,
  onSelect,
}: {
  choices: number[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}) {
  return (
    <div className={styles.choices}>
      {choices.map((c, i) => (
        <button
          key={`${c}-${i}`}
          className={selectedIndex === i ? `${styles.choiceBtn} ${styles.choiceBtnSelected}` : styles.choiceBtn}
          onClick={() => onSelect(i)}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
