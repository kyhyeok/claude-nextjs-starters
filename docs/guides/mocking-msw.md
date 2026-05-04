# 🧪 MSW 모킹 가이드

이 문서는 Mock Service Worker(MSW) v2를 사용해 백엔드 미구동 상태에서 프론트를 선행 개발하는 방법을 정의합니다.

---

## 🧭 활성화 조건

MSW worker는 **다음 모든 조건을 만족할 때만** 시작됩니다:

| 조건 | 값                                         |
| ---- | ------------------------------------------ |
| 환경 | 브라우저 (`typeof window !== 'undefined'`) |
| 빌드 | `NODE_ENV === 'development'`               |
| 토글 | `NEXT_PUBLIC_API_MOCK_ENABLED === 'true'`  |

**prod 빌드에서는 mock/handlers/faker가 dynamic import로 분리되어 번들에 포함되지 않습니다.**

---

## 🚀 빠른 시작

### 1) 활성화

```bash
# .env.local
NEXT_PUBLIC_API_MOCK_ENABLED=true
```

### 2) 개발 서버 시작

```bash
npm run dev
```

브라우저 콘솔에 `[MSW] Mocking enabled.` 메시지가 보이면 정상.

### 3) 동작 확인

`http://localhost:3000/users` 접속 → mock 사용자 목록이 보이면 OK.

---

## 🏗 MSW 파일 구조

```
src/mocks/
├── handlers.ts                      # 핸들러 통합 (도메인 mock 모음)
├── browser.ts                       # setupWorker(...handlers)
└── init.ts                          # startMSW() — 환경 게이트 + dynamic import

public/
└── mockServiceWorker.js             # MSW 워커 (npx msw init 산출물)

src/components/providers/
└── mock-provider.tsx                # worker 준비 후 children 렌더 게이트
```

---

## 🔧 MSW 핸들러는 어떻게 만들어지나

### 자동 생성 (orval)

`orval.config.ts`의 `mock: { type: 'msw' }` 설정으로 OpenAPI 스펙 기반 핸들러가 자동 생성됩니다.

```
src/lib/api/generated/
└── users/
    ├── users.ts        # typed fetch 함수
    └── users.msw.ts    # ← MSW 핸들러 + faker 기반 응답 데이터
```

`getUsersMock()` 함수가 모든 핸들러를 배열로 반환합니다.

### 통합 (`src/mocks/handlers.ts`)

```typescript
import type { HttpHandler } from 'msw'
import { getUsersMock } from '@/lib/api/generated/users/users.msw'
import { getProductsMock } from '@/lib/api/generated/products/products.msw'

export const handlers: HttpHandler[] = [...getUsersMock(), ...getProductsMock()]
```

---

## 🎨 mock 응답 커스터마이징

### 1) 특정 endpoint만 다르게

generated에서 핸들러 함수도 export하므로 직접 호출하며 응답을 주입:

```typescript
// src/mocks/handlers.ts
import { getListUsersMockHandler } from '@/lib/api/generated/users/users.msw'

export const handlers = [
  // 자동 생성된 mock 무시하고 직접 응답 지정
  getListUsersMockHandler({
    items: [
      {
        id: 'u1',
        email: 'alice@test',
        name: 'Alice',
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'u2',
        email: 'bob@test',
        name: 'Bob',
        createdAt: '2024-01-02T00:00:00Z',
      },
    ],
    page: 1,
    size: 20,
    total: 2,
  }),
  // 나머지 users 핸들러는 자동 생성 사용
  ...getUsersMock().filter(
    h => h.info.path !== '/api/proxy/users' || h.info.method !== 'GET'
  ),
]
```

### 2) 동적 응답 (조건부)

```typescript
import { http, HttpResponse } from 'msw'

export const handlers: HttpHandler[] = [
  ...getUsersMock(),
  // 인증 mock 추가 (예: dev 더미 로그인)
  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string }
    if (body.email === 'admin@test' && body.password === 'admin') {
      return HttpResponse.json({ ok: true })
    }
    return HttpResponse.json({ message: '잘못된 자격증명' }, { status: 401 })
  }),
]
```

### 3) 특정 케이스에만 에러 시뮬레이션

