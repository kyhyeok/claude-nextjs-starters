# 🗺 개발 로드맵

> 이 문서는 **claude-nextjs-starters baseline 자체**의 개발 진행 상황과 향후 개선 방향을 추적합니다.
> 새 프로젝트 시작 시 이 로드맵을 복사해 도메인 작업으로 채워 사용해도 됩니다.

**📅 최종 업데이트**: 2026-05-04
**📊 진행 상황**: Phase 1~4 + 4.5/4.6/4.7 + 5-A + 5-B(가이드) + 5-C(가이드) + 5-E + 5-G + 5-H 완료 ✅ / Phase 5-D/F 옵션

---

## ✅ 완료된 Phase

### Phase 1: HTTP 클라이언트 코어 + TanStack Query Provider ✅

- ✅ `@tanstack/react-query` + `@tanstack/react-query-devtools` + `ky` 설치
- ✅ `src/lib/api/errors.ts` — `ApiError` 클래스 + `isApiError` 가드
- ✅ `src/lib/api/client.ts` — ky 인스턴스 팩토리 + 4xx/5xx 정규화 + 1회 재시도
- ✅ `src/lib/query/get-query-client.ts` — 서버=요청별 / 브라우저=싱글톤
- ✅ `src/components/providers/query-provider.tsx` — Devtools(dev-only) 포함
- ✅ `src/app/layout.tsx`에 Provider 통합 + 메타데이터 정정
- ✅ `src/lib/env.ts` — Zod 검증된 환경 변수
- ✅ `.env.example` 작성

### Phase 2: 인증 토큰 흐름 ✅

- ✅ `server-only` 패키지 도입 (서버 모듈 마킹)
- ✅ `src/lib/auth/config.ts` — 쿠키/엔드포인트/만료/라우트 상수
- ✅ `src/lib/auth/cookies.ts` — httpOnly 쿠키 입출력 (server-only)
- ✅ `src/lib/auth/session.ts` — `getSession()` 서버 헬퍼
- ✅ `src/lib/auth/use-auth.ts` — `useSession`/`useLogin`/`useLogout`
- ✅ `src/app/api/auth/login/route.ts` — 백엔드 위임 + 쿠키 저장
- ✅ `src/app/api/auth/logout/route.ts` — 쿠키 클리어 + 백엔드 호출
- ✅ `src/app/api/auth/refresh/route.ts` — 401 인터셉터가 호출
- ✅ `src/app/api/proxy/[...path]/route.ts` — catch-all 백엔드 프록시
- ✅ `src/proxy.ts` — Next.js 16 신 컨벤션 보호 라우트 (구 middleware)
- ✅ ky 인스턴스에 401 자동 리프레시 인터셉터 (단일 in-flight 보장)

### Phase 3: orval + 코드 생성 파이프라인 ✅

- ✅ `orval` + `@faker-js/faker` 설치
- ✅ `openapi/example.yaml` — 예시 OpenAPI 3.0 스펙 (users 도메인)
- ✅ `orval.config.ts` — `client: 'fetch'` + custom mutator + MSW mock 자동 생성
- ✅ `src/lib/api/orval-mutator.ts` — orval ↔ ky 브릿지
- ✅ `npm run gen:api` 스크립트
- ✅ `src/lib/api/generated/` 출력 (lint/format 제외 처리)
- ✅ `src/features/users/` — 도메인 표준 패턴 (keys/queries/mutations/index)
- ✅ Query Key Factory (hierarchical, tkdodo 패턴)
- ✅ `.prettierignore`, `eslint.config.mjs`에 generated 디렉터리 제외

### Phase 4: MSW 설정 + 예시 feature ✅

- ✅ `msw` v2 설치, `npx msw init public/`
- ✅ orval mock `baseUrl: '/api/proxy'` 설정 (클라이언트 트래픽과 일치)
- ✅ `src/mocks/handlers.ts` — 도메인 mock 통합
- ✅ `src/mocks/browser.ts` — `setupWorker`
- ✅ `src/mocks/init.ts` — dev + 토글 활성화 시에만 시작 (dynamic import)
- ✅ `src/components/providers/mock-provider.tsx` — worker 준비 후 children 렌더
- ✅ `src/app/users/page.tsx` — 통합 흐름 데모 페이지
- ✅ `npm run check-all` + `npm run build` 통과 확인

### Phase 4.5: 문서 정비 ✅

- ✅ NotionQuote 잔재 제거 (PRD/ROADMAP)
- ✅ baseline 정체성 문서로 PRD 재작성
- ✅ `docs/guides/project-structure.md` 새 구조 반영
- ✅ 신규 가이드 작성: `api-pattern.md`, `auth-pattern.md`, `mocking-msw.md`
- ✅ `forms-react-hook-form.md`에 mutation 훅 패턴 섹션 추가
- ✅ `nextjs-16.md`에 middleware → proxy 노트 추가
- ✅ `CLAUDE.md` 가이드 링크/명령어/환경변수 업데이트
- ✅ `update-roadmap` 명령어 일반화

