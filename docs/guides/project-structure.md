# 📁 프로젝트 구조 가이드

이 문서는 claude-nextjs-starters의 폴더 구조, 디렉터리 책임, 네이밍 컨벤션을 정의합니다.

## 🏗 전체 트리

```
claude-nextjs-starters/
├── docs/                                # 📚 프로젝트 문서
│   ├── PRD.md                          #     baseline 정체성 문서
│   ├── ROADMAP.md                      #     완료/예정 Phase
│   └── guides/                         #     주제별 가이드
├── openapi/                             # 📜 OpenAPI 스펙 입력
│   └── example.yaml                    #     실제 백엔드 스펙으로 교체
├── public/                              # 🌍 정적 파일
│   ├── mockServiceWorker.js            #     MSW worker (npx msw init 산출물)
│   └── ...
├── src/
│   ├── app/                            # 🚀 Next.js App Router (페이지 + Route Handler)
│   ├── components/                     # 🧩 React 컴포넌트 (UI 프리미티브 + Provider + 도메인 폼)
│   ├── features/                       # 🎯 도메인별 표준 패턴 (queries/mutations/keys)
│   ├── lib/                            # 🛠 유틸리티 + 인프라 모듈
│   ├── mocks/                          # 🧪 MSW 핸들러/worker
│   ├── stores/                         # 🗃 Zustand 클라이언트 상태 (UI 토글 등)
│   ├── test/                           # 🧪 Vitest 글로벌 셋업
│   └── proxy.ts                        # 🛡 Next.js 16 프록시 (구 middleware) — 보호 라우트
├── orval.config.ts                      # ⚙ codegen 설정
├── components.json                      # shadcn/ui 설정
├── next.config.ts                       # Next.js 설정
├── tsconfig.json                        # TypeScript 설정
├── eslint.config.mjs                    # ESLint flat config
├── .env.example                         # 환경변수 템플릿
└── CLAUDE.md                            # 개발 지침 메인 문서
```

---

## 📁 src/app/ — App Router

```
src/app/
├── layout.tsx                          # 루트 레이아웃 (Theme/Mock/Query/Toaster Provider)
├── page.tsx                            # 홈 (/)
├── globals.css
├── login/page.tsx                      # 로그인 페이지
├── signup/page.tsx                     # 회원가입 페이지
├── users/page.tsx                      # 통합 흐름 데모 (useUsersQuery)
└── api/
    ├── auth/
    │   ├── login/route.ts             # POST /api/auth/login
    │   ├── logout/route.ts            # POST /api/auth/logout
    │   └── refresh/route.ts           # POST /api/auth/refresh
    └── proxy/
        └── [...path]/route.ts         # /api/proxy/*  catch-all → 백엔드 포워딩
```

**규칙**:

- `page.tsx` / `layout.tsx` / `loading.tsx` / `error.tsx` / `not-found.tsx`는 Next.js App Router 표준 컨벤션
- Route Handler는 `route.ts` 파일명 고정
- 클라이언트 호출은 백엔드 절대 URL이 아닌 **`/api/proxy/*`**를 사용 (보안 + 토큰 자동 부착)

---

## 📁 src/components/

> baseline은 _도메인 무관 프리미티브 + Provider + 도메인 폼_ 만 둡니다. _Header / Footer / Navigation / Sections_ 같은 \*셀*은 도메인이 자유 조립 (Phase 5-K-pre의 \_Headless First* / _도메인 명사 컴포넌트 금지_ 정책 — 자세히는 PRD §baseline 경계 정책 참조).

```
src/components/
├── ui/                                 # shadcn/ui (재사용 기본 컴포넌트, 비즈니스 로직 X)
├── layout/                             # 페이지 구조 헬퍼 (Container만 — 도메인이 헤더/푸터 자유 조립)
│   └── container.tsx
├── providers/                          # React Context Provider
│   ├── theme-provider.tsx              #   next-themes
│   ├── query-provider.tsx              #   TanStack Query + Devtools(dev)
│   └── mock-provider.tsx               #   MSW worker 게이트 (dev + 토글 시)
├── login-form.tsx                      # 도메인 폼 (RHF + Zod)
├── login-form.test.tsx                 # 컴포넌트 옆 단위 테스트
├── signup-form.tsx
└── theme-toggle.tsx
```

**컴포넌트 분류 규칙**:

1. **`ui/`** — shadcn 기반. props로 모든 동작 제어, 비즈니스 로직 금지
2. **`layout/`** — 도메인 무관 레이아웃 헬퍼(Container 등). _헤더 / 푸터 / 네비게이션은 baseline에 두지 않음_ — 도메인이 자유 조립
3. **`providers/`** — Context Provider (서버 상태/UI 상태 공유)
4. **루트** — 도메인 종속 컴포넌트 (`*-form.tsx` 등) + 옆자리 단위 테스트(`*.test.tsx`)

---

## 📁 src/features/ — 도메인 표준 패턴 ⭐

> **이 스타터의 핵심**. 새 도메인은 항상 이 구조로 추가하세요. 자세한 절차는 [`api-pattern.md`](./api-pattern.md).

```
src/features/<도메인>/
├── keys.ts                             # Query Key Factory (hierarchical)
├── queries.ts                          # useXxxQuery 훅
├── mutations.ts                        # useXxxMutation 훅 + 캐시 무효화
└── index.ts                            # 단일 진입점 (외부에서 import할 곳)
```

**컨벤션**:

- 컴포넌트는 **항상 `@/features/<도메인>`**에서만 import
- `src/lib/api/generated/*` 직접 import 금지 (한 단계 추상화 격리)
- query key는 항상 factory에서 생성 (수동 배열 금지)

---

## 📁 src/lib/ — 유틸리티 + 인프라

```
src/lib/
├── utils.ts                            # 공통 헬퍼 (cn 등)
├── env/                                # 🔧 환경변수 (server/client 분리)
│   ├── server.ts                       #   server-only · BACKEND_API_BASE_URL 등 비공개
│   └── client.ts                       #   server/client 양용 · NEXT_PUBLIC_* 만
├── api/                                # 🌐 HTTP 통신 레이어
│   ├── client.ts                       #   ky 인스턴스 (브라우저용 apiClient) + 인터셉터
│   ├── server-client.ts                #   server-only · createServerApiClient
│   ├── errors.ts                       #   ApiError + isApiError
│   ├── orval-mutator.ts                #   orval ↔ ky 브릿지
│   ├── request-id.ts                   #   X-Request-ID 생성 (백엔드 트레이싱)
│   └── generated/                      #   npm run gen:api 산출물 (lint/format 제외)
│       ├── schemas/                    #     도메인 모델 타입
│       └── <태그>/                     #     태그별 typed 함수 + MSW 핸들러
├── auth/                               # 🔐 인증 유틸
│   ├── config.ts                       #   쿠키/엔드포인트/만료 상수
│   ├── cookies.ts                      #   server-only · httpOnly 쿠키 입출력
│   ├── form-schemas.ts                 #   로그인/회원가입 Zod 스키마
│   ├── session.ts                      #   server-only · getSession()
│   └── use-auth.ts                     #   클라 훅: useSession/useLogin/useLogout
├── forms/                              # 📝 폼 횡단 유틸
│   ├── api-error-to-form.ts            #   ApiError → RHF setError 매핑
│   └── api-error-to-form.test.ts       #   단위 테스트
├── hooks/                              # 🪝 도메인 무관 횡단 훅
│   ├── use-infinite-scroll.ts          #   IntersectionObserver 트리거 ref callback
│   └── use-list-query-params.ts        #   검색/필터/페이지/정렬 URL 동기화
└── query/                              # 🔄 TanStack Query 인프라
    ├── get-query-client.ts             #   서버=요청별 / 브라우저=싱글톤
    └── optimistic.ts                   #   applyOptimisticUpdate 헬퍼 (cancel/snapshot/rollback)
```

**환경변수 분리 원칙**:

- `env/server.ts` — `'server-only'` import, 클라이언트에서 import 시 빌드 실패. `BACKEND_API_BASE_URL` 같은 비공개 값
- `env/client.ts` — `NEXT_PUBLIC_*` 만 포함. server/client 양쪽에서 import 가능

**확장 가이드**:

- 폼 횡단 유틸: `src/lib/forms/*.ts` (이미 존재 — `api-error-to-form` 등)
- 커스텀 훅: `src/lib/hooks/use-*.ts` (이미 존재 — 도메인 무관 횡단 훅)
- 상수: `src/lib/constants.ts` (필요 시 추가)

---

## 📁 src/mocks/ — MSW

```
src/mocks/
├── handlers.ts                         # 핸들러 통합 (도메인 mock 모음)
├── browser.ts                          # setupWorker(...handlers) — 브라우저용
├── server.ts                           # setupServer(...handlers) — Vitest용
└── init.ts                             # startMSW() — dev + 토글 활성화 시에만
```

