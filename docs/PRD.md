# 📋 Baseline Frontend Starter — Product Requirements

> 이 문서는 **claude-nextjs-starters 자체의 정체성과 제공 기능**을 정의합니다.
> 새 프로젝트를 시작할 때 이 스타터를 그대로 클론해 사용하며, 도메인별 PRD는 별도로 작성합니다.

---

## 🎯 한 줄 요약

**외부 백엔드(Java/Kotlin/Nest 등)와 통신하는 모든 프론트엔드 프로젝트의 공통 기반**을 제공하는 Next.js 16 + React 19 baseline 스타터.

## 🧭 설계 원칙 (우선순위 순)

1. **안정성 (Stability)** — 도구 변경/버전 업그레이드에 강한 구조
2. **유지보수성 (Maintainability)** — 새 멤버가 1일 내 패턴을 파악할 수 있는 명시성 (_Core 가이드 5개_ = 1,479 LOC만 읽으면 충분, Phase 5-L에서 도달·이후 자연 증가 반영)
3. **보안 (Security)** — XSS·CSRF·토큰 노출 등 기본 보안 사항이 코드에 박힘
4. **성능 (Performance)** — 위 3가지를 해치지 않는 선에서

## 🚫 비-목표 (Non-Goals)

- 특정 도메인(이커머스, SaaS, 블로그 등)에 특화된 기능
- 풀스택 프레임워크(자체 백엔드 / DB / ORM 포함)
- 단기 속도 최우선 — 보일러플레이트 0을 추구하지 않음
- 모든 가능한 라이브러리 동봉 — 필요 시점에 추가 권장

## 🎨 baseline 경계 정책 (디자인 자유 보장)

이 baseline을 _다양한 도메인_(이커머스, 배달, 채용, 커뮤니티 등)에 복사해 사용할 때 _모든 서비스가 같은 UI로 보이지 않도록_ baseline에 _무엇을 두고 무엇을 두지 않을지_ 정의합니다.

### 추상화 레이어 모델

| Layer                         | 예시                                 | baseline 포함 여부                 |
| ----------------------------- | ------------------------------------ | ---------------------------------- |
| 1. 라이브러리 / 훅 (behavior) | `useInfiniteQuery`, `useDebounce`    | ✅ 포함 (UI 박힘 없음)             |
| 2. Headless primitive         | shadcn `Dialog` / `Form` / `Select`  | ✅ 포함                            |
| 3. 디자인 토큰                | CSS 변수 (color/radius/spacing/font) | ✅ 기본값 제공, 도메인이 덮어씀    |
| 4. 무명사 프리미티브          | `<EmptyState/>`, `<Skeleton/>`       | ⚠️ slot 패턴 전제 — 콘텐츠 props만 |
| 5. 도메인 명사 컴포넌트       | `<ProductCard/>`, `<JobCard/>` 등    | ❌ 영구 금지 (도메인 영역)         |

### 정책 5조

1. **Headless First** — 동작은 훅으로, UI는 도메인이 결정. 가능한 한 *컴포넌트보다 훅*으로 표현.
2. **Slot 패턴 강제** — Layer 4 프리미티브는 콘텐츠를 `props` / `children`으로만 받음. baseline이 *기본 일러스트 / 문구 / CTA*를 박지 않음.
3. **디자인 토큰 분리** — 색상 / 폰트 / radius / spacing은 모두 `globals.css`의 CSS 변수. 도메인은 *이 한 파일*만 교체해 전체 룩이 바뀌어야 함.
4. **No Domain Nouns** — `<ProductCard/>`, `<RestaurantCard/>`, `<JobCard/>` 류 *도메인 명사가 들어간 컴포넌트*는 baseline 영구 금지. 카드 *레이아웃*은 매 도메인이 새로 작성.
5. **3-도메인 검증 룰** — baseline에 컴포넌트를 추가할 때 PR 체크리스트: _"이 컴포넌트가 e커머스 / 배달 / 커뮤니티 세 도메인의 서로 다른 디자인에 모두 어색하지 않은가?"_ 통과하지 못하면 _훅으로 강등_ 또는 _도메인 영역으로 추방_.

### shadcn 컴포넌트 재고 정책

