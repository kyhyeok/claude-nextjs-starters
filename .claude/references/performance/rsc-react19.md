# RSC / React 19 / Next.js 16 성능 참조 (스텁)

> **상태**: TBD — 추후 작성 예정.
> 현재는 `performance-reviewer` 에이전트가 `docs/guides/nextjs-16.md` 와 `docs/guides/api-pattern.md` 를 직접 인용합니다.

## 채워질 내용 (예정)

- RSC vs Client 경계 결정 트리 (`'use client'` 위치 규칙)
- server-only 모듈 격리 패턴 (`src/lib/api/server-client.ts`, `server-only` 패키지)
- React 19 `use()` / `Suspense` / Streaming 흐름 — baseline 도입 시점/조건
- React Query 캐시 정책 (`staleTime` / `gcTime` / `refetchOnWindowFocus`) baseline 기본값
- query key 충돌 / 무효화 패턴 (`features/<도메인>/keys.ts` 모범)
- 번들 비용 안티패턴 (lodash 통째 import, moment, polyfill 자동 포함)
- Turbopack 캐시/HMR 관련 흔한 함정
- `useMemo`/`useCallback` 사용 기준 (핫패스 vs 비핫패스)

> 채워지기 전까지는 일반론으로 채우지 _말 것_ — `performance-reviewer`가 "주참조 없음"을 보고하도록 비워둔다.
