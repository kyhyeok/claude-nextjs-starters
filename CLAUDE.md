# 🤖 Claude Code 개발 지침

**claude-nextjs-starters**는 Next.js 16.2.4 + React 19.2.5 기반 **외부 백엔드(Java/Kotlin/Nest)와 통신하는 모든 프론트엔드 프로젝트의 보편 baseline**입니다.

---

## 🧭 행동 가이드라인 (LLM 코딩 시 필독)

LLM이 자주 일으키는 실수를 줄이기 위한 4가지 원칙. **속도보다 신중함**을 우선합니다. 사소한 작업에는 판단으로 적용하세요.

### 1. 코딩 전 사고 (Think Before Coding)

> **가정하지 마라. 혼란을 숨기지 마라. 트레이드오프를 표면화하라.**

구현 전:

- 가정을 _명시적으로_ 진술하라. 불확실하면 질문하라.
- 여러 해석이 가능하면 _제시하라_ — 조용히 하나를 고르지 마라.
- 더 단순한 접근이 있으면 말하라. 정당하면 반박하라.
- 불분명하면 _멈춰라_. 무엇이 혼란스러운지 이름 붙여라. 질문하라.

### 2. 단순함 우선 (Simplicity First)

> **문제를 푸는 _최소_ 코드. 추측성 코드 금지.**

- 요청되지 않은 기능 추가 금지.
- 일회성 코드에 추상화 금지.
- 요청되지 않은 "유연성" / "설정 가능성" 금지.
- 발생 불가능한 시나리오에 대한 에러 핸들링 금지.
- 200줄을 썼는데 50줄로 가능하면 _다시 써라_.

스스로에게 물어라: "시니어 엔지니어가 이걸 *과도하다*고 할까?" 그렇다면 단순화하라.

### 3. 외과적 변경 (Surgical Changes)

> **꼭 필요한 곳만 만져라. _네가 만든_ 흔적만 정리하라.**

기존 코드 수정 시:

- 인접한 코드, 주석, 포맷팅을 "개선"하지 마라.
- 깨지지 않은 것을 리팩토링하지 마라.
- 자신과 다른 스타일이라도 _기존 스타일에 맞춰라_.
- 무관한 죽은 코드를 발견하면 _언급만_ 하고 _삭제하지 마라_.

당신의 변경이 고아를 만들면:

- _당신의_ 변경이 만든 미사용 import/변수/함수를 제거하라.
- _기존부터_ 있던 죽은 코드는 요청 없이 제거하지 마라.

**검증 기준**: 변경된 _모든_ 줄이 사용자 요청과 직접 연결되어야 한다.

### 4. 목표 기반 실행 (Goal-Driven Execution)

> **성공 기준을 정의하라. 검증될 때까지 반복하라.**

작업을 *검증 가능한 목표*로 변환하라:

- "검증 추가" → "잘못된 입력에 대한 테스트를 작성하고 통과시켜라"
- "버그 수정" → "버그를 재현하는 테스트를 작성하고 통과시켜라"
- "X 리팩토링" → "전후 모두 테스트가 통과함을 보장하라"

다단계 작업은 짧은 계획을 진술하라:

```
1. [단계] → 검증: [확인]
2. [단계] → 검증: [확인]
3. [단계] → 검증: [확인]
```

강한 성공 기준은 독립적 반복을 가능하게 한다. 약한 기준("작동하게 만들어")은 끊임없는 명확화를 요구한다.

> 이 가이드라인이 _작동하는 신호_: diff에 불필요한 변경이 줄고, 과복잡으로 인한 재작성이 줄고, 명확화 질문이 *실수 후*가 아닌 *구현 전*에 나온다.

### baseline 컨텍스트로 구체화한 _Surgical Changes_ 예시

- `src/features/users/`는 **표준 패턴 템플릿** — 새 도메인 추가 시 *복사*는 OK, *수정*은 X
- `src/lib/api/client.ts`의 인터셉터(401 리프레시/X-Request-ID/ApiError 정규화)에 무관한 로직 추가 금지 — 보안 파이프라인 보호
- `next.config.ts`의 보안 헤더 변경 시 `docs/guides/security-headers.md`도 동시 갱신
- `src/proxy.ts` matcher 변경 시 `auth-pattern.md`의 보호 라우트 섹션도 동시 점검
- generated 디렉터리(`src/lib/api/generated/`)는 _수동 편집 금지_ — `npm run gen:api`로만 갱신

<details>
<summary> 영어 원문 (Behavioral guidelines to reduce common LLM coding mistakes)</summary>

```
Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```

1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]

```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
```

</details>

---

## 🛠 핵심 기술 스택

- **Framework**: Next.js 16.2.4 (App Router + Turbopack)
- **Runtime**: React 19.2.5 + TypeScript 5
- **Styling**: TailwindCSS v4 + shadcn/ui (new-york style) + next-themes
- **Forms**: React Hook Form + Zod
- **HTTP**: ky 1
- **State**: @tanstack/react-query 5
- **Codegen**: orval 7 (OpenAPI → typed 함수 + MSW 핸들러)
- **Mocking**: MSW 2 (dev only, dynamic import)
- **Auth**: httpOnly 쿠키 + Route Handler 프록시 (자체 구현)
- **Development**: ESLint 9 + Prettier + Husky + lint-staged + server-only

## 🧭 설계 원칙 (우선순위)

