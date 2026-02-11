# Development Workflow (Issue → Branch → PR → Merge)

이 프로젝트는 앞으로 **main 직접 푸시를 지양**하고, 아래 프로세스로 작업한다.

## 기본 원칙
- `main` 보호 브랜치처럼 운영 (직접 작업/직접 푸시 금지)
- 모든 기능/수정은 **GitHub Issue 기반**으로 진행
- 모든 변경은 **PR 리뷰 후 merge**

---

## 표준 절차

1) 이슈 선택
- 작업 시작 전에 대상 이슈 확인 (예: `#3`)

2) 브랜치 생성
- 네이밍 규칙:
  - `feat/issue-<번호>-<short-slug>`
  - `fix/issue-<번호>-<short-slug>`
  - `chore/issue-<번호>-<short-slug>`

예시:
- `feat/issue-3-result-summary`
- `fix/issue-6-mobile-layout`

3) 구현 + 테스트
- 로컬에서 최소 검증:
  - `npm run build`
  - `npm test`

4) 커밋
- 커밋 메시지에 이슈 번호 포함 권장

예시:
- `feat: add lesson result summary (#3)`
- `fix: prevent overlap on mobile (#6)`

5) PR 생성
- PR 제목 규칙:
  - `[ #번호 ] 작업 요약`
- PR 본문 필수 항목:
  - 목적/변경점
  - 테스트 결과
  - 스크린샷/영상(가능하면)
  - `Closes #번호`

6) 리뷰 후 머지
- 리뷰 승인 후 merge
- merge 방식은 기본적으로 squash merge 권장

---

## PR 템플릿(요약)

```markdown
## What
- 변경 내용 요약

## Why
- 이 변경이 필요한 이유

## Test
- [ ] npm run build
- [ ] npm test
- [ ] 주요 시나리오 수동 확인

## Screenshot / Demo
- (있으면 첨부)

Closes #<issue-number>
```

---

## 운영 메모
- 긴 작업은 작은 PR로 쪼개서 리뷰 부담을 줄인다.
- 버그 수정 PR은 재현 조건/원인/해결을 본문에 반드시 남긴다.
- hotfix가 필요한 경우에도 사후에 이슈/PR 기록을 남긴다.
