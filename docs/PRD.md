# 📋 Baseline Frontend Starter — Product Requirements

> 이 문서는 **claude-nextjs-starters 자체의 정체성과 제공 기능**을 정의합니다.
> 새 프로젝트를 시작할 때 이 스타터를 그대로 클론해 사용하며, 도메인별 PRD는 별도로 작성합니다.

---

## 🎯 한 줄 요약

**외부 백엔드(Java/Kotlin/Nest 등)와 통신하는 모든 프론트엔드 프로젝트의 공통 기반**을 제공하는 Next.js 16 + React 19 baseline 스타터.

## 🧭 설계 원칙 (우선순위 순)

1. **안정성 (Stability)** — 도구 변경/버전 업그레이드에 강한 구조
2. **유지보수성 (Maintainability)** — 새 멤버가 1일 내 패턴을 파악할 수 있는 명시성
3. **보안 (Security)** — XSS·CSRF·토큰 노출 등 기본 보안 사항이 코드에 박힘
4. **성능 (Performance)** — 위 3가지를 해치지 않는 선에서

## 🚫 비-목표 (Non-Goals)

- 특정 도메인(이커머스, SaaS, 블로그 등)에 특화된 기능
- 풀스택 프레임워크(자체 백엔드 / DB / ORM 포함)
- 단기 속도 최우선 — 보일러플레이트 0을 추구하지 않음
- 모든 가능한 라이브러리 동봉 — 필요 시점에 추가 권장

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
| UI 프리미티브 | Radix UI + Lucide Icons + sonner                  | shadcn 18종 컴포넌트                               |
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
- [ ] 새 멤버가 1일 내 도메인 추가 표준 절차를 따라 작업 가능

---

## 📎 관련 문서

- 🗺 **개발 로드맵**: [`./ROADMAP.md`](./ROADMAP.md)
- 📁 **프로젝트 구조**: [`./guides/project-structure.md`](./guides/project-structure.md)
- 🔌 **API 통신 패턴**: [`./guides/api-pattern.md`](./guides/api-pattern.md)
- 🔐 **인증 패턴**: [`./guides/auth-pattern.md`](./guides/auth-pattern.md)
- 🃏 **MSW 모킹**: [`./guides/mocking-msw.md`](./guides/mocking-msw.md)
- 🔗 **백엔드 스펙 통합**: [`./guides/backend-spec-integration.md`](./guides/backend-spec-integration.md)
- 🚀 **Vercel 배포**: [`./guides/deploy-vercel.md`](./guides/deploy-vercel.md)
- 🧪 **테스트 가이드**: [`./guides/testing.md`](./guides/testing.md)
- 🌐 **i18n 도입 가이드**: [`./guides/i18n.md`](./guides/i18n.md) (옵션 — 필요 시)
- 📊 **모니터링 가이드**: [`./guides/monitoring.md`](./guides/monitoring.md) (Sentry + Prom/Graf 분담)
- 🛡 **보안 헤더 + CSP**: [`./guides/security-headers.md`](./guides/security-headers.md) (헬스체크 / X-Request-ID / CSP)
- 🎨 **스타일링**: [`./guides/styling-guide.md`](./guides/styling-guide.md)
- 🧩 **컴포넌트 패턴**: [`./guides/component-patterns.md`](./guides/component-patterns.md)
- ⚡ **Next.js 16**: [`./guides/nextjs-16.md`](./guides/nextjs-16.md)
- 📝 **폼 처리**: [`./guides/forms-react-hook-form.md`](./guides/forms-react-hook-form.md)
