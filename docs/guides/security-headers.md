# 🛡 보안 헤더 + CSP 가이드

이 baseline은 *프로덕션 출시 가능 수준*의 보안 헤더를 `next.config.ts`에 박아 두었습니다. 외부 도메인을 추가하거나 nonce 패턴으로 강화할 때 이 가이드를 따르세요.

---

## 🧭 적용된 헤더 8종

| 헤더                               | 값                                                             | 방어 대상                             |
| ---------------------------------- | -------------------------------------------------------------- | ------------------------------------- |
| `X-Frame-Options`                  | `DENY`                                                         | clickjacking (구형 브라우저)          |
| `X-Content-Type-Options`           | `nosniff`                                                      | MIME 스니핑                           |
| `Referrer-Policy`                  | `origin-when-cross-origin`                                     | Referrer 정보 노출                    |
| `X-XSS-Protection`                 | `1; mode=block`                                                | 구형 브라우저 XSS (현대는 CSP가 대체) |
| `Strict-Transport-Security` (HSTS) | `max-age=63072000; includeSubDomains; preload`                 | HTTPS 강제                            |
| `Permissions-Policy`               | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | 위험 API 기본 차단                    |
| `X-DNS-Prefetch-Control`           | `on`                                                           | 페이지 로드 시간 단축                 |
| `Content-Security-Policy`          | (빌드 시 동적 생성)                                            | XSS 2차 방어 (가장 강력)              |

---

## 🔒 CSP 정책 — `next.config.ts`의 `buildContentSecurityPolicy()`

```typescript
{
  'default-src': "'self'",
  'script-src':  "'self' 'unsafe-inline' [+ 'unsafe-eval' in dev]",
  'style-src':   "'self' 'unsafe-inline'",
  'img-src':     "'self' data: blob: https:",
  'font-src':    "'self' data:",
  'connect-src': "'self' [+ ws: wss: in dev]",
  'frame-ancestors': "'none'",
  'base-uri':    "'self'",
  'form-action': "'self'",
  'object-src':  "'none'",
}
```

### 환경별 차이

- **dev**: `script-src`에 `'unsafe-eval'` 추가 (Next dev/HMR 필수), `connect-src`에 `ws:`/`wss:` 추가 (HMR WebSocket)
- **prod**: 'unsafe-eval' 제거 → 더 strict

### 왜 `'unsafe-inline'`이 들어 있나

- Next.js는 *인라인 부트스트랩 스크립트*를 사용 (`<script>...</script>`)
- Tailwind/shadcn이 *인라인 style 속성*을 사용
- 둘 다 `'unsafe-inline'`이 없으면 동작 X
- *더 강력한 방어*는 nonce 패턴 (아래 섹션)

---

## 🔧 외부 도메인 추가 절차

새 도메인이 필요한 라이브러리/서비스를 도입할 때:

### 예시 1: Sentry 도입

```typescript
// next.config.ts의 buildContentSecurityPolicy()
'connect-src': [
  "'self'",
  ...(isProd ? [] : ['ws:', 'wss:']),
  'https://*.sentry.io',          // 추가 ← 에러 보고 + Replay
  'https://*.ingest.sentry.io',   // 추가 ← Sentry 이벤트 ingest
],
```

### 예시 2: Vercel Analytics

```typescript
'script-src': ["'self'", "'unsafe-inline'", 'https://va.vercel-scripts.com'],
'connect-src': ["'self'", 'https://vitals.vercel-insights.com'],
```

### 예시 3: Google Fonts (next/font 안 쓰고 직접 로드 시)

```typescript
'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
```

### 예시 4: 이미지 CDN (예: Cloudinary)

```typescript
'img-src': ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
```

### 예시 5: 외부 API 직접 호출 (드물지만 — 카카오 지도 SDK 등)

```typescript
'connect-src': ["'self'", 'https://dapi.kakao.com'],
'script-src':  ["'self'", "'unsafe-inline'", 'https://dapi.kakao.com'],
```

