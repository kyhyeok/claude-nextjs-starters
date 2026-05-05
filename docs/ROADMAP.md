# 🗺 개발 로드맵

> 이 문서는 **claude-nextjs-starters baseline 자체**의 개발 진행 상황과 향후 개선 방향을 추적합니다.
> 새 프로젝트 시작 시 이 로드맵을 복사해 도메인 작업으로 채워 사용해도 됩니다.

**최종 업데이트**: 2026-05-05
**진행 상황**: **baseline 마감** — Phase 1~4 + 4.5/4.6/4.7 + 5-A + 5-B(가이드) + 5-C(가이드) + 5-E + 5-G + 5-H + 5-I + 5-J + 5-K-pre + 5-K + 5-L 완료 / Phase 5-D 옵션 (도입은 *실제 필요 시점*에)

> baseline은 *런타임 코드*뿐 아니라 _Claude Code 협업 인프라_(`.claude/` 권한·훅)도 포함합니다.

> **baseline은 마감되었습니다.** 이후 작업은:
>
> - 새 도메인 추가 → ROADMAP에 기록하지 않고 *절차*로 진행 (아래 _도메인 추가 표준 절차_ 참조)
> - 옵션 Phase(5-D/F) 도입 → 도입 시점에 이 ROADMAP의 *완료 Phase*로 이동
> - i18n / Sentry / OAuth 콜백 등 _가이드만 있는_ 항목 → 실제 도입 시 가이드 따라 진행

---

## ✅ 완료된 Phase

### Phase 1: HTTP 클라이언트 코어 + TanStack Query Provider ✅

- `@tanstack/react-query` + `@tanstack/react-query-devtools` + `ky` 설치
- `src/lib/api/errors.ts` — `ApiError` 클래스 + `isApiError` 가드
- `src/lib/api/client.ts` — ky 인스턴스 팩토리 + 4xx/5xx 정규화 + 1회 재시도
- `src/lib/query/get-query-client.ts` — 서버=요청별 / 브라우저=싱글톤
- `src/components/providers/query-provider.tsx` — Devtools(dev-only) 포함
- `src/app/layout.tsx`에 Provider 통합 + 메타데이터 정정
- `src/lib/env.ts` — Zod 검증된 환경 변수
- `.env.example` 작성

### Phase 2: 인증 토큰 흐름 ✅

- `server-only` 패키지 도입 (서버 모듈 마킹)
- `src/lib/auth/config.ts` — 쿠키/엔드포인트/만료/라우트 상수
- `src/lib/auth/cookies.ts` — httpOnly 쿠키 입출력 (server-only)
- `src/lib/auth/session.ts` — `getSession()` 서버 헬퍼
- `src/lib/auth/use-auth.ts` — `useSession`/`useLogin`/`useLogout`
- `src/app/api/auth/login/route.ts` — 백엔드 위임 + 쿠키 저장
- `src/app/api/auth/logout/route.ts` — 쿠키 클리어 + 백엔드 호출
- `src/app/api/auth/refresh/route.ts` — 401 인터셉터가 호출
- `src/app/api/proxy/[...path]/route.ts` — catch-all 백엔드 프록시
- `src/proxy.ts` — Next.js 16 신 컨벤션 보호 라우트 (구 middleware)
- ky 인스턴스에 401 자동 리프레시 인터셉터 (단일 in-flight 보장)

### Phase 3: orval + 코드 생성 파이프라인 ✅

- `orval` + `@faker-js/faker` 설치
- `openapi/example.yaml` — 예시 OpenAPI 3.0 스펙 (users 도메인)
- `orval.config.ts` — `client: 'fetch'` + custom mutator + MSW mock 자동 생성
- `src/lib/api/orval-mutator.ts` — orval ↔ ky 브릿지
- `npm run gen:api` 스크립트
- `src/lib/api/generated/` 출력 (lint/format 제외 처리)
- `src/features/users/` — 도메인 표준 패턴 (keys/queries/mutations/index)
- Query Key Factory (hierarchical, tkdodo 패턴)
- `.prettierignore`, `eslint.config.mjs`에 generated 디렉터리 제외

