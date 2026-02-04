# U1-1 GENERATION (0~10 덧셈, 받아올림 없음)

## 범위
- a, b: 0..10
- a + b <= 10

## 레슨
- 1레슨 = 6문제
- 문제 타입 믹스: 선택형 2 + 숫자패드 4

## 단계(20레슨)
- Stage A (L01~L05): 0/1 중심 + 합<=5
- Stage B (L06~L10): 합<=8, small=2~3 중심
- Stage C (L11~L15): 합<=10, small=4~5 비중 증가
- Stage D (L16~L20): 종합(합<=10) + 복습 비중

## 힌트 문구 흐름(친구 말투)
- 오답 1회 → `hint.available`
- 힌트 오픈 → `hint.open`
- 규칙
  - b==0 또는 a==0 → `hint.zero_rule` → `hint.conclude`
  - b==1 또는 a==1 → `hint.one_rule` (+필요시 `hint.join_blocks`) → `hint.conclude`
  - 그 외 → `hint.count_on` + `hint.count_steps` → `hint.conclude`

## 선택형 오답 생성(4지선다)
- 후보: ans±1, |a-b|, a, b, ans±2
- 0..10 범위 유지, 중복 제거, 정답 제외
