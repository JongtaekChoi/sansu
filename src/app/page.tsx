'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { MODES } from '@/lib/modes';

import styles from './home.module.scss';

export default function Home() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <main className={styles.shell}>
      <div className={styles.card}>
        <div className={styles.title}>산수</div>
        <div className={styles.sub}>원하는 연습을 골라서 시작해</div>

        <div className={styles.grid}>
          {MODES.map((m) => (
            <Link
              key={m.id}
              className={styles.modeBtn}
              href={{ pathname: '/play', query: { mode: m.id, seed: 12345, autostart: 1 } }}
              prefetch={ready}
            >
              <div className={styles.modeTitle}>{m.title}</div>
              <div className={styles.modeSub}>{m.subtitle}</div>
            </Link>
          ))}
        </div>

        <div className={styles.note}>레슨은 자동 생성돼. 같은 seed면 같은 문제가 나와.</div>
      </div>
    </main>
  );
}