### Phase 4: MSW 설정 + 예시 feature ✅

- `msw` v2 설치, `npx msw init public/`
- orval mock `baseUrl: '/api/proxy'` 설정 (클라이언트 트래픽과 일치)
- `src/mocks/handlers.ts` — 도메인 mock 통합
- `src/mocks/browser.ts` — `setupWorker`
- `src/mocks/init.ts` — dev + 토글 활성화 시에만 시작 (dynamic import)
- `src/components/providers/mock-provider.tsx` — worker 준비 후 children 렌더
- `src/app/users/page.tsx` — 통합 흐름 데모 페이지
- `npm run check-all` + `npm run build` 통과 확인

### Phase 4.5: 문서 정비 ✅

- NotionQuote 잔재 제거 (PRD/ROADMAP)
- baseline 정체성 문서로 PRD 재작성
- `docs/guides/project-structure.md` 새 구조 반영
- 신규 가이드 작성: `api-pattern.md`, `auth-pattern.md`, `mocking-msw.md`
- `forms-react-hook-form.md`에 mutation 훅 패턴 섹션 추가
- `nextjs-16.md`에 middleware → proxy 노트 추가
- `CLAUDE.md` 가이드 링크/명령어/환경변수 업데이트
- `update-roadmap` 명령어 일반화

### Phase 4.6: 백엔드 스펙 통합 가이드 ✅

- `docs/optional/backend-spec-integration.md` 신규 작성
- SpringDoc(OpenAPI) / Spring restDocs / 둘 다 사용 시나리오 3종 정리
- `restdocs-api-spec` 변환 플러그인 적용 절차
- orval `input.target` 옵션별 사용법 (URL / 파일 / multi-config)
- 흔한 함정 (3.0 vs 3.1, snake/camel, 누락 엔드포인트)
- CLAUDE.md / PRD.md / api-pattern.md에 가이드 링크 추가

### Phase 4.7: 검증 + env 분리 + 폼 패턴 일관화 ✅

- Playwright로 dev 서버 E2E 검증 (mock → /api/proxy 가로챔 → 페이지 렌더)
- 검증 중 발견한 ZodError 수정: `lib/env.ts` → `env/server.ts` + `env/client.ts` 분리
- `createServerApiClient`을 `lib/api/server-client.ts`로 분리 (server-only)
- login-form/signup-form을 RHF + Zod + useLogin/useSignup + applyApiErrorToForm 패턴으로 재작성
- `lib/forms/api-error-to-form.ts` 헬퍼 도입
- `app/api/auth/signup/route.ts` 신규
- `lib/auth/form-schemas.ts` 신규

### Phase 5-A: 테스트 베이스라인 ✅

- Vitest 4 + @vitejs/plugin-react + jsdom 설치 + `vitest.config.ts`
- `@testing-library/react` + `jest-dom` + `user-event` 설치
- `src/test/setup.ts` — jest-dom matchers + MSW node lifecycle + jsdom 폴리필 (ResizeObserver/IntersectionObserver/matchMedia/scrollIntoView)
- `src/mocks/server.ts` — MSW node server (browser와 핸들러 공유)
- 단위 테스트 예시: `src/lib/forms/api-error-to-form.test.ts` (5 케이스)
- 컴포넌트 테스트 예시: `src/components/login-form.test.tsx` (3 케이스, RTL + user-event)
- Playwright 1.59 설치 + `playwright.config.ts` (webServer 자동, MSW 활성화)
- E2E 예시: `tests/e2e/users-page.spec.ts`, `auth-protection.spec.ts` (4 케이스)
- npm scripts: `test`, `test:watch`, `test:e2e`, `test:e2e:ui`
- `.github/workflows/ci.yml`에 test/e2e job 활성화 + Playwright 브라우저 캐싱 + report 아티팩트
- `docs/guides/testing.md` 신규 작성 (3계층 전략 + 작성 패턴 + 함정 6종)
- `.gitignore`에 test-results/, playwright-report/ 등 추가
- 검증: `npm run test` (8/8) + `npm run test:e2e` (4/4) 통과

