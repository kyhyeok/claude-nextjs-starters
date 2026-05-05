# 📊 모니터링 가이드

이 baseline은 모니터링 SDK를 _기본 포함하지 않습니다_. 프로덕션 출시 직전에 필요한 도구를 이 가이드의 절차로 도입합니다.

> 백엔드 팀이 **Prometheus + Grafana**를 운영하는 환경을 가정합니다. 프론트엔드는 **Sentry**(또는 가벼운 대안)로 *사용자 경험*을 모니터링하는 분담이 자연스럽습니다.

---

## 🧭 분담 — 무엇을 어디서 모니터링하나

| 영역                                      | 도구                          | 답하는 질문                                   |
| ----------------------------------------- | ----------------------------- | --------------------------------------------- |
| **백엔드 인프라/메트릭**                  | Prometheus + Grafana          | "서버가 잘 돌고 있나?" — CPU/Heap/응답시간/큐 |
| **백엔드 예외(스택트레이스)**             | Sentry (Spring SDK) _옵션_    | "백엔드의 어떤 코드가 던진 예외인가?"         |
| **프론트엔드 에러/세션**                  | Sentry (JS SDK)               | "*이 사용자*가 _왜_ 깨졌나?"                  |
| **프론트엔드 트래픽/Web Vitals (가벼움)** | Vercel Analytics 또는 PostHog | "어떤 페이지가 느린가? 어디서 이탈?"          |
| **사용자 행동 분석 (제품 측)**            | PostHog / GA4                 | "어떤 기능을 얼마나 쓰나? funnel은?"          |

이들은 _서로 겹치지 않습니다_. 한쪽 도구로 다른 쪽을 대신할 수 없습니다.

### 한쪽만 있을 때의 _블라인드 스팟_

- **백엔드 메트릭만**: 서버는 200 응답했는데 *클라이언트 JS 에러*로 화면이 깨진 경우 안 보임
- **프론트엔드 모니터만**: DB connection pool 고갈, 큐 적체 안 보임

→ **둘이 합쳐져야 사고 진단이 완전**합니다 (예: "DB 풀 고갈로 결제 API 8s 지연" + "결제 timeout 247건, 사용자 세션 재생").

---

## 1️⃣ Sentry 도입 절차

### Step 1 — 계정/프로젝트 생성

1. https://sentry.io 가입 (무료 플랜: 5k 에러 + 10k 성능 / 월)
2. 새 프로젝트 → Platform: **Next.js**
3. DSN(`https://...@o.../...`) 발급받기

### Step 2 — SDK 설치 + Wizard

```bash
npx @sentry/wizard@latest -i nextjs
```

위저드가 자동 생성하는 파일:

- `sentry.client.config.ts` — 브라우저 SDK 초기화
- `sentry.server.config.ts` — 서버(Route Handler) SDK
- `sentry.edge.config.ts` — Edge Runtime (proxy.ts) SDK
- `next.config.ts` — `withSentryConfig`로 감쌈
- `instrumentation.ts` — Next.js의 instrumentation hook

### Step 3 — 환경변수 (`.env.example` 보강)

```bash
# 신규 추가 (서버/클라 양쪽에서 필요해 NEXT_PUBLIC_ 사용)
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# Source map 업로드용 (CI 전용 시크릿)
SENTRY_AUTH_TOKEN=<sentry org token>
SENTRY_ORG=<your-org>
SENTRY_PROJECT=<your-project>
```

> **prod 환경에서만 활성화**. `sentry.*.config.ts`의 `enabled` 옵션을 `process.env.NODE_ENV === 'production'`로 게이트.

### Step 4 — 우리 baseline의 `ApiError`와 통합

핵심 — _4xx는 보고하지 않고 5xx/네트워크 에러만 Sentry로_. 4xx는 _예상되는 사용자 흐름_(401 만료, 400 검증 실패 등)이라 보고하면 스팸이 됩니다.

```typescript
// src/lib/api/client.ts의 afterResponse 인터셉터에 추가
import * as Sentry from '@sentry/nextjs'
import { ApiError } from './errors'

afterResponse: [
  async (request, options, response) => {
    // ... 기존 로직 (401 리프레시, ApiError 생성)

    // 5xx만 Sentry로 보고
    if (!response.ok && response.status >= 500) {
      Sentry.captureException(
        new ApiError({
          message: ...,
          status: response.status,
          code: ...,
        }),
        {
          tags: { 'api.status': response.status, 'api.code': code },
          extra: { url: request.url, method: request.method },
        },
      )
    }

    // 기존 throw 로직 그대로
  },
],
```

### Step 5 — 글로벌 에러 바운더리(`error.tsx`)에서 보고

```typescript
// src/app/global-error.tsx (신규)
'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <h2>일시적인 오류가 발생했습니다</h2>
      </body>
    </html>
  )
}
```

또한 `src/app/error.tsx`(라우트 단위)에도 동일 패턴.