`src/components/ui/`에는 _현재 사용 중인 컴포넌트_ + *다수 도메인이 도입 첫날 사용할 가능성이 높은 재고 프리미티브*만 둡니다. 도메인-특화 / 사용 0 / 다른 컴포넌트의 셸이었던 잔재는 즉시 제거하고, 도입 시점에 `npx shadcn add <name>`으로 추가.

- _재고로 유지_: `dialog`(모달은 거의 표준), `badge`, `select`, `separator`, `progress`(파일 업로드 진행률), `empty-state` / `error-state`(slot 프리미티브)
- _도메인 영역으로 추방_: 도메인 셸용(`sheet`, `navigation-menu`, `avatar`, `header`, `footer` 등) — 새 도메인이 자기 헤더/푸터/네비를 자유 조립

### 정책에 따른 제외 결정 (예시)

UI 박힘 위험을 피하기 위해 baseline *코드*에서 빠지고 _훅만_ 또는 *가이드만*으로 제공되는 항목:

| 항목                          | baseline 처리                                |
| ----------------------------- | -------------------------------------------- |
| 드래그앤드롭 파일 업로드      | `useFileUpload` 훅만, 컴포넌트는 docs 예시   |
| 별점 input (`<RatingInput/>`) | 가이드 + 미니 예시만 (별 모양은 브랜드 정체) |
| 알림 센터 카드                | 데이터 흐름 + 낙관적 업데이트 가이드만       |
| 캘린더 시간슬롯               | 훅 + 가이드만 (시각 디자인은 도메인)         |
| 다단계 폼 step indicator      | `useFormPersist` 훅만, indicator UI는 도메인 |
| 결제 / 지도 / OAuth 한국 4사  | 가이드만 (도메인 시점에 SDK 선택)            |

> **참고**: shadcn 자체가 이 모델로 작동합니다 — Vercel / Supabase / Cal.com / Resend 모두 같은 shadcn primitive를 쓰지만 *전혀 다른 브랜드 룩*입니다. baseline은 같은 분리 원칙을 _데이터 페칭 / 상태 패턴_ 영역까지 확장합니다.

## 👤 대상 사용자

- 다수 프로젝트의 **동일한 baseline**을 사용하려는 1인/소규모 팀
- 백엔드(Java/Kotlin/Nest)는 **별도 프로젝트**에서 진행하며 OpenAPI 스펙으로 계약을 노출하는 환경
- 도메인이 다양해도(공공 API, 이커머스, SaaS 등) **같은 통신/인증/모킹 패턴**을 유지하고 싶은 개발자

---

## 🏗 핵심 제공 기능

### 1. UI 셸 (이미 동봉됨)

| 영역          | 라이브러리                                        | 설명                                               |
| ------------- | ------------------------------------------------- | -------------------------------------------------- |
| 프레임워크    | Next.js 16.2.4 (App Router + Turbopack)           | 서버/클라이언트 컴포넌트 분리, RSC 우선            |
| 런타임        | React 19.2.5 + TypeScript 5                       | strict 모드                                        |
| 스타일링      | TailwindCSS v4 + shadcn/ui (new-york)             | 다크모드(next-themes), prettier-plugin-tailwindcss |
| UI 프리미티브 | Radix UI + Lucide Icons + sonner                  | shadcn 16종 (사용 중 + 재고 프리미티브)            |
| 폼            | React Hook Form 7 + Zod 4 + `@hookform/resolvers` | shadcn `Form` 통합                                 |
| DX            | ESLint 9 + Prettier + Husky + lint-staged         | `npm run check-all` 통합                           |

### 2. 데이터 페칭 레이어

- **HTTP 코어**: `ky` 인스턴스 (`src/lib/api/client.ts`)
  - 401 자동 리프레시 인터셉터 (단일 in-flight 보장)
  - 4xx/5xx → `ApiError` 정규화 throw
  - 4xx 재시도 차단, 5xx/네트워크 1회 재시도
- **상태 관리**: TanStack Query 5 (`src/lib/query/get-query-client.ts`)
  - 서버=요청별 인스턴스 / 브라우저=싱글톤
  - `HydrationBoundary` 기반 SSR prefetch 지원