### Phase 5-E: GitHub Actions CI + Vercel 배포 가이드 ✅

- `.github/workflows/ci.yml` 작성 (check + build, concurrency cancel-in-progress)
- Phase 5-A 도입 후 test/e2e job 활성화 + Playwright 브라우저 캐싱 + report 아티팩트
- `docs/optional/deploy-vercel.md` 신규 작성 (책임 분담/환경변수/Runtime/함정)
- Branch Protection 셋업 가이드 포함
- CLAUDE.md / PRD.md에 가이드 링크 추가

### Phase 5-G: Mobile-First 보강 ✅

- `docs/guides/styling-guide.md`에 mobile-first 원칙/단계별 워크플로우/패턴 6선/함정 5선/체크리스트 추가
- `src/app/layout.tsx`에 `viewport` export 추가 (`width=device-width`, `initialScale=1`, `themeColor` light/dark)
- `playwright.config.ts`에 `mobile-ios`(iPhone 14) + `mobile-android`(Pixel 7) 프로젝트 추가
- 모바일 프로젝트는 chromium 엔진으로 실행 (회귀 방지 충분, webkit은 옵션)
- 검증: E2E 12/12 통과 (desktop + mobile-ios + mobile-android 각 4건)

### Phase 5-H: 운영 준비 보강 (헬스체크 + Request ID + CSP) ✅

baseline의 *운영 단계 빈틈*을 코드 + 가이드로 보강.

- `app/api/health/route.ts` — 무인증 헬스체크 (Vercel/uptime 모니터링용)
- `lib/api/request-id.ts` — `X-Request-ID` 자동 생성/전파 헬퍼
- `lib/api/client.ts`의 ky beforeRequest에 X-Request-ID 자동 부착
- `app/api/proxy/[...path]/route.ts`에 X-Request-ID 보존/echo
- `next.config.ts` 보안 헤더 보강:
  - HSTS (`max-age=63072000; includeSubDomains; preload`)
  - Permissions-Policy (camera/microphone/geolocation/interest-cohort 차단)
  - X-DNS-Prefetch-Control
  - Content-Security-Policy (환경별 동적 — dev/prod 분기)
- `docs/guides/security-headers.md` 신규 (헤더 8종 + CSP 정책 + 외부 도메인 추가 절차 + nonce 마이그레이션 + Report-Only + X-Request-ID 흐름 + 헬스체크 + 함정 6종)
- CLAUDE.md / PRD.md에 가이드 링크 추가

### Phase 5-I: .claude/ Harness 정비 ✅

baseline의 *Claude Code 협업 인프라*를 권한 정책 + 자동 검증 훅으로 정비. 코드 변경은 `.claude/` 디렉터리에 한정.

**Permission Harness — 공유 deny 정책 + 개인 설정 분리** (커밋 `89baf29`):

- `.claude/settings.json` (공유) — env/secret/key 읽기 차단, 파괴적 git/rm 차단, generated 디렉터리 보호
- `.claude/settings.local.json` (개인) — allow 목록과 MCP 설정 분리 + gitignore

**Verification Harness — ask 등급 + 자동 prettier/typecheck** (커밋 `4df5ea0`):

- `ask` 등급 추가: `git commit/push`, `npm install/i/uninstall/remove`, `docker compose/-compose`
- PostToolUse 훅 (`.claude/hooks/post-edit-prettier.sh`): Edit/Write/MultiEdit 후 변경 파일 자동 prettier (프로젝트 외부/미지원 확장자/존재하지 않는 파일은 silent-skip)
- Stop 훅 (`.claude/hooks/typecheck-on-stop.sh`): `git status --porcelain`에서 `.ts/.tsx` 변경이 있을 때만 `npm run typecheck` 실행, 실패 시 exit 2로 Claude에 후속 작업 위임 (`stop_hook_active` 무한 루프 방지)
- 미사용 Slack 훅 2종 제거 (`stop-hook.sh`, `notification-hook.sh`) — 외부 참조 0건 grep 확인 후 삭제