**활성화 조건**: `NEXT_PUBLIC_API_MOCK_ENABLED=true` + `NODE_ENV=development` + 브라우저
**prod 영향**: 0 — dynamic import로 mock/handlers/faker가 번들에서 제외

자세한 사용법은 [`mocking-msw.md`](./mocking-msw.md).

---

## 📁 src/stores/ — Zustand 클라이언트 상태

```
src/stores/
└── ui-store.ts                         # UI 토글 상태 (sidebar / command palette 등 도메인 무관)
```

서버 상태는 TanStack Query, 클라이언트 UI 상태는 Zustand로 분리. 자세한 구분 기준은 [`state-client.md`](./state-client.md) 참조.

---

## 📁 src/test/ — Vitest 글로벌 셋업

```
src/test/
└── setup.ts                            # @testing-library/jest-dom 매처 + MSW node lifecycle + jsdom 폴리필
```

`vitest.config.ts`의 `setupFiles`로 등록되어 모든 단위/컴포넌트 테스트에 자동 적용. 자세한 사용법은 [`testing.md`](./testing.md).

---

## 📜 src/proxy.ts — 보호 라우트

Next.js 16에서 `middleware.ts`가 `proxy.ts`로 이름 변경되었습니다 (구 컨벤션은 deprecated).

```typescript
// src/proxy.ts
export function proxy(request: NextRequest) { ... }

export const config = {
  // 보호하고 싶은 경로만 명시적으로 추가
  matcher: ['/dashboard/:path*', '/login'],
}
```

---

## 🏷 파일/폴더 네이밍

### 파일명 — kebab-case 권장

```bash
# ✅ 올바름
user-profile.tsx
api-client.ts
use-debounce.ts

# ❌ 금지
user_profile.tsx        # snake_case
userprofile.tsx         # 소문자만
UserProfile.tsx         # PascalCase는 컴포넌트명에만
```

### 컴포넌트명 — PascalCase

```typescript
export function UserProfile() {} // ✅
export function APIEndpoint() {} // ✅ 약어도 PascalCase
export function userProfile() {} // ❌
```

### 폴더명 — kebab-case 또는 소문자

```
components/
features/
api-routes/             # 다단어는 kebab
```

---

## 🔗 경로 별칭 (Path Aliases)

`tsconfig.json`의 `paths`로 정의:

```typescript
// ✅ 권장
import { Button } from '@/components/ui/button'
import { useUsersQuery } from '@/features/users'
import { apiClient } from '@/lib/api/client'
import { getSession } from '@/lib/auth/session'

// ❌ 금지
import { Button } from '../../../components/ui/button'
```

**정의된 별칭** (`@/*` → `src/*`):

- `@/app` → `src/app`
- `@/components` → `src/components`
- `@/features` → `src/features`
- `@/lib` → `src/lib`
- `@/mocks` → `src/mocks`

---

## 📝 새 파일 추가 결정 트리

### 새 도메인 (예: products)

```
1. openapi/example.yaml에 엔드포인트 추가
2. npm run gen:api  →  src/lib/api/generated/products/ 생성
3. src/features/products/ 작성 (users 폴더 복사 후 도메인명만 변경)
4. 컴포넌트에서 @/features/products import
```

### 새 페이지

```
src/app/<경로>/page.tsx
```

### 새 UI 컴포넌트

```bash
# shadcn 컴포넌트
npx shadcn@latest add <name>

# 도메인 컴포넌트
src/components/<도메인>-<역할>.tsx
```

### 새 Provider

```
src/components/providers/<name>-provider.tsx
src/app/layout.tsx에서 통합
```

### 새 도메인 훅 (도메인 외부에서 쓰는 일반 훅)

```
src/lib/hooks/use-<name>.ts
```

---

## 🚫 금지 구조

```
# ❌ 깊은 중첩 (4단계 이상)
src/components/pages/auth/forms/login/LoginForm.tsx

# ❌ 의미 없는 폴더명
src/components/misc/
src/components/common/
src/components/shared/

# ❌ generated 코드를 features 우회 직접 import
import { listUsers } from '@/lib/api/generated/users/users'  // 컴포넌트에서 금지
```

---

## ✅ 새 파일 추가 체크리스트

- [ ] 적절한 디렉터리에 배치
- [ ] kebab-case 파일명
- [ ] 경로 별칭 사용 (상대 경로 X)
- [ ] 컴포넌트명 PascalCase
- [ ] features/ 사용 시 generated 직접 import 안 함
- [ ] server-only 모듈은 `import 'server-only'` 첫 줄
- [ ] 단일 책임 원칙
- [ ] 300줄 이하 (300줄 초과 시 분리 고려)
