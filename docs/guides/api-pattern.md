# 🔌 API 통신 패턴 가이드

이 문서는 외부 백엔드(Java/Kotlin/Nest)와의 통신을 어떻게 구조화하는지 정의합니다.
**모든 데이터 페칭은 이 패턴을 따라야 합니다.**

---

## 🧭 전체 흐름

```
[OpenAPI 스펙]
    │  npm run gen:api (orval)
    ▼
[generated/ typed 함수 + MSW 핸들러]
    │  orvalFetch (mutator)
    ▼
[apiClient — ky 인스턴스]
    │  /api/proxy/*  (Route Handler 프록시)
    ▼
[BACKEND_API_BASE_URL]
```

**핵심**:

- 컴포넌트는 `apiClient`를 직접 호출하지 않습니다 → `useXxxQuery` 훅 사용
- `useXxxQuery`는 `generated/` 함수를 호출 → `orvalFetch` → `apiClient` → `/api/proxy/*` → 백엔드
- 401 자동 리프레시, 토큰 부착, 에러 정규화는 인터셉터에서 자동 처리

---

## 🏛 레이어 구조

```
┌─────────────────────────────────────────┐
│  Component                              │  ← @/features/<도메인>에서만 import
├─────────────────────────────────────────┤
│  features/<도메인>/queries.ts            │  ← useXxxQuery (수동 작성)
│  features/<도메인>/mutations.ts          │  ← useXxxMutation (수동 작성)
│  features/<도메인>/keys.ts               │  ← Query Key Factory (수동 작성)
├─────────────────────────────────────────┤
│  lib/api/generated/<태그>/<태그>.ts      │  ← typed 함수 (orval 자동 생성)
│  lib/api/generated/schemas/             │  ← 모델 타입 (orval 자동 생성)
├─────────────────────────────────────────┤
│  lib/api/orval-mutator.ts               │  ← orval ↔ ky 브릿지
│  lib/api/client.ts                      │  ← ky 인스턴스 (인터셉터)
│  lib/api/errors.ts                      │  ← ApiError + 가드
└─────────────────────────────────────────┘
```

각 레이어 책임은 명확합니다. **상위 레이어가 하위 레이어를 1단계 건너뛰지 않도록** 주의하세요.

---

## 📜 새 도메인 추가 표준 절차

### 1) 백엔드 OpenAPI 스펙 받기

백엔드 팀이 제공하는 `swagger.json` / `openapi.yaml`을 받아 `openapi/` 디렉터리에 저장하거나, URL을 `orval.config.ts`의 `input.target`에 지정합니다.

```typescript
// orval.config.ts
input: {
  target: './openapi/example.yaml',         // 파일
  // 또는
  target: 'https://api.example.com/v3/api-docs',  // URL
}
```

### 2) 코드 생성

```bash
npm run gen:api
```

산출물:

```
src/lib/api/generated/
├── schemas/                           # 도메인 모델 타입
│   ├── user.ts
│   ├── userPage.ts
│   └── index.ts
└── <태그>/                            # OpenAPI tag별
    ├── <태그>.ts                      #   typed fetch 함수
    └── <태그>.msw.ts                  #   MSW 핸들러
```

### 3) features 디렉터리 작성

`src/features/<도메인>/` 폴더에 4개 파일 생성. **users 폴더를 복사**해 도메인명만 바꾸면 가장 빠릅니다.

#### `keys.ts` — Query Key Factory

```typescript
import type { ListUsersParams } from '@/lib/api/generated/schemas'

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: ListUsersParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
} as const
```

**계층 구조 규칙** (얕음 → 깊음):

- `[domain]` — 도메인 전체 (전체 무효화 시)
- `[domain, 'list']` — 모든 list 변형
- `[domain, 'list', params]` — 특정 파라미터
- `[domain, 'detail']` — 모든 detail
- `[domain, 'detail', id]` — 특정 id

> 참고: [tkdodo의 Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys)

#### `queries.ts` — Query 훅

```typescript
'use client'

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { listUsers, getUser } from '@/lib/api/generated/users/users'
import type { UserPage, User, ListUsersParams } from '@/lib/api/generated/schemas'
import { userKeys } from './keys'

export function useUsersQuery(params: ListUsersParams = {}, options?: ...) {
  return useQuery<UserPage>({
    queryKey: userKeys.list(params),
    queryFn: async ({ signal }) => {
      const res = await listUsers(params, { signal })
      return res.data
    },
    ...options,
  })
}

export function useUserQuery(id: string, options?: ...) {
  return useQuery<User>({
    queryKey: userKeys.detail(id),
    queryFn: async ({ signal }) => {
      const res = await getUser(id, { signal })
      return res.data as User
    },
    enabled: Boolean(id) && (options?.enabled ?? true),
    ...options,
  })
}
```

**규칙**:

- generated 함수는 직접 호출하지 않고 항상 훅을 통해 사용
- 응답에서 `.data`만 unwrap해 컴포넌트에 전달
- queryKey는 항상 factory에서 생성
- 4xx/5xx는 `ApiError` throw → useQuery의 `error`로 노출