> **`/api/proxy/*` 경유 호출은 *same-origin*이라 connect-src 'self'로 충분**합니다 — 백엔드 도메인을 CSP에 추가할 필요 _없음_ (이게 우리 baseline의 보안 이점).

---

## 🚀 강화 옵션 — nonce 패턴 (선택)

`'unsafe-inline'`을 제거하고 *각 인라인 스크립트마다 nonce*를 부여하는 방식. 보안 감사가 엄격한 환경에서 권장.

### 마이그레이션 절차

#### Step 1 — `proxy.ts`(구 middleware)에서 nonce 생성

```typescript
// src/proxy.ts
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'unsafe-inline';
    ...
  `
    .replace(/\s{2,}/g, ' ')
    .trim()

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', cspHeader)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', cspHeader)
  // ... 기존 보호 라우트 로직
  return response
}
```

#### Step 2 — `app/layout.tsx`에서 nonce 적용

```typescript
import { headers } from 'next/headers'

export default async function RootLayout({ children }) {
  const nonce = (await headers()).get('x-nonce')
  return (
    <html>
      <body>
        <Script nonce={nonce ?? undefined} ... />
        {children}
      </body>
    </html>
  )
}
```

#### Step 3 — `next.config.ts`에서 정적 CSP 헤더 _제거_

nonce 기반은 동적이므로 `headers()`에서 CSP 빼고 proxy.ts가 담당.

### 트레이드오프

- XSS 2차 방어 매우 강력 (인라인 스크립트 인젝션 차단)
- 구현 복잡도 ↑
- Next.js의 일부 기능(분석, Vercel toolbar)과 호환성 검증 필요

**우리 baseline은 *unsafe-inline 허용*을 기본으로**. nonce는 _필요한 프로젝트만_ 가이드 따라 마이그레이션.

---

## 🧪 Report-Only 모드 (점진적 도입)

새로운 strict 정책을 _바로 차단하지 않고_ 위반 사항만 수집하려면:

```typescript
// next.config.ts headers()
{ key: 'Content-Security-Policy-Report-Only', value: '... report-uri /api/csp-report' }
```

별도 엔드포인트로 위반 보고를 받아 분석:

```typescript
// app/api/csp-report/route.ts
export async function POST(request: NextRequest) {
  const report = await request.json()
  console.warn('[CSP Violation]', report)
  // Sentry로 보내거나 로깅
  return new Response(null, { status: 204 })
}
```

이 방식으로 _몇 주간 모니터링_ 후 정식 정책으로 전환.

---

## ✅ X-Request-ID 전파 (사고 진단 키)

이 baseline은 다음 흐름으로 X-Request-ID를 자동 전파합니다:

```
[브라우저]
   │ ky beforeRequest 훅이 자동 생성/부착
   ▼
