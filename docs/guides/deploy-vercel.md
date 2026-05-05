# 🚀 Vercel 배포 가이드

이 문서는 claude-nextjs-starters baseline을 **Vercel에 배포**할 때의 셋업·환경변수·운영 패턴을 정의합니다.

> AWS Amplify, Cloudflare Pages 등 다른 플랫폼을 쓴다면 이 문서가 그대로 적용되지 않습니다 — 환경변수 셋업과 빌드 명령은 동일하지만, Edge Runtime 동작/Preview 흐름이 다를 수 있습니다.

---

## 🧭 배포 책임 분담

| 책임                               | 담당                                            |
| ---------------------------------- | ----------------------------------------------- |
| 빌드 (`next build`)                | **Vercel** (push/PR 자동 트리거)                |
| Preview 배포 (PR마다 고유 URL)     | **Vercel**                                      |
| Production 배포 (main 머지)        | **Vercel**                                      |
| Lint / Format / Typecheck 게이트   | **GitHub Actions** (`.github/workflows/ci.yml`) |
| 테스트 게이트                      | **GitHub Actions** (Phase 5-A 도입 시)          |
| 머지 차단 (status check 통과 강제) | **GitHub Branch Protection**                    |

> 둘은 *서로 보완적*입니다. Vercel은 빌드/배포만, 코드 품질 게이트는 GitHub Actions가 담당합니다.

---

## 🚀 초기 셋업 (5분)

### 1) Vercel 프로젝트 연결

1. https://vercel.com 로그인 → **Add New** → **Project**
2. GitHub 레포(`claude-nextjs-starters`) 선택 → **Import**
3. **Framework Preset**: Next.js (자동 감지)
4. **Build Command**: `npm run build` (자동)
5. **Install Command**: `npm install` (자동)
6. **Output Directory**: `.next` (자동, 손대지 말 것)

### 2) 환경변수 등록 (필수)

Vercel 대시보드 → Project → **Settings** → **Environment Variables**

| 변수                           | Production                | Preview                      | Development             | 민감도    |
| ------------------------------ | ------------------------- | ---------------------------- | ----------------------- | --------- |
| `BACKEND_API_BASE_URL`         | 실 백엔드 URL             | staging URL                  | localhost               | 서버 전용 |
| `NEXT_PUBLIC_APP_URL`          | `https://app.example.com` | (자동: VERCEL_URL 사용 가능) | `http://localhost:3000` | 공개      |
| `NEXT_PUBLIC_API_MOCK_ENABLED` | ** 절대 등록 X**          | (옵션)                       | `true` 가능             | 공개      |

> **`NEXT_PUBLIC_API_MOCK_ENABLED`를 prod에 `true`로 두면 클라이언트에 mock 코드가 로드되어 위험합니다.** Vercel의 _Production_ 환경에서는 등록조차 하지 마세요.

> **`BACKEND_API_BASE_URL`은 절대 `NEXT_PUBLIC_*`로 노출하지 마세요.** 클라이언트 번들에 백엔드 URL이 박히는 보안 사고가 됩니다.

### 3) Branch Protection 설정

GitHub 레포 → **Settings** → **Branches** → **Branch protection rules** → `main`:

- **Require a pull request before merging**
- **Require status checks to pass before merging**
  - 등록할 체크: `Check (typecheck + lint + format)`, `Build (next build)`
- (옵션) **Require branches to be up to date before merging**

이렇게 해야 GitHub Actions CI가 통과해야만 main에 머지됩니다.

---

## 🌍 환경별 동작

### Production (main 브랜치)

```
push to main
  ├─→ GitHub Actions: check-all + build (게이트)
  └─→ Vercel: build + deploy → app.example.com
```

- `BACKEND_API_BASE_URL` = 실 백엔드 URL
- MSW: 비활성화 (환경변수 없음)
- httpOnly 쿠키 `secure: true` (자동 — `NODE_ENV=production`)

### Preview (PR)

```
PR 생성/업데이트
  ├─→ GitHub Actions: check-all + build
  └─→ Vercel: build + deploy → pr-123-yourapp.vercel.app
```

- `BACKEND_API_BASE_URL` = staging URL 권장 (없으면 prod URL 또는 placeholder)
- _각 PR마다 고유 URL_ — QA/PR 리뷰어가 직접 동작 확인 가능
- 백엔드 staging이 없는 초기에는 `http://placeholder.local` 같은 더미값으로 빌드만 통과시키고 동작 검증은 로컬에서

### Development (로컬)

```
npm run dev
```

- `.env.local`에서 환경변수 로드 (`.env.example` 참조)
- MSW 활성화 가능 (`NEXT_PUBLIC_API_MOCK_ENABLED=true`)

---

## ⚙️ Runtime 결정 — Node vs Edge

이 baseline의 Route Handler는 **Node Runtime**을 사용합니다 (기본값).

| 컴포넌트                           | Runtime     | 이유                                       |
| ---------------------------------- | ----------- | ------------------------------------------ |
| `app/api/proxy/[...path]/route.ts` | Node (기본) | `fetch` 스트리밍 + `duplex: 'half'` 호환성 |
| `app/api/auth/*/route.ts`          | Node (기본) | `cookies()` (next/headers) 사용            |
| `src/proxy.ts` (구 middleware)     | Edge (자동) | Vercel이 강제 — 가벼운 인증 검증만         |