#### `mutations.ts` — Mutation 훅

```typescript
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createUser, deleteUser } from '@/lib/api/generated/users/users'
import type { CreateUserInput, User } from '@/lib/api/generated/schemas'
import { userKeys } from './keys'

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation<User, unknown, CreateUserInput>({
    mutationFn: async input => {
      const res = await createUser(input)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation<void, unknown, string>({
    mutationFn: async id => {
      await deleteUser(id)
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      queryClient.removeQueries({ queryKey: userKeys.detail(id) })
    },
  })
}
```

**기본 정책**:

- 비관적 업데이트 (안정성 우선) — 낙관적 업데이트가 필요하면 `onMutate` + 롤백 추가
- 성공 시 관련 query를 `invalidateQueries` 또는 `removeQueries`
- 응답에서 `.data`만 반환

#### `index.ts` — 단일 진입점

```typescript
export { userKeys } from './keys'
export { useUsersQuery, useUserQuery } from './queries'
export { useCreateUser, useDeleteUser } from './mutations'

export type {
  User,
  UserPage,
  CreateUserInput,
  ListUsersParams,
} from '@/lib/api/generated/schemas'
```

### 4) 컴포넌트에서 사용

```typescript
'use client'

import { useUsersQuery } from '@/features/users'

export function UsersList() {
  const { data, isLoading, error } = useUsersQuery({ page: 1, size: 20 })
  // ...
}
```

### 5) (옵션) 보호 라우트로 만들기

`src/proxy.ts`의 `config.matcher`에 경로 추가:

```typescript
matcher: ['/dashboard/:path*', '/login', '/products/:path*']
```

---

## 🛡 ApiError 처리

### 컴포넌트에서

```typescript
import { isApiError } from '@/lib/api/errors'

const { error } = useUsersQuery()

if (error) {
  if (isApiError(error)) {
    if (error.isUnauthorized) return <RedirectToLogin />
    if (error.isNotFound) return <NotFound />
    return <ErrorMessage status={error.status} message={error.message} />
  }
  // 네트워크/타임아웃 등
  return <NetworkError />
}
```

### 글로벌 핸들링 (옵션)

`QueryClient` 기본 옵션의 `mutations.onError` 또는 `queries.onError`로 toast 띄우기:

```typescript
// src/lib/query/get-query-client.ts에 추가 가능
new QueryClient({
  defaultOptions: {
    mutations: {
      onError: error => {
        if (isApiError(error)) toast.error(error.message)
      },
    },
  },
})
```

---

## 🔁 서버 컴포넌트에서 prefetch (SSR)

```typescript
// app/users/page.tsx (Server Component)
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { getQueryClient } from '@/lib/query/get-query-client'
import { listUsers } from '@/lib/api/generated/users/users'
import { userKeys } from '@/features/users/keys'
import { UsersClient } from './users-client'

export default async function UsersPage() {
  const queryClient = getQueryClient()

  await queryClient.prefetchQuery({
    queryKey: userKeys.list({}),
    queryFn: async () => (await listUsers()).data,
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UsersClient />
    </HydrationBoundary>
  )
}
```

서버 컴포넌트에서 ky 호출 시 토큰을 직접 주입할 수도 있습니다 — `createServerApiClient` 참조.

---

## ✅ 패턴 체크리스트

새 도메인 추가 후:

- [ ] `npm run gen:api` 실행 → typed 함수/스키마/MSW 핸들러 생성됨
- [ ] `src/features/<도메인>/`에 4개 파일 (keys/queries/mutations/index)
- [ ] Query Key Factory hierarchical 구조 적용
- [ ] 컴포넌트는 `@/features/<도메인>`에서만 import (generated 직접 사용 X)
- [ ] mutation 성공 시 관련 캐시 invalidate
- [ ] `npm run check-all` 통과
- [ ] (보호 라우트라면) `src/proxy.ts` matcher 업데이트

---

## ❌ 안티패턴

```typescript
// ❌ 컴포넌트에서 generated 직접 import
import { listUsers } from '@/lib/api/generated/users/users'

// ❌ apiClient를 컴포넌트에서 직접 사용
import { apiClient } from '@/lib/api/client'
const data = await apiClient.get('users').json()

// ❌ queryKey 수동 작성
useQuery({ queryKey: ['users', 'list', { page: 1 }], ... })  // factory 사용

// ❌ 응답을 unwrap 없이 컴포넌트에 전달
return useQuery({ queryFn: () => listUsers(params) })  // .data 추출 안 함
```

---

## 📎 관련 문서

- 인증 흐름: [`auth-pattern.md`](./auth-pattern.md)
- MSW 활용: [`mocking-msw.md`](./mocking-msw.md)
- 폼 + mutation: [`forms-react-hook-form.md`](./forms-react-hook-form.md)
- 프로젝트 구조: [`project-structure.md`](./project-structure.md)