### Step 6 — PII(개인정보) 필터링 — _보안 1순위_

토큰/이메일/쿠키 등이 Sentry로 _절대 흘러가지 않도록_ `beforeSend`에서 필터링:

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1, // 10% 트랜잭션만 (비용 절약)
  replaysSessionSampleRate: 0, // 일반 세션 X
  replaysOnErrorSampleRate: 1.0, // 에러 시에만 세션 재생

  beforeSend(event, hint) {
    // Authorization 헤더 마스킹
    if (event.request?.headers) {
      delete event.request.headers['authorization']
      delete event.request.headers['cookie']
    }

    // URL의 토큰 쿼리 파라미터 마스킹 (예: ?token=...)
    if (event.request?.url) {
      event.request.url = event.request.url.replace(
        /([?&](?:token|access_token|auth)=)[^&]+/gi,
        '$1[FILTERED]'
      )
    }

    // 사용자 이메일 등 PII 제거 (정책에 따라)
    if (event.user) {
      delete event.user.email
      delete event.user.ip_address
    }

    return event
  },

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true, // 모든 텍스트 마스킹 (XSS 안전)
      blockAllMedia: true, // 이미지/동영상 차단
      maskAllInputs: true, // 모든 input 값 마스킹 (필수)
    }),
  ],
})
```

### Step 7 — Source Map 업로드 (CI 자동화)

`next.config.ts`의 `withSentryConfig`가 `SENTRY_AUTH_TOKEN`이 있을 때 자동으로 빌드 시 source map을 Sentry로 업로드합니다 — prod에서 압축된 스택트레이스가 _원본 소스로_ 복원되어 디버깅이 쉬워짐.

`.github/workflows/ci.yml`에 시크릿 등록:

```yaml
- run: npm run build
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
    SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
