# ARCHITECTURE

## 목표
- 태블릿 중심 UI
- **1:1 스테이지(보드)**는 좌표계가 고정되어 애니메이션/레이아웃이 흔들리지 않게
- 입력 UI(키패드/선택형)는 스테이지 밖(여백)에 배치

## 레이아웃
- Stage 기준 해상도: **720×720**
- Viewport 크기에 맞춰 stagePx를 계산하고, `scale = stagePx / 720`로 래핑 스케일링

### Landscape
- Stage는 좌측, ControlPanel은 우측

### Portrait
- Stage는 상단, ControlPanel은 하단

## 도메인 모델(초안)
- Lesson: 6문제
- Problem: (type, a, b, op, answer, ui)
- Attempt: (correct, timeMs, usedHint)

## 스펙 파일
- `specs/u1-1/lessonDefs.json`: 20레슨 메타 정의(단계/포커스/생성 파라미터)
- `specs/u1-1/generatorParams.json`: 공통 제약/오답 생성 규칙
- `specs/u1-1/copy_ko.json`: 한국어 문구(친구 말투)