1. **안정성** — 도구/버전 변경에 강한 구조
2. **유지보수성** — 새 멤버가 1일 내 패턴 파악 가능한 명시성
3. **보안** — XSS/CSRF/토큰 노출 방지가 코드에 박힘
4. **성능** — 위 3가지를 해치지 않는 선에서

## 📚 개발 가이드

### baseline 정체성

- **PRD (스타터 정체성)**: `@/docs/PRD.md`
- **개발 로드맵**: `@/docs/ROADMAP.md`

### 세션 워크플로 (★ 모든 작업 시작 시 필독)

- **에이전트 워크플로**: `@/docs/guides/agent-workflow.md` — 23개 `.md` 자산을 세션 유형(A/B/C/D)별로 어떻게 호출할지. 매 세션 시작 시 _세션 유형 결정 → 해당 콤보만 사용_

### 핵심 패턴 (★ 새 도메인 작업 시 필독)

- **API 통신 패턴**: `@/docs/guides/api-pattern.md`
- **인증 패턴**: `@/docs/guides/auth-pattern.md`
- **MSW 모킹**: `@/docs/guides/mocking-msw.md`
- **백엔드 스펙 통합**: `@/docs/guides/backend-spec-integration.md` (SpringDoc / restDocs / 둘 다)
- **Vercel 배포**: `@/docs/guides/deploy-vercel.md` (Vercel + GitHub Actions 분담)
- **테스트 가이드**: `@/docs/guides/testing.md` (Vitest + RTL + Playwright)
- **i18n 도입 가이드**: `@/docs/guides/i18n.md` (필요 시 도입 절차 — baseline 코드 기본 미포함)
- **모니터링 가이드**: `@/docs/guides/monitoring.md` (Sentry + Prom/Graf 분담 + ApiError 통합)
- **보안 헤더 + CSP**: `@/docs/guides/security-headers.md` (헬스체크 / X-Request-ID / CSP 정책 / nonce)

### 일반 가이드

- **프로젝트 구조**: `@/docs/guides/project-structure.md`
- **스타일링 가이드**: `@/docs/guides/styling-guide.md`
- **컴포넌트 패턴**: `@/docs/guides/component-patterns.md`
- **Next.js 16 가이드**: `@/docs/guides/nextjs-16.md`
- **폼 처리 가이드**: `@/docs/guides/forms-react-hook-form.md`

## ⚡ 자주 사용하는 명령어

```bash
# 개발
npm run dev           # 개발 서버 (Turbopack)
npm run build         # 프로덕션 빌드
npm run check-all     # typecheck + lint + format:check (작업 완료 시 권장)

# API 코드 생성
npm run gen:api       # openapi/<spec>.yaml → typed 함수 + 스키마 + MSW 핸들러

# 테스트
npm run test          # Vitest 단위/컴포넌트 (CI 모드)
npm run test:watch    # Vitest watch
npm run test:e2e      # Playwright E2E (헤드리스)

# UI 컴포넌트
npx shadcn@latest add button   # 새 shadcn 컴포넌트 추가
```

## 🌱 새 프로젝트 셋업

```bash
# 1) 환경변수
cp .env.example .env.local
# .env.local 편집:
#   BACKEND_API_BASE_URL=http://localhost:8080      (서버 전용, 필수)
#   NEXT_PUBLIC_API_MOCK_ENABLED=true               (MSW로 백엔드 선행 개발 시)

# 2) 백엔드 OpenAPI 스펙 → openapi/example.yaml로 교체 → 코드 생성
npm run gen:api

# 3) 개발 서버
npm run dev
```

## ✅ 작업 완료 체크리스트

```bash
npm run check-all     # 모든 검사 통과 확인 (typecheck + lint + format)
npm run build         # 빌드 성공 확인
```

## 🎯 새 도메인 추가 표준 절차

1. `openapi/<spec>.yaml`에 엔드포인트 추가 → `npm run gen:api`
2. `src/features/<도메인>/`에 4개 파일 작성 (`keys.ts`/`queries.ts`/`mutations.ts`/`index.ts`)
   - `src/features/users/`를 복사 후 도메인명만 변경하면 가장 빠름
3. (선택) 보호 라우트라면 `src/proxy.ts`의 `config.matcher`에 추가
4. 컴포넌트에서 `import { useXxxQuery } from '@/features/<도메인>'`

자세한 절차는 `@/docs/guides/api-pattern.md` 참조.

## 🚫 핵심 금지사항

- 컴포넌트에서 `@/lib/api/generated/*` 직접 import (항상 `@/features/<도메인>` 경유)
- 컴포넌트에서 `apiClient` 또는 raw fetch 직접 호출 (항상 mutation/query 훅 경유)
- 토큰을 `localStorage`/`sessionStorage`에 저장 (httpOnly 쿠키만 사용)
- `BACKEND_API_BASE_URL`을 `NEXT_PUBLIC_*`로 노출 (서버 전용 유지)
- baseline `src/components/`에 **도메인 명사 컴포넌트** 추가 (`<ProductCard/>`, `<JobCard/>`, `<RestaurantCard/>` 등) — 디자인 자유 보장 정책 위반. 자세히는 `@/docs/PRD.md` _baseline 경계 정책_ 참조

> 외부 백엔드 통신 시 폼은 **mutation 훅 + RHF + Zod** 조합이 1차 권장입니다.
> Server Actions는 Next.js 내부 라우트나 자체 RSC 흐름에서 사용하세요 — 자세히는 `@/docs/guides/forms-react-hook-form.md`.

**상세 규칙은 위 개발 가이드 문서들을 참조하세요.**