검증: ask 등급은 실 운영 사이클 1회 (`git commit` + `git push`)에서 정상 동작 확인.

### Phase 5-L: 문서 다이어트 + 테스트 옵션화 ✅

baseline 정체성 검증 결과 _코드는 lean / 문서는 over-engineered_ 진단(문서 9,115 LOC vs 코드 4,310 LOC = **2.11×**, 22개 가이드 1차 학습 부담). PRD 약속인 _"1일 onboarding"_ 을 실제로 닫기 위해 가이드를 **3-tier(Core 5 / Reference 10 / Optional 5+1)** 로 분류하고, Playwright E2E를 옵션으로 격하.

**산출 (5단계)**:

- 1단계 (커밋 `30becad`): 22개 가이드를 Core(5) / Reference(10) / Optional(5)로 분류. _baseline 코드 미포함_ 5종(`backend-spec-integration` / `deploy-vercel` / `file-upload-pattern` / `i18n` / `monitoring`)을 `docs/optional/`로 격리 (`git mv` rename 100%, 내용 무변동). CLAUDE.md / PRD.md / README.md "개발 가이드" 섹션을 3-tier 구조로 재배치. ROADMAP / api-pattern / security-headers 내부 참조 경로 동시 갱신.
- 2단계 (커밋 `8e071ac`): `agent-workflow.md` 보강 — §1 도입부에 *`.claude/` 자산 23개*와 _docs/guides 22개_ 책임 분리 명시. §2 세션 유형 A/B/C/D 각각에 _"📚 함께 펼치는 가이드"_ 박스 추가 (작업 성격별 Core/Reference/Optional 매핑). 자산 개수(23) 표현은 정확하므로 그대로 유지.
- 3단계 (커밋 `6f48326`): Playwright E2E를 옵션으로 격하. `@playwright/test` devDep + `test:e2e`/`test:e2e:ui` scripts + `playwright.config.ts`(75 LOC) + `tests/e2e/`(64 LOC) + `ci.yml` e2e job(38줄) 제거. 동등한 코드를 `docs/optional/e2e-playwright.md`의 _§보존 코드 1~4_ 에 그대로 복사 보존(5분 재도입 절차). `testing.md`는 _기본 2계층(단위/컴포넌트) + 옵션 E2E_ 로 격하.
- 4단계 (커밋 `b6fee59`): ROADMAP에 Phase 5-L 본문 블록 + 측정 변화 표 등재. PRD §설계 원칙·§성공 기준에 _"Core 5개 = 1,445 LOC로 학습 경로 닫힘"_ 명시.
- 5단계 (커밋 `bb24fff`): Phase L-6 신규 멤버 시뮬레이션에서 발견된 README의 Playwright 잔재 정리 — 기술 스택 표 / 빠른 시작 / 자주 쓰는 명령어 3곳에서 _작동하지 않는 명령어_(`npm run test:e2e`, `npx playwright install chromium`) 제거 후 옵션 가이드 안내로 대체. _PRD "1일 onboarding" 약속 직접 위반_ 부채 해소.

**의존성 변화**: `@playwright/test@^1.59.1` 제거 (devDep -1). _Next.js 16의 optional peer dependency_ 로 lockfile에는 자동 흔적이 남지만 빌드/런타임 영향 0.

**측정 변화 (Phase 5-L 전 → 후)**:

| 지표                        | 이전         | 현재         | 효과                        |
| --------------------------- | ------------ | ------------ | --------------------------- |
| 1차 학습 부담 (Core LOC)    | 9,115 (22개) | 1,445 (5개)  | **-84%**                    |
| 가이드 LOC (`docs/guides`)  | ~9,115       | 6,749 (15개) | -26%                        |
| 옵션 LOC (`docs/optional`)  | 0            | 2,157 (6개)  | 신규 — 도입 시점만 펼침     |
| dev deps                    | 25           | 24           | -1 (Playwright)             |
| 직접 의존성 / Core LOC 비율 | 2.11×        | **0.34×**    | _PRD "1일 onboarding" 정합_ |