[/api/proxy/*]
   │ 클라이언트가 보낸 ID 보존하고 백엔드로 전달
   ▼
[백엔드]
   │ 같은 ID로 로그/Sentry 기록 (백엔드 책임)
   ▼
[/api/proxy/*]
   │ 응답 헤더에 echo (백엔드가 echo하지 않아도 프록시가 보장)
   ▼
[브라우저]
   │ 응답 헤더에서 ID 확인 가능
```

**백엔드 팀에 요청할 것**:

- [ ] `X-Request-ID` 헤더가 오면 _그대로 echo_
- [ ] 같은 ID로 백엔드 로그/Sentry/Grafana에 기록
- [ ] 없으면 백엔드가 직접 생성

이렇게 합의하면 *프론트 에러 → 백엔드 로그/메트릭*을 분 단위로 연결 가능.

---

## 📋 헬스체크 엔드포인트

`/api/health` — Vercel/uptime 모니터링이 호출하는 무인증 엔드포인트.

응답:

```json
{
  "status": "ok",
  "timestamp": "2026-05-04T12:00:00.000Z",
  "uptime": 12345.67
}
```

**검증 범위**: 프론트 자체 가동 여부만. 백엔드 의존 0.

백엔드까지 검증하려면 별도 엔드포인트:

```typescript
// app/api/health/deep/route.ts (옵션)
export async function GET() {
  try {
    const r = await fetch(`${serverEnv.BACKEND_API_BASE_URL}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(2000),
    })
    if (!r.ok) throw new Error('backend unhealthy')
    return NextResponse.json({ status: 'ok', backend: 'ok' })
  } catch (error) {
    return NextResponse.json(
      { status: 'degraded', backend: 'unreachable' },
      { status: 503 }
    )
  }
}
```

> **주의**: deep 헬스체크는 *외부 의존성*을 가집니다. 백엔드 일시 장애 시 우리 사이트도 *unhealthy*로 보고됨 → 로드밸런서가 트래픽을 차단할 수 있음. *얕은 헬스체크*를 기본으로, deep는 *별도 모니터링*용으로만.

---

## ⚠️ 흔한 함정

### 1) 외부 도메인 도입 후 _콘솔 에러 폭발_

- 증상: `Refused to connect to 'https://example.com' because it violates the following Content Security Policy directive: "connect-src 'self'"`
- 원인: 새 도메인이 CSP에 미등록
- 해결: `buildContentSecurityPolicy()`의 해당 directive에 도메인 추가

### 2) Sentry Replay가 작동 안 함

- 원인: `https://*.sentry.io`가 connect-src에 없음
- 해결: 위 _Sentry 도입_ 예시 참조

### 3) HSTS preload 후 _되돌리기 어려움_

- preload 디렉토리에 등록되면 _최소 1년_ 캐시
- 신규 도메인은 `max-age=300` 같은 *짧은 값*으로 시작 후 점진적 증가
- preload 등록 전: https://hstspreload.org/ 자가 검증

### 4) `frame-ancestors 'none'`이 _결제 위젯/iframe_ 차단

- 토스페이먼츠/포트원 등 결제 위젯은 *우리 사이트를 iframe으로 띄우려*는 경우가 있음
- 해결: 특정 결제 도메인만 허용 — `'none'` 대신 `https://payment.example.com`

### 5) Permissions-Policy 너무 광범위 차단

- 카메라/마이크가 필요한 기능 추가 시 (예: 사진 업로드)
- 해결: `camera=(self)` 같이 self만 허용으로 변경

### 6) report-only와 정식 헤더를 동시에 두면 _모두 적용_

- 둘 다 보내면 *둘 다 검증*됨 — 의도와 다름
- 마이그레이션 시: report-only로 검증 → 위반 0이면 정식으로 교체

---

## ✅ 보강 후 검증 체크리스트

- [ ] `npm run build` 통과
- [ ] dev 서버에서 `/users` 진입 → 콘솔에 CSP 위반 0건
- [ ] 응답 헤더 확인 (DevTools → Network → 페이지 응답 → Headers):
  - `Content-Security-Policy` 존재
  - `Strict-Transport-Security` 존재
  - `Permissions-Policy` 존재
- [ ] `/api/health` 200 응답
- [ ] `/api/proxy/users` 호출 후 응답 헤더에 `x-request-id` 존재
- [ ] _외부 도구 도입 시_ CSP 수정하고 다시 검증
- [ ] (옵션) https://securityheaders.com/ 으로 자가 점수 측정 — A+ 목표

---

## 📎 관련 문서

- API 통신 패턴: [`api-pattern.md`](./api-pattern.md)
- 인증 패턴: [`auth-pattern.md`](./auth-pattern.md)
- 모니터링: [`monitoring.md`](./monitoring.md) — Sentry 도입 시 CSP 수정 필요
- 외부 자료:
  - [MDN CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
  - [Next.js Content Security Policy](https://nextjs.org/docs/app/guides/content-security-policy)
  - [securityheaders.com](https://securityheaders.com/)
