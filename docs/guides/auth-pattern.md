# 🔐 인증 패턴 가이드

이 문서는 외부 백엔드의 JWT(또는 호환 토큰) 인증을 어떻게 통합하는지 정의합니다.

---

## 🧭 핵심 흐름

```
[브라우저]
   │ POST /api/auth/login (email/password)
   ▼
[Next.js Route Handler]
   │ POST {BACKEND}/auth/login
   ▼
[외부 백엔드]
   │ { accessToken, refreshToken, expiresIn }
   ▼
[Route Handler]
   │ httpOnly 쿠키로 저장 → 200 OK
   ▼
[브라우저]
   │ 이후 모든 API 호출은 /api/proxy/*
   ▼
[프록시 Route Handler]
   │ 쿠키 → Authorization: Bearer 헤더 변환
   ▼
[외부 백엔드]
```

**핵심**:

- 토큰은 **httpOnly 쿠키**에만 저장 (JS 접근 불가, XSS 안전)
- 백엔드 절대 URL은 **클라이언트 번들에 노출되지 않음** (`BACKEND_API_BASE_URL` 서버 전용)
- 401 응답 시 ky 인터셉터가 자동으로 `/api/auth/refresh` 호출 (단일 in-flight)

---

## 🍪 쿠키 정책

| 속성       | 값                                  | 이유                            |
| ---------- | ----------------------------------- | ------------------------------- |
| `httpOnly` | `true`                              | JS 접근 불가 (XSS 안전)         |
| `sameSite` | `lax`                               | CSRF 1차 방어 + OAuth 콜백 호환 |
| `secure`   | prod에서만 `true`                   | localhost http 개발 호환        |
| `path`     | `/`                                 | 전체 사이트                     |
| `maxAge`   | 액세스 15분, 리프레시 14일 (기본값) | 백엔드 응답의 `expiresIn` 우선  |

쿠키 이름은 `src/lib/auth/config.ts`에 정의되어 있습니다.

---

## 🔄 인증 엔드포인트 (Route Handler)

```
POST /api/auth/login    # 이메일/비밀번호 → 백엔드 위임 → 쿠키 저장
POST /api/auth/logout   # 백엔드 logout 호출 + 쿠키 클리어
POST /api/auth/refresh  # refresh_token 쿠키 → 새 토큰 → 쿠키 갱신
```

**백엔드 응답 계약 (기본)**:

```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 900, // 선택, 초 단위
  "refreshExpiresIn": 1209600 // 선택, 초 단위
}
```

다른 형태라면 다음 3개 파일의 매핑만 수정하세요:

- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/refresh/route.ts`
- `src/app/api/auth/logout/route.ts`

---

## 🔁 401 자동 리프레시

`src/lib/api/client.ts`의 ky 인스턴스에 인터셉터가 박혀 있습니다:

1. 응답 status가 401이고 refresh 엔드포인트 자체 호출이 아니면
2. `/api/auth/refresh` 호출 → 성공 시 원본 요청 재시도
3. 동시 401 다발 시 단일 in-flight Promise 공유 (race condition 방지)
4. 무한 루프 방지: `x-no-retry` 헤더로 1회 제한

```typescript
// 사용자 코드에서는 추가 작업 불필요
const { data } = useUsersQuery() // 만료 시 자동 리프레시 후 재시도
```

리프레시 실패(만료/탈취)하면 백엔드가 401을 반환 → `clearAuthCookies()` → 호출자가 401을 받음.
컴포넌트에서 `error.isUnauthorized`로 분기해 `/login`으로 리디렉션할 수 있습니다.

---

## 🛡 보호 라우트 (`src/proxy.ts`)

Next.js 16에서 `middleware.ts` → `proxy.ts`로 이름이 변경되었습니다.

```typescript
// src/proxy.ts
import { NextResponse, type NextRequest } from 'next/server'
import { AUTH_COOKIES, AUTH_ROUTES } from '@/lib/auth/config'

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const hasAccessToken = request.cookies.has(AUTH_COOKIES.accessToken)

  // 로그인 페이지: 인증된 사용자 → 홈으로
  if (pathname === AUTH_ROUTES.login) {
    if (hasAccessToken) {
      return NextResponse.redirect(
        new URL(AUTH_ROUTES.defaultRedirect, request.url)
      )
    }
    return NextResponse.next()
  }

  // 보호 라우트: 토큰 부재 시 /login으로 (returnTo 보존)
  if (!hasAccessToken) {
    const loginUrl = new URL(AUTH_ROUTES.login, request.url)
    loginUrl.searchParams.set('returnTo', `${pathname}${search}`)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
  // 새 보호 라우트 추가 시 여기에 패턴 추가
}
```

**중요**: 토큰 *존재 여부*만 확인합니다. 만료/위조 검증은 백엔드에 위임 (proxy 단에서 검증하지 않음 — Edge Runtime 한계 + 단일 진실 원천 유지).

---

## 👤 클라이언트 인증 훅

`src/lib/auth/use-auth.ts`에 정의되어 있습니다:

### `useSession()`

```typescript
'use client'
import { useSession } from '@/lib/auth/use-auth'