**효과**:

- _신규 멤버 1차 학습 경로_ 가 22개 → **5개** 로 닫힘 (Core: agent-workflow / project-structure / api-pattern / auth-pattern / mocking-msw)
- _세션 진입점_(`agent-workflow.md`)이 _3-tier 구조_ 와 _가이드 매핑_ 양쪽 인덱스 통합 → 세션 유형 결정 → .claude 자산 + docs 가이드 한 흐름
- _Playwright 부재 비용 0_ — 옵션 가이드의 §보존 코드 4종을 그대로 복사하면 5분 안에 baseline 시점 상태 복구
- baseline 정체성("필요 시 추가") 정합 강화

**검증**: 단계별로 `npm run check-all` (typecheck + lint + format) + `npm run build` 통과. Vitest 8/8 통과. 옛 가이드 경로 잔재 0건 / 새 경로 참조 24건 정상 분포.

### Phase 5-K: 횡단 패턴 — 낙관적 업데이트 + 파일 업로드 ✅

baseline 경계 정책의 _Layer 1 (behavior)_ 와 _Layer 4 (workflow)_ 영역에서 빈도 높은 횡단 패턴 2종을 코드와 가이드로 처리. 빈도·분기 수에 따라 _코드 + 가이드_ 와 _가이드만_ 으로 분담.

**산출 (2단계)**:

- 1단계 (커밋 `3d6e48d`): 빈도 9~10/10 횡단 패턴(좋아요/즐겨찾기/장바구니/투표)을 위해 `src/lib/query/optimistic.ts` 신규 — `applyOptimisticUpdate<TData>()` 헬퍼 1개(~41줄). 표준 4단계 중 cancel → snapshot → setQueryData 자동화 + rollback 클로저 반환. `invalidateQueries`는 도메인이 `onSettled`에서 명시 호출(명시성 우선). `docs/guides/optimistic-update-pattern.md` 신규(340줄) — 결정 테이블 + 표준 4단계 도식 + 사용 패턴 3종 + 함정 6선. CLAUDE.md / PRD.md 가이드 링크 추가.
- 2단계 (커밋 `512b97f`): 빈도 5/10 파일 업로드는 _baseline 코드 미포함 + 가이드만_ 처리. `docs/guides/file-upload-pattern.md` 신규 — 흐름 결정 트리(A presigned ⭐ / B 백엔드 다이렉트 / C `/api/proxy` 경유) + Vercel 4.5MB·CORS preflight·presigned 만료 함정 사전 고지 + UI 라이브러리 비교 + 클라/서버 검증 책임 분리 + UX 패턴 + 백엔드 합의 체크리스트 + 함정 7선. `src/` 변경 0건. _Phase 5-L에서 이 가이드는 `docs/optional/file-upload-pattern.md`로 이동_.

**baseline 정체성 정렬**:

- Layer 1 (behavior) — `applyOptimisticUpdate`는 단일 함수, 분기 옵션 0, 단일 queryKey. 다중 쿼리는 도메인이 헬퍼를 여러 번 호출
- Layer 4 (workflow) — 파일 업로드는 _흐름·합의는 baseline_ / _라이브러리·UX·시각은 도메인 자유_
- KISS — 5-K 원안의 `useFileUpload`(분기 7항목) 제외, _빈도 9~10 헬퍼 + 빈도 5 가이드만_ 으로 압축

**검증**: 단계별 `npm run check-all` + `npm run build` 통과 (11 routes 유지).

### Phase 5-K-pre: baseline 정체성 정리 (랜딩 + UI 셸 + 의존성) ✅