### Phase 4.6: 백엔드 스펙 통합 가이드 ✅

- ✅ `docs/guides/backend-spec-integration.md` 신규 작성
- ✅ SpringDoc(OpenAPI) / Spring restDocs / 둘 다 사용 시나리오 3종 정리
- ✅ `restdocs-api-spec` 변환 플러그인 적용 절차
- ✅ orval `input.target` 옵션별 사용법 (URL / 파일 / multi-config)
- ✅ 흔한 함정 (3.0 vs 3.1, snake/camel, 누락 엔드포인트)
- ✅ CLAUDE.md / PRD.md / api-pattern.md에 가이드 링크 추가

### Phase 4.7: 검증 + env 분리 + 폼 패턴 일관화 ✅

- ✅ Playwright로 dev 서버 E2E 검증 (mock → /api/proxy 가로챔 → 페이지 렌더)
- ✅ 검증 중 발견한 ZodError 수정: `lib/env.ts` → `env/server.ts` + `env/client.ts` 분리
- ✅ `createServerApiClient`을 `lib/api/server-client.ts`로 분리 (server-only)
- ✅ login-form/signup-form을 RHF + Zod + useLogin/useSignup + applyApiErrorToForm 패턴으로 재작성
- ✅ `lib/forms/api-error-to-form.ts` 헬퍼 도입
- ✅ `app/api/auth/signup/route.ts` 신규
- ✅ `lib/auth/form-schemas.ts` 신규

### Phase 5-A: 테스트 베이스라인 ✅

- ✅ Vitest 4 + @vitejs/plugin-react + jsdom 설치 + `vitest.config.ts`
- ✅ `@testing-library/react` + `jest-dom` + `user-event` 설치
- ✅ `src/test/setup.ts` — jest-dom matchers + MSW node lifecycle + jsdom 폴리필 (ResizeObserver/IntersectionObserver/matchMedia/scrollIntoView)
- ✅ `src/mocks/server.ts` — MSW node server (browser와 핸들러 공유)
- ✅ 단위 테스트 예시: `src/lib/forms/api-error-to-form.test.ts` (5 케이스)
- ✅ 컴포넌트 테스트 예시: `src/components/login-form.test.tsx` (3 케이스, RTL + user-event)
- ✅ Playwright 1.59 설치 + `playwright.config.ts` (webServer 자동, MSW 활성화)
- ✅ E2E 예시: `tests/e2e/users-page.spec.ts`, `auth-protection.spec.ts` (4 케이스)
- ✅ npm scripts: `test`, `test:watch`, `test:e2e`, `test:e2e:ui`
- ✅ `.github/workflows/ci.yml`에 test/e2e job 활성화 + Playwright 브라우저 캐싱 + report 아티팩트
- ✅ `docs/guides/testing.md` 신규 작성 (3계층 전략 + 작성 패턴 + 함정 6종)
- ✅ `.gitignore`에 test-results/, playwright-report/ 등 추가
- ✅ 검증: `npm run test` (8/8) + `npm run test:e2e` (4/4) 통과

### Phase 5-H: 운영 준비 보강 (헬스체크 + Request ID + CSP) ✅

baseline의 *운영 단계 빈틈*을 코드 + 가이드로 보강.

- ✅ `app/api/health/route.ts` — 무인증 헬스체크 (Vercel/uptime 모니터링용)
- ✅ `lib/api/request-id.ts` — `X-Request-ID` 자동 생성/전파 헬퍼
- ✅ `lib/api/client.ts`의 ky beforeRequest에 X-Request-ID 자동 부착
- ✅ `app/api/proxy/[...path]/route.ts`에 X-Request-ID 보존/echo
- ✅ `next.config.ts` 보안 헤더 보강:
  - HSTS (`max-age=63072000; includeSubDomains; preload`)
  - Permissions-Policy (camera/microphone/geolocation/interest-cohort 차단)
  - X-DNS-Prefetch-Control
  - Content-Security-Policy (환경별 동적 — dev/prod 분기)
- ✅ `docs/guides/security-headers.md` 신규 (헤더 8종 + CSP 정책 + 외부 도메인 추가 절차 + nonce 마이그레이션 + Report-Only + X-Request-ID 흐름 + 헬스체크 + 함정 6종)
- ✅ CLAUDE.md / PRD.md에 가이드 링크 추가

### Phase 5-G: Mobile-First 보강 ✅

- ✅ `docs/guides/styling-guide.md`에 mobile-first 원칙/단계별 워크플로우/패턴 6선/함정 5선/체크리스트 추가
- ✅ `src/app/layout.tsx`에 `viewport` export 추가 (`width=device-width`, `initialScale=1`, `themeColor` light/dark)
- ✅ `playwright.config.ts`에 `mobile-ios`(iPhone 14) + `mobile-android`(Pixel 7) 프로젝트 추가
- ✅ 모바일 프로젝트는 chromium 엔진으로 실행 (회귀 방지 충분, webkit은 옵션)
- ✅ 검증: E2E 12/12 통과 (desktop + mobile-ios + mobile-android 각 4건)