- **코드 생성**: orval + `client: 'fetch'` + custom mutator
  - `npm run gen:api` 한 번에 typed 함수 + 스키마 + MSW 핸들러
  - 우리 ky 인스턴스로 라우팅 (모든 호출이 동일 보안 파이프라인 통과)

### 3. 인증 & 보호 라우트

- **httpOnly 쿠키 + sameSite=lax + secure[prod]** — XSS/CSRF 1차 방어
- **Route Handler 프록시** (`/api/proxy/[...path]`)
  - 백엔드 절대 URL이 클라이언트 번들에 노출되지 않음 (`BACKEND_API_BASE_URL` 서버 전용)
  - 모든 메서드 catch-all 포워딩
- **인증 흐름**:
  - `POST /api/auth/login` → 쿠키 저장
  - `POST /api/auth/logout` → 쿠키 클리어
  - `POST /api/auth/refresh` → access/refresh 갱신 (401 인터셉터가 자동 호출)
- **`src/proxy.ts`** (Next.js 16 신 컨벤션, 구 middleware) — 매처 기반 보호 라우트
- 클라이언트 훅: `useSession` / `useLogin` / `useLogout`
- 서버 헬퍼: `getSession()` (server-only)

### 4. API 모킹 (MSW v2)

- `NEXT_PUBLIC_API_MOCK_ENABLED=true` + dev 환경에서만 활성화
- prod 빌드는 dynamic import로 mock/handlers/faker가 **번들에서 제외**
- orval이 OpenAPI 스펙 기반 핸들러 자동 생성 (`*.msw.ts`)
- 백엔드 미구동 상태에서 프론트 선행 개발 가능

### 5. 도메인 표준 패턴 (`src/features/<도메인>/`)

| 파일           | 역할                                     |
| -------------- | ---------------------------------------- |
| `keys.ts`      | Query Key Factory (hierarchical)         |
| `queries.ts`   | `useXxxQuery` 훅                         |
| `mutations.ts` | `useXxxMutation` 훅 + 캐시 무효화        |
| `index.ts`     | 단일 진입점 (generated 직접 import 금지) |

> **핵심 컨벤션**: 컴포넌트는 항상 `@/features/<도메인>`에서만 import. generated/\* 직접 사용 금지.

---

## 📐 사용 시나리오

### 시나리오 A — 새 프로젝트 시작

```bash
git clone <this-starter> my-new-project
cd my-new-project
cp .env.example .env.local      # BACKEND_API_BASE_URL 입력
npm install
npm run dev
```

### 시나리오 B — 새 도메인(예: products) 추가

1. 백엔드의 OpenAPI 스펙을 `openapi/example.yaml`에 덮어쓰기
2. `npm run gen:api` → typed 함수 + 스키마 + MSW 핸들러 자동 생성
3. `src/features/products/`에 `keys.ts`, `queries.ts`, `mutations.ts`, `index.ts` 작성 (users 폴더 복사가 가장 빠름)
4. (선택) 보호 라우트라면 `src/proxy.ts`의 `config.matcher`에 추가
5. 컴포넌트에서 `import { useProductsQuery } from '@/features/products'`

### 시나리오 C — 백엔드 미완성 상태에서 프론트 선행

1. `.env.local`에 `NEXT_PUBLIC_API_MOCK_ENABLED=true`
2. `openapi/example.yaml`에 예상 엔드포인트/스키마 정의
3. `npm run gen:api` → MSW 핸들러 자동 생성
4. `npm run dev` → 백엔드 없이 mock 응답으로 UI 개발

---

## 📊 데이터 모델 (도메인 무관 공통)

이 스타터는 **사용자/세션을 제외하면 도메인 모델을 강제하지 않습니다**.

### 인증 모델 (외부 백엔드 응답 기본 계약)

| 엔티티      | 필드                                                             | 비고                                                         |
| ----------- | ---------------------------------------------------------------- | ------------------------------------------------------------ |
| 로그인 응답 | `accessToken`, `refreshToken`, `expiresIn?`, `refreshExpiresIn?` | 백엔드가 다른 형태면 `app/api/auth/*/route.ts`의 매핑만 수정 |
| 세션 사용자 | `id`, `email?`, `name?`, `[key]: unknown`                        | `SessionUser` 타입                                           |
| 에러 응답   | `message`, `code?`                                               | `ApiError`로 정규화                                          |

