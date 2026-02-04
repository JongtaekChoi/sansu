이 폴더는 `specs/` JSON을 Next.js에서 import하기 위한 미러 경로입니다.

- 실제 소스: `/specs/u1-1/*.json`
- Next.js는 기본적으로 프로젝트 루트 기준 import가 편해서, `tsconfig paths`로 `@/specs/*`를 `src/specs/*`로 매핑할 수도 있습니다.

현재는 `src/app/page.tsx`에서 `@/specs/u1-1/*.json`을 바로 읽기 위해 `src/specs`에 심볼릭 링크를 두거나, 빌드 시 복사하는 방식으로 정리할 예정입니다.