```

Vercel 배포 시: Vercel ↔ Sentry *Marketplace 통합*을 사용하면 환경변수가 자동 주입됨.

### Step 8 — Release Tracking (선택)

배포 버전을 추적하면 _어느 배포에서 새 에러가 생겼는지_ 자동 추적됩니다. Vercel은 `VERCEL_GIT_COMMIT_SHA`를 자동 제공:

```typescript
Sentry.init({
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  // ...
})
```

---

## 2️⃣ 가벼운 대안 비교

Sentry 외에도 _목적별로_ 다른 가벼운 도구를 함께 쓰는 게 일반적입니다.

| 도구                         | 무엇?                      | 무료 한도              | 가치                            |
| ---------------------------- | -------------------------- | ---------------------- | ------------------------------- |
| **Vercel Analytics**         | 페이지뷰/Web Vitals        | Hobby 무료, Pro $10/월 | Vercel 1클릭 통합. 가벼움       |
| **Vercel Speed Insights**    | LCP/FID/CLS 사용자 측정    | Hobby 무료             | Web Vitals만 깊게               |
| **PostHog**                  | 사용자 행동 + funnel + A/B | 1M 이벤트/월           | 제품 분석 강함, 셀프호스트 가능 |
| **Plausible**                | 트래픽 (개인정보 친화)     | 유료 ($9/월부터)       | GA 대안, 쿠키 없음              |
| **Cloudflare Web Analytics** | 트래픽                     | 무료                   | DNS가 Cloudflare면              |

**조합 추천**:

- **최소**: Sentry (에러) + Vercel Analytics (트래픽/Web Vitals)
- **표준**: Sentry + Vercel Analytics + (B2C라면) PostHog
- **개인정보 민감**: Sentry(PII 필터 강화) + Plausible

---

## 3️⃣ 환경별 활성화 매트릭스

| 환경               | Sentry             | Vercel Analytics | 비고                                    |
| ------------------ | ------------------ | ---------------- | --------------------------------------- |
| Production         |                    |                  | 모두 활성                               |
| Preview (PR)       | 또는 별도 프로젝트 |                  | Sentry는 _prod 전용_ — preview 노이즈 X |
| Development (로컬) |                    |                  | dev는 콘솔로 충분                       |

`enabled: process.env.NODE_ENV === 'production'`로 게이트.

---

## 4️⃣ 무료 한도 관리

Sentry 무료 = **5,000 에러 + 10,000 성능 트랜잭션 / 월**.

한도를 넘기면 데이터 손실. 다음을 미리 셋업:

- `tracesSampleRate: 0.1` (10%만 샘플링) — 트래픽 큰 서비스 필수
- `ignoreErrors`로 _예측 가능한 에러_ 무시:
  ```typescript
  ignoreErrors: [
    'NetworkError when attempting to fetch resource', // 사용자 네트워크 끊김
    'ResizeObserver loop limit exceeded', // 무해한 브라우저 노이즈
    /^cancelled$/i, // AbortController 취소
  ]
  ```
- 4xx는 위 ApiError 인터셉터에서 _보고하지 않음_
- Sentry 대시보드의 *Inbound Filters*로 봇/스팸 차단

---

## 5️⃣ 백엔드 팀과의 합의 항목

백엔드가 Prom+Graf 운영 + (옵션) Sentry Spring SDK 도입 시:

- [ ] *예외 추적*은 어디서? (Sentry 백엔드 SDK vs Prom 5xx 카운트만)
- [ ] *프론트엔드 Sentry*에서 잡힌 5xx와 *백엔드 Sentry/Grafana*의 5xx가 일치하는지 _상관관계_ 분석 가능한가
- [ ] **trace ID 전파** — 프론트가 `X-Request-ID` 또는 `traceparent` 헤더를 보내고 백엔드가 그대로 사용 → 프론트 에러와 백엔드 로그를 연결 가능
- [ ] _알림 채널 통합_ — Slack 등에 Grafana/Sentry 알림 분리 (혼선 방지)
- [ ] _민감정보 정책 합의_ — 양쪽에서 PII 필터링 일관성

---

## 6️⃣ 우리 baseline에 통합 시 변경되는 파일

| 파일                       | 변경                                  |
| -------------------------- | ------------------------------------- |
| `package.json`             | `@sentry/nextjs` 추가                 |
| `next.config.ts`           | `withSentryConfig`로 감쌈             |
| `sentry.client.config.ts`  | 신규 (PII 필터, Replay, ignoreErrors) |
| `sentry.server.config.ts`  | 신규                                  |
| `sentry.edge.config.ts`    | 신규                                  |
| `instrumentation.ts`       | 신규                                  |
| `src/lib/api/client.ts`    | 5xx만 `captureException` 호출 추가    |
| `src/app/global-error.tsx` | 신규 (글로벌 에러 바운더리)           |
| `src/lib/env/client.ts`    | `NEXT_PUBLIC_SENTRY_DSN` 추가         |
| `.env.example`             | DSN 등 환경변수 가이드                |
| `.github/workflows/ci.yml` | source map 업로드용 secrets           |

---

## ⚠️ 흔한 함정

### 1) DSN을 NEXT*PUBLIC\*\*에 두는 게 *맞다\*

- DSN은 _공개해도 되는 식별자_. 토큰/시크릿 아님.
- 단, _Auth Token_(`SENTRY_AUTH_TOKEN`)은 절대 NEXT_PUBLIC_X — 서버/CI 전용.

### 2) 4xx 에러까지 Sentry로 보내면 노이즈 폭발

- 401 만료, 400 검증 실패는 _예상된 사용자 흐름_
- 5xx + 네트워크 에러만 보고

### 3) Session Replay에 PII 노출

- `maskAllText`, `maskAllInputs`, `blockAllMedia`를 켜야 안전
- 결제/주민번호 등 입력 필드는 추가로 `data-sentry-mask` 속성

### 4) Preview 환경에서 prod 프로젝트로 이벤트 발생

- `enabled: NODE_ENV === 'production'` 게이트 필수
- 또는 별도 Sentry 프로젝트 (preview/prod 분리)

### 5) 무료 한도 초과 후 _조용히_ 데이터 손실

- 알림 설정: Sentry → Quotas → 80% 도달 시 이메일

### 6) Spring 백엔드와 trace ID 미연결

- 프론트가 `X-Request-ID`를 보내고 백엔드 로그/Sentry에 같은 ID 기록
- Grafana/Loki에서도 같은 ID로 조회 가능 → 사고 진단 시 _분 단위 절약_

---

## ✅ 도입 체크리스트

### 프론트엔드 측

- [ ] Sentry 계정/프로젝트 생성, DSN 발급
- [ ] `npx @sentry/wizard@latest -i nextjs` 실행
- [ ] `enabled` 게이트 (prod 한정)
- [ ] PII 필터링(`beforeSend`) 강화
- [ ] Replay 마스킹 옵션 적용
- [ ] `ApiError` 5xx만 보고하도록 `client.ts` 패치
- [ ] `global-error.tsx` 추가
- [ ] `ignoreErrors`로 노이즈 차단
- [ ] CI에 source map 업로드 시크릿 등록
- [ ] 무료 한도 80% 알림 설정

### 백엔드 합의

- [ ] 백엔드 예외는 어디서 추적? (Prom 5xx vs Sentry Spring)
- [ ] X-Request-ID / traceparent 헤더 전파 합의
- [ ] PII 필터링 정책 양측 일관성

### 가벼운 대안 추가 (옵션)

- [ ] Vercel Analytics (한 줄 통합) — 트래픽/Web Vitals
- [ ] PostHog (B2C/제품 분석 필요 시)

---

## 📎 관련 문서

- API 통신 패턴 (`ApiError`): [`api-pattern.md`](./api-pattern.md)
- Vercel 배포: [`deploy-vercel.md`](./deploy-vercel.md)
- 외부 자료:
  - [Sentry for Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
  - [Vercel Analytics](https://vercel.com/docs/analytics)
  - [Prometheus](https://prometheus.io/)
  - [Grafana](https://grafana.com/)