### Phase 5-E: GitHub Actions CI + Vercel 배포 가이드 ✅

- ✅ `.github/workflows/ci.yml` 작성 (check + build, concurrency cancel-in-progress)
- ✅ Phase 5-A 도입 시 활성화할 test job을 주석으로 미리 골격 포함
- ✅ `docs/guides/deploy-vercel.md` 신규 작성 (책임 분담/환경변수/Runtime/함정)
- ✅ Branch Protection 셋업 가이드 포함
- ✅ CLAUDE.md / PRD.md에 가이드 링크 추가

---

## 🛣 향후 개선 옵션 (Phase 5 후보)

> 아래 항목들은 **모든 프로젝트에 필요하지는 않으므로** 필요 시점에 baseline에 통합합니다.
> 도입 결정 시 이 로드맵의 *완료 Phase*로 이동하고 가이드를 작성합니다.

### ~~Phase 5-A: 테스트 베이스라인~~ → _완료 Phase로 이동됨_ (위 Phase 5-A 참조)

### Phase 5-B: i18n — 가이드만 baseline에 포함 (도입은 옵션)

baseline 코드는 단일 언어 유지. 다국어 필요 시 가이드 따라 1~2시간에 도입.

- ✅ `docs/guides/i18n.md` 신규 작성 (책임 분담 / 패턴 비교 / 도입 절차 10단계 / 백엔드 합의 체크리스트 / 함정 7종)
- ✅ CLAUDE.md / PRD.md에 가이드 링크 추가
- [ ] (도입 시점에) next-intl 설치 + `[locale]` 라우팅 + 메시지 번들
- [ ] (도입 시점에) `proxy.ts`에 `intlMiddleware` 합성
- [ ] (도입 시점에) `ApiError.code` → 메시지 매핑 헬퍼
- [ ] (도입 시점에) 폼 스키마 메시지 키화

### Phase 5-C: 모니터링 — 가이드만 baseline에 포함 (도입은 옵션)

baseline 코드는 SDK 미포함. 프로덕션 출시 직전에 가이드 따라 도입.

- ✅ `docs/guides/monitoring.md` 신규 작성 (Prom+Graf vs Sentry 분담 / Sentry 도입 8단계 / 가벼운 대안 5종 비교 / `ApiError` 통합 패턴 / PII 필터링 / 무료 한도 관리 / 백엔드 합의)
- ✅ CLAUDE.md / PRD.md에 가이드 링크 추가
- [ ] (도입 시점에) `@sentry/nextjs` 설치 + wizard
- [ ] (도입 시점에) `client.ts`의 5xx만 captureException
- [ ] (도입 시점에) `global-error.tsx` + PII 필터링
- [ ] (도입 시점에) source map 업로드 CI 시크릿

### Phase 5-D: 컴포넌트 카탈로그 (추천도 ⭐)

- [ ] **Storybook** v8 (Next.js 16 호환 확인)
- [ ] shadcn 컴포넌트 스토리 자동 등록 패턴
- [ ] MSW Storybook addon 통합 (이미 갖춘 mocks 재사용)

### ~~Phase 5-E: CI/CD 베이스라인~~ → _완료 Phase로 이동됨_ (위 Phase 5-E 참조)

### Phase 5-F: 클라이언트 전역 상태 (추천도 ⭐)

- [ ] **Zustand** 또는 **Jotai** 패턴 가이드
- [ ] TanStack Query 캐시와 분리 원칙 (서버 상태 vs 클라이언트 UI 상태)
- [ ] persist 미들웨어 + SSR hydration 안전 패턴

---

## 🧩 도메인 추가 표준 절차 (반복 작업)

> 새 도메인을 baseline에 추가할 때는 *Phase가 아니라 절차*입니다. ROADMAP에 기록하지 않고 진행하세요.

1. `openapi/<spec>.yaml`에 엔드포인트 추가 → `npm run gen:api`
2. `src/features/<도메인>/`에 `keys.ts`, `queries.ts`, `mutations.ts`, `index.ts` 작성
3. (선택) 보호 라우트라면 `src/proxy.ts`의 `config.matcher`에 추가
4. 컴포넌트에서 `import { useXxxQuery } from '@/features/<도메인>'`
5. (옵션) `src/mocks/handlers.ts`에 커스텀 mock 추가

자세한 흐름: [`./guides/api-pattern.md`](./guides/api-pattern.md)

---

## 📋 Phase 추가 시 작성 규칙

새 Phase를 시작할 때:

1. 위 *향후 개선 옵션*에서 해당 항목을 *완료된 Phase*로 옮김
2. 작업 전 체크리스트 작성 (`- [ ]`)
3. 작업 완료 시 `- [x]` 또는 `✅` 표시
4. 모든 항목 완료 시 Phase 제목에 `✅` 추가
5. 문서 상단 _최종 업데이트_ 날짜 갱신
6. 관련 가이드를 `docs/guides/`에 작성/업데이트

`/update-roadmap` 명령어로 자동화 가능 — 자세히는 `.claude/commands/docs/update-roadmap.md` 참조.