export function Header() {
  const { data: user, isLoading } = useSession()
  if (isLoading) return <Skeleton />
  return user ? <UserMenu user={user} /> : <LoginButton />
}
```

### `useLogin()`

```typescript
const { mutate: login, isPending, error } = useLogin()

login(
  { email, password },
  {
    onSuccess: () => router.push('/'),
    onError: err => toast.error(err.message),
  }
)
```

### `useLogout()`

```typescript
const { mutate: logout } = useLogout()
// 성공 시 query cache 자동 클리어
<Button onClick={() => logout()}>로그아웃</Button>
```

---

## 🖥 서버 컴포넌트에서 세션 조회

```typescript
// app/dashboard/page.tsx (Server Component)
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return <div>안녕하세요, {session.name}님</div>
}
```

`getSession()`은 `server-only` 모듈입니다. 클라이언트 컴포넌트에서 import하면 빌드 실패 — 이는 의도된 동작입니다.

### 서버에서 직접 백엔드 호출

```typescript
import { cookies } from 'next/headers'
import { createServerApiClient } from '@/lib/api/client'
import { AUTH_COOKIES } from '@/lib/auth/config'

const token = (await cookies()).get(AUTH_COOKIES.accessToken)?.value
const client = createServerApiClient(() => token ?? null)
const orders = await client.get('orders').json<Order[]>()
```

**참고**: 서버 컴포넌트는 `/api/proxy/*`를 거치지 않고 백엔드를 직접 호출합니다 (성능). 토큰만 cookies()로 직접 주입.

---

## 🔧 백엔드 계약 커스터마이징

백엔드 응답 형태가 다르면 다음을 수정하세요:

### 1) 토큰 응답 키가 다를 때

`src/app/api/auth/login/route.ts` (logout/refresh도 동일):

```typescript
const data = (await upstream.json()) as {
  access_token?: string // 백엔드가 snake_case라면
  refresh_token?: string
}
await setAuthCookies({
  accessToken: data.access_token,
  refreshToken: data.refresh_token,
})
```

### 2) 쿠키 이름 변경

`src/lib/auth/config.ts`:

```typescript
export const AUTH_COOKIES = {
  accessToken: 'my_access', // 변경
  refreshToken: 'my_refresh',
}
```

변경 후 빌드/typecheck로 일관성 확인.

### 3) 백엔드 엔드포인트 경로 변경

`src/lib/auth/config.ts`:

```typescript
export const BACKEND_AUTH_PATHS = {
  login: 'api/v1/auth/sign-in', // 변경
  logout: 'api/v1/auth/sign-out',
  refresh: 'api/v1/auth/token/refresh',
  me: 'api/v1/users/me',
}
```

### 4) 토큰 만료(maxAge) 변경

`src/lib/auth/config.ts`:

```typescript
export const AUTH_COOKIE_MAX_AGE = {
  accessToken: 60 * 60, // 1시간
  refreshToken: 60 * 60 * 24 * 30, // 30일
}
```

---

## 🛡 보안 체크리스트

- [ ] 토큰을 `localStorage`에 저장하지 않음 (XSS 노출)
- [ ] `BACKEND_API_BASE_URL`이 `NEXT_PUBLIC_*`이 아님 (서버 전용)
- [ ] 모든 클라이언트 호출이 `/api/proxy/*`를 경유
- [ ] 쿠키에 `httpOnly` + `sameSite=lax` + prod에서 `secure`
- [ ] 401 시 자동 로그아웃이 아닌 *리프레시 시도 후 실패*에만 로그아웃
- [ ] CSRF 보호: same-origin POST + sameSite 쿠키로 1차 방어 (필요 시 csrf 토큰 추가)
- [ ] proxy.ts matcher에 보호 라우트 빠짐 없이 등록

---

## 📎 관련 문서

- API 통신 패턴: [`api-pattern.md`](./api-pattern.md)
- 프로젝트 구조: [`project-structure.md`](./project-structure.md)
