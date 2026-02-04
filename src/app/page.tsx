import CopyKo from '@/specs/u1-1/copy_ko.json';
import LessonDefs from '@/specs/u1-1/lessonDefs.json';

export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>저학년 산수 (MVP)</h1>
      <p style={{ color: 'var(--muted)' }}>U1-1(0~10 덧셈) 스펙 로드 테스트</p>

      <section style={{ background: 'var(--panel)', padding: 16, borderRadius: 12 }}>
        <h2 style={{ marginTop: 0 }}>레슨 개수</h2>
        <div>{LessonDefs.lessons.length} lessons</div>

        <h2>예시 문구</h2>
        <div>{CopyKo['lesson.start'][0]}</div>
      </section>
    </main>
  );
}