### 도메인 예시 (`openapi/example.yaml`)

`User`, `UserPage`, `CreateUserInput`, `ErrorResponse`, `ListUsersParams` — 실제 사용 시 백엔드 스펙으로 교체.

---

## 🛠 기술 스택 종합

```
프레임워크   Next.js 16.2.4 (Turbopack)
런타임       React 19.2.5 + TypeScript 5
스타일링     TailwindCSS v4 + shadcn/ui + next-themes
폼           React Hook Form + Zod
HTTP         ky 1
상태         @tanstack/react-query 5
codegen      orval 7 + @faker-js/faker
모킹         MSW 2
인증         httpOnly cookie + Route Handler 프록시 (자체 구현)
DX           ESLint 9, Prettier, Husky, lint-staged, server-only
```

---

## ✅ 성공 기준

이 스타터를 baseline으로 새 프로젝트를 시작했을 때:

- [ ] 백엔드와의 통신 로직을 새로 짜지 않음 (orval + features 패턴)
- [ ] 인증/토큰/리프레시를 새로 구현하지 않음 (Phase 2 그대로 사용)
- [ ] 백엔드 미구동 상태에서도 프론트 개발이 막히지 않음 (MSW)
- [ ] 새 멤버가 1일 내 도메인 추가 표준 절차를 따라 작업 가능 (Core 가이드 5개로 학습 경로 닫힘)

---

## 📎 관련 문서

> **3-tier 학습 경로**: Core(필독 5) → Reference(필요 시) → Optional(도입 시점). 신규 멤버는 Core 5개로 시작.

### 🟢 Core (1일 onboarding 필독)

- **에이전트 워크플로**: [`./guides/agent-workflow.md`](./guides/agent-workflow.md)
- **프로젝트 구조**: [`./guides/project-structure.md`](./guides/project-structure.md)
- **API 통신 패턴**: [`./guides/api-pattern.md`](./guides/api-pattern.md)
- **인증 패턴**: [`./guides/auth-pattern.md`](./guides/auth-pattern.md)
- **MSW 모킹**: [`./guides/mocking-msw.md`](./guides/mocking-msw.md)

### 🟡 Reference (필요 시 펼침)

- **폼 처리**: [`./guides/forms-react-hook-form.md`](./guides/forms-react-hook-form.md)
- **리스트 패턴**: [`./guides/list-pattern.md`](./guides/list-pattern.md)
- **낙관적 업데이트 패턴**: [`./guides/optimistic-update-pattern.md`](./guides/optimistic-update-pattern.md)
- **토스트 사용 패턴**: [`./guides/toast-pattern.md`](./guides/toast-pattern.md)
- **클라이언트 상태 관리**: [`./guides/state-client.md`](./guides/state-client.md)
- **스타일링**: [`./guides/styling-guide.md`](./guides/styling-guide.md)
- **컴포넌트 패턴**: [`./guides/component-patterns.md`](./guides/component-patterns.md)
- **Next.js 16**: [`./guides/nextjs-16.md`](./guides/nextjs-16.md)
- **보안 헤더 + CSP**: [`./guides/security-headers.md`](./guides/security-headers.md)
- **테스트 가이드**: [`./guides/testing.md`](./guides/testing.md)

### 🔵 Optional (도입 시점만 — `docs/optional/`)

- **백엔드 스펙 통합**: [`./optional/backend-spec-integration.md`](./optional/backend-spec-integration.md)
- **파일 업로드 가이드**: [`./optional/file-upload-pattern.md`](./optional/file-upload-pattern.md)
- **Vercel 배포**: [`./optional/deploy-vercel.md`](./optional/deploy-vercel.md)
- **i18n 도입 가이드**: [`./optional/i18n.md`](./optional/i18n.md)
- **모니터링 가이드**: [`./optional/monitoring.md`](./optional/monitoring.md)

### 메타

- **개발 로드맵**: [`./ROADMAP.md`](./ROADMAP.md)