**필요 시 명시적 선언**:

```typescript
// route.ts 상단에 추가
export const runtime = 'nodejs' // 명시
export const runtime = 'edge' // 사용 시
export const dynamic = 'force-dynamic' // SSG 방지
```

대부분의 경우 *기본값을 유지*하는 것이 안전합니다. Edge로 강제 시 `next/headers`의 `cookies()`는 동작하지만, 우리 인증 흐름의 일부 헬퍼(`server-only`)가 Edge에서 호환되지 않을 수 있습니다.

---

## 🔁 Vercel과 GitHub Actions의 협력

```
[Developer]  git push
                ↓
        ┌───────┴───────┐
        ↓               ↓
[GitHub Actions]    [Vercel]
 - typecheck         - npm install
 - lint              - next build
 - format            - deploy preview
 - (test)            - deploy prod (main만)
        ↓               ↓
[Status Check]      [Preview URL]
        ↓
[Branch Protection]
        ↓
   머지 가능 여부 결정
```

GitHub Actions는 _느린 게이트_, Vercel은 _빠른 결과물 제공_. 둘이 병렬로 돌아 PR 리뷰 시 Preview URL을 바로 클릭하고 동시에 CI 통과 여부를 봄.

---

## 🚨 흔한 함정과 해결

### 1) 빌드 실패: `BACKEND_API_BASE_URL is required`

- 원인: Vercel 환경변수 미등록
- 해결: 대시보드 → Environment Variables에 _Preview/Production 모두_ 등록

### 2) Preview에서 API 호출 실패

- 원인: Preview에는 staging 백엔드 URL이 없거나, CORS 미설정
- 해결: 우리 baseline은 same-origin `/api/proxy/*`로 호출하므로 _CORS 영향 없음_. 단, 프록시 대상 백엔드가 Preview에서도 접근 가능해야 함 → 백엔드 staging URL을 Vercel Preview env에 등록

### 3) prod에 mock이 켜져 있음

- 원인: `NEXT_PUBLIC_API_MOCK_ENABLED=true`가 Production에 등록됨
- 해결: Production에서 즉시 _제거_ (등록조차 하지 말 것). 이미 배포되었다면 환경변수 제거 → 강제 재배포

### 4) `proxy.ts`가 Edge Runtime 호환성 에러

- 원인: `proxy.ts`는 자동으로 Edge에서 실행됨. 일부 Node-only API(`Buffer`, `crypto.randomBytes` 등) 사용 시 fail
- 해결: `proxy.ts`는 _가볍게 유지_ — 쿠키 존재 검사 + 리디렉션만. 무거운 검증은 Route Handler로

### 5) Vercel Preview의 도메인이 매번 바뀜 → 쿠키 도메인 이슈

- 원인: `pr-123-yourapp.vercel.app`이 PR마다 변경됨
- 우리 baseline은 _same-origin 쿠키_ 사용 — 도메인 이슈 없음
- 단, OAuth 콜백 URL을 등록할 때는 _Wildcard_ 또는 _staging 고정 URL_ 사용 필요

### 6) GitHub Actions에서 `BACKEND_API_BASE_URL` 누락

- CI 워크플로우(`ci.yml`)에 placeholder 기본값이 박혀 있음 (`http://placeholder.local`)
- 실제 staging URL을 CI에서도 쓰려면 GitHub → Settings → Secrets에 `BACKEND_API_BASE_URL` 등록

---

## ✅ 배포 전 체크리스트

### 첫 배포

- [ ] Vercel에 GitHub 레포 연결
- [ ] Environment Variables 등록 (Production / Preview)
- [ ] `BACKEND_API_BASE_URL` 서버 전용 확인 (NEXT_PUBLIC_X)
- [ ] `NEXT_PUBLIC_API_MOCK_ENABLED` Production에 등록되지 않음 확인
- [ ] GitHub Branch Protection: `check`, `build` status check 등록
- [ ] Preview URL 동작 확인

### 매 배포 (자동, 확인용)

- [ ] GitHub Actions CI 통과
- [ ] Vercel Preview 빌드 성공
- [ ] PR 리뷰어가 Preview URL에서 핵심 흐름 확인

### 보안 점검 (분기별)

- [ ] 환경변수 중 `NEXT_PUBLIC_*`에 비밀이 들어있지 않은지
- [ ] Vercel 로그에서 토큰/시크릿 노출 없는지 (`/api/proxy/*` 헤더 로깅 주의)
- [ ] Branch Protection 우회 가능한지 (Admin override 등)

---

## 📎 관련 문서

- 인증 흐름 (쿠키 동작 환경별 차이): [`auth-pattern.md`](./auth-pattern.md)
- API 통신 패턴 (프록시 동작): [`api-pattern.md`](./api-pattern.md)
- MSW 모킹 (prod에 켜지면 안 됨): [`mocking-msw.md`](./mocking-msw.md)
- 외부 자료:
  - [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
  - [Next.js Deployment](https://nextjs.org/docs/app/getting-started/deploying)