baseline 정체성 검증 결과 발견된 _starter 잔재_ + 도메인 박힘 위반을 일괄 정리. 핵심 가치 영역(데이터/인증/모킹/패턴)은 PRD 정체성에 충실히 정렬되어 있었으나, **UI 셸 영역에 starter-cleaner 잔재가 남아 있어** 새 도메인 복사 시 *첫 작업이 sections/header/footer 갈아엎기*가 되는 구조였음.

**산출 (3단계)**:

- 1단계 (커밋 `22839e0`): `src/components/sections/{hero,features,cta}.tsx` 삭제 — 셀프 마케팅 콘텐츠 박힘 (Next.js 15 stale + `git clone .../your-repo/...` placeholder URL 잔재 포함). `src/app/page.tsx`를 *최소 환영 페이지*로 단순화 (Phase 1~4 데모 + 로그인 진입 링크 + api-pattern.md 안내 카드 2개).
- 2단계 (커밋 `ae75570`): `src/components/layout/{header,footer}.tsx` + `src/components/navigation/{main-nav,mobile-nav}.tsx` 4개 파일 삭제 (~150줄). *모두 page.tsx 단 1곳에서만 사용된 랜딩 데모 셸*이었음. login/signup/users 페이지는 이미 자기 셸을 가짐. `usehooks-ts` 의존성 제거 — Header의 `useMediaQuery` 1곳에서만 쓰던 외부 의존성, 사용처 0건 후 정리.
- 3단계: `src/app/layout.tsx` metadata를 `Frontend Baseline`으로 일반화 (NextJS Starter 자체 마케팅 제거). ROADMAP에 5-K-pre 등재 + 진행 상황 갱신.

**의존성 변화**: `usehooks-ts@^3.1.1` 제거 (외부 의존성 -1).

**효과**:

- baseline은 *데이터/인증/모킹/패턴*에 집중. UI 셸은 _도메인 영역으로 추방_ (Headless First 정신)
- 도메인 복사 시 `page.tsx` 1개 + `layout.tsx` metadata만 교체하면 _자체 랜딩 시작_ 가능 (이전: sections 3개 + header/footer/nav 4개 + page 셸 + layout metadata = 8곳 손봐야 했음)
- 새 도메인은 자기 헤더/푸터/네비를 shadcn `Sheet`/`NavigationMenu` 프리미티브로 _자유 조립_

**검증**: 3단계별로 `npm run check-all` (typecheck + lint + format) 통과 + `npm run build` 통과 (11 routes 유지).

### Phase 5-J: 데이터 표시 횡단 패턴 ✅

baseline 경계 정책의 _Layer 1~4_ 영역에서 도메인 표시 횡단 패턴을 코드와 가이드로 제공. *시각적 결정*은 도메인 자유로 보장 — 같은 훅·프리미티브를 써도 e커머스/배달/채용/커뮤니티 등 도메인의 디자인은 모두 다르게 나옴.

**전제** (커밋 `cae563a`): PRD에 baseline 경계 정책 5조 명문화 — 5-Layer 추상화 모델 + 정책 (Headless First / Slot 패턴 / 디자인 토큰 분리 / No Domain Nouns / 3-도메인 검증 룰) + CLAUDE.md `🚫 핵심 금지사항`에 도메인 명사 컴포넌트 추가 금지 한 줄.

**산출 (코드)**:

- `src/stores/ui-store.ts` — Zustand 표준 store (sidebar/command palette 토글, 도메인 무관)
- `src/lib/hooks/use-list-query-params.ts` — 검색·필터·페이지·정렬 URL 동기화 훅 (~120줄, 자체 구현, 의존성 0)
- `src/lib/hooks/use-infinite-scroll.ts` — IntersectionObserver 트리거 ref callback (~75줄)
- `src/components/ui/empty-state.tsx` — `role="status"` 빈 상태 프리미티브 (Slot 패턴, 기본 일러스트/문구 0)
- `src/components/ui/error-state.tsx` — `role="alert"` 에러 상태 프리미티브 (구조 동일, 시맨틱만 다름)

**산출 (가이드)**:

- `docs/guides/state-client.md` 신규 — 서버/클라이언트 상태 분리 + Zustand 패턴 + selector + persist + SSR 함정
- `docs/guides/list-pattern.md` 신규 — `useListQueryParams` 사용 + 디바운스 + push/replace + 페이지네이션 vs 무한스크롤 + `useInfiniteScroll` + Empty/Error/Skeleton 통합 패턴 + 함정 15종
- `docs/guides/toast-pattern.md` 신규 — 호출 시점 의사결정 + 표준 3단계 패턴 (성공→success / 4xx 매핑→인라인 / 폴백→error) + 메시지 가이드 + 함정 7종

**의존성 추가**: `zustand@^5.0.13` (1개)

**검증**: 5단계별 typecheck + lint + prettier + lint-staged 모든 단계 통과. typecheck 1회 실패(EmptyState `title` 속성 충돌) → `Omit<..., 'title'>`로 수정 후 통과.

---

## 🛣 향후 개선 옵션 (Phase 5 후보)

> 아래 항목들은 **모든 프로젝트에 필요하지는 않으므로** 필요 시점에 baseline에 통합합니다.
> 도입 결정 시 이 로드맵의 *완료 Phase*로 이동하고 가이드를 작성합니다.

### ~~Phase 5-A: 테스트 베이스라인~~ → _완료 Phase로 이동됨_ (위 Phase 5-A 참조)

### Phase 5-B: i18n — 가이드만 baseline에 포함 (도입은 옵션)

baseline 코드는 단일 언어 유지. 다국어 필요 시 가이드 따라 1~2시간에 도입.

- `docs/optional/i18n.md` 신규 작성 (책임 분담 / 패턴 비교 / 도입 절차 10단계 / 백엔드 합의 체크리스트 / 함정 7종)
- CLAUDE.md / PRD.md에 가이드 링크 추가
- [ ] (도입 시점에) next-intl 설치 + `[locale]` 라우팅 + 메시지 번들
- [ ] (도입 시점에) `proxy.ts`에 `intlMiddleware` 합성
- [ ] (도입 시점에) `ApiError.code` → 메시지 매핑 헬퍼
- [ ] (도입 시점에) 폼 스키마 메시지 키화

### Phase 5-C: 모니터링 — 가이드만 baseline에 포함 (도입은 옵션)

baseline 코드는 SDK 미포함. 프로덕션 출시 직전에 가이드 따라 도입.

- `docs/optional/monitoring.md` 신규 작성 (Prom+Graf vs Sentry 분담 / Sentry 도입 8단계 / 가벼운 대안 5종 비교 / `ApiError` 통합 패턴 / PII 필터링 / 무료 한도 관리 / 백엔드 합의)
- CLAUDE.md / PRD.md에 가이드 링크 추가
- [ ] (도입 시점에) `@sentry/nextjs` 설치 + wizard
- [ ] (도입 시점에) `client.ts`의 5xx만 captureException
- [ ] (도입 시점에) `global-error.tsx` + PII 필터링
- [ ] (도입 시점에) source map 업로드 CI 시크릿

### Phase 5-D: 컴포넌트 카탈로그 (추천도 ⭐)

- [ ] **Storybook** v8 (Next.js 16 호환 확인)
- [ ] shadcn 컴포넌트 스토리 자동 등록 패턴
- [ ] MSW Storybook addon 통합 (이미 갖춘 mocks 재사용)

### ~~Phase 5-E: CI/CD 베이스라인~~ → _완료 Phase로 이동됨_ (위 Phase 5-E 참조)

### ~~Phase 5-F: 클라이언트 전역 상태~~ → _완료 Phase로 이동됨_ (위 Phase 5-J 참조)

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
3. 작업 완료 시 `- [x]` 또는 `` 표시
4. 모든 항목 완료 시 Phase 제목에 `` 추가
5. 문서 상단 _최종 업데이트_ 날짜 갱신
6. 관련 가이드를 `docs/guides/`에 작성/업데이트

`/update-roadmap` 명령어로 자동화 가능 — 자세히는 `.claude/commands/docs/update-roadmap.md` 참조.
