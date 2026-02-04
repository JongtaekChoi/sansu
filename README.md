# lowgrade-math-webapp

초등 저학년(1~3) 산수 학습 웹앱 (태블릿 중심) — MVP는 **1학년 덧/뺄 + 2학년 곱셈(구구단)**.

## MVP 범위(현재)
- U1-1: 0~10 덧셈(받아올림 없음)부터 시작
- 레슨: 1레슨 = 6문제
- 입력: 숫자패드 + 선택형 혼합
- 오답: 힌트(블록 애니메이션) → 재시도
- 스테이지: 720×720 기준, 1:1 보드 + 여백에 컨트롤 패널
- 언어: 한국어 only

## 폴더 구조
- `specs/` : 레슨/문구/생성 규칙(JSON)
- `docs/` : UX/아키텍처 문서
- `src/` : Next.js(React) 코드

## 실행(예정)
```bash
npm i
npm run dev
```

## 문서
- `docs/ARCHITECTURE.md`
- `docs/U1-1-GENERATION.md`