```typescript
http.get('/api/proxy/users/:id', ({ params }) => {
  if (params.id === 'broken') {
    return HttpResponse.json(
      { message: '서버 오류 시뮬레이션', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
  // 다른 id는 자동 생성 핸들러로 통과
  return new HttpResponse(null, { status: 404 }) // bypass 효과
})
```

---

## 🌐 매칭 경로의 베이스

`orval.config.ts`의 `mock.baseUrl: '/api/proxy'` 설정으로 핸들러가 클라이언트 트래픽 경로(`/api/proxy/users` 등)에 매칭되도록 설정되어 있습니다.

만약 `/api/proxy/*`를 거치지 않는 호출(예: 외부 third-party API)도 모킹하려면, 별도 핸들러를 절대 URL로 추가:

```typescript
http.get('https://api.kakao.com/v2/local/...', () => HttpResponse.json({ ... }))
```

---

## 🛠 MSW 시작 흐름 (내부 동작)

```
[layout.tsx]
   │
   ▼
[MockProvider]
   │ isMockEnabled()
   ▼
   ├─ false → 즉시 children 렌더 (성능 영향 0)
   └─ true →
       │ dynamic import('@/mocks/init')
       │ startMSW()
       │   └─ dynamic import('@/mocks/browser')
       │     └─ worker.start({ onUnhandledRequest: 'bypass' })
       │ setReady(true)
       ▼
       children 렌더
```

`onUnhandledRequest: 'bypass'`로 설정되어 있어, 핸들러가 없는 요청(Next.js 자체 트래픽 등)은 그대로 통과합니다.

---

## 🚨 흔한 문제와 해결

### `[MSW] Mocking enabled` 메시지가 안 뜸

- `.env.local`에 `NEXT_PUBLIC_API_MOCK_ENABLED=true` 확인
- `NODE_ENV=development` 확인 (`npm run dev`)
- `public/mockServiceWorker.js` 파일 존재 확인. 없다면:
  ```bash
  npx msw init public/ --save
  ```

### 요청이 mock에 매칭되지 않음 (`onUnhandledRequest` 경고)

- `orval.config.ts`의 `mock.baseUrl`이 클라이언트 호출 경로와 일치하는지 확인
- `npm run gen:api` 재실행
- 핸들러가 `src/mocks/handlers.ts`에 통합되었는지 확인

### prod 빌드에 mock 코드가 들어감

- `MockProvider`가 dynamic import를 사용하는지 확인 (`mock-provider.tsx`)
- `src/mocks/*`를 최상위에서 정적 import 금지

### Service Worker가 캐시되어 갱신 안 됨

- 브라우저 DevTools → Application → Service Workers → Unregister
- 또는 `Ctrl+Shift+R`로 하드 리로드

---

## 💡 개발 워크플로우 추천

### 백엔드 미완성 → 스펙 합의 → 프론트 선행

```
1. 백엔드 팀과 OpenAPI 스펙 초안 합의 (paths/schemas/examples 채우기)
2. openapi/<spec>.yaml 저장
3. npm run gen:api → typed 함수 + 자동 mock 생성
4. NEXT_PUBLIC_API_MOCK_ENABLED=true로 프론트 개발
5. 백엔드 완성 → MSW 비활성화로 토글 → 실제 통신 검증
```

### 통합 테스트 시 mock vs 실서버 토글

```bash
# mock으로
NEXT_PUBLIC_API_MOCK_ENABLED=true npm run dev

# 실서버로
NEXT_PUBLIC_API_MOCK_ENABLED=false npm run dev
```

---

## ✅ 체크리스트

- [ ] `public/mockServiceWorker.js` 존재 (`npx msw init public/` 한 번 실행)
- [ ] `.env.local`에 `NEXT_PUBLIC_API_MOCK_ENABLED=true`
- [ ] `orval.config.ts`의 `mock.baseUrl`이 `/api/proxy`
- [ ] 새 도메인 mock은 `npm run gen:api` 후 `handlers.ts`에 통합
- [ ] prod 빌드 시 `MockProvider`가 dynamic import만 사용하는지 확인
- [ ] 도메인별 커스텀 응답이 필요하면 `getXxxMockHandler()` override

---

## 📎 관련 문서

- API 통신 패턴: [`api-pattern.md`](./api-pattern.md)
- 인증 패턴 (mock 로그인): [`auth-pattern.md`](./auth-pattern.md)
- MSW 공식 문서: https://mswjs.io/docs/
