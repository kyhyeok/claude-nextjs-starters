# 🎭 E2E 테스트 — Playwright 도입 가이드

이 baseline은 **E2E 테스트(Playwright)를 _기본 포함하지 않습니다_**. 단위/컴포넌트 테스트(Vitest + RTL)만 baseline에 들어 있고, E2E는 *도메인이 안정화된 시점*에 이 가이드의 절차로 도입합니다.

> **왜 옵션인가**: baseline 60% 이상의 프로젝트는 _E2E 없이 시작_ 합니다. Playwright는 브라우저 다운로드(~150MB) + CI 시간(평균 +2분) + 학습 곡선이 있어, _도메인 흐름이 굳기 전에는_ 단위/컴포넌트 테스트가 ROI가 더 높습니다. 이 가이드의 보존 코드를 그대로 붙여넣으면 _5분 안에 baseline 시점 상태로 복구_ 됩니다.

---

## 🎯 도입 시점 결정 트리

```
도메인의 핵심 사용자 흐름이 _3개 이상_ 안정화됐나?
       │
       ├── NO  → Vitest + RTL로 충분, 도입 보류
       │
       └── YES → 다음 질문
              │
       돌이킬 수 없는 흐름(결제/주문/탈퇴)이 있나?
              │
              ├── YES → ⭐ 즉시 도입 권장
              │
              └── NO  → 인증 흐름(로그인 → 보호 라우트)이 있나?
                     │
                     ├── YES → 도입 권장 (auth-protection 시나리오 가치 높음)
                     │
                     └── NO  → 컴포넌트 테스트로 충분
```

---

## 🚀 재도입 절차 (5분)

### Step 1 — 패키지 설치

```bash
npm i -D @playwright/test
npx playwright install chromium
```

### Step 2 — `package.json` scripts 추가

```json
"scripts": {
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```

### Step 3 — `playwright.config.ts` 복원 (프로젝트 루트)

아래 §보존 코드 1을 복사해 루트에 저장.

### Step 4 — `tests/e2e/` 시나리오 복원

아래 §보존 코드 2, 3을 복사해 `tests/e2e/auth-protection.spec.ts` / `users-page.spec.ts`로 저장.

### Step 5 — `.github/workflows/ci.yml`에 e2e job 추가

아래 §보존 코드 4를 복사해 기존 `test` job 아래에 붙여넣기.

### Step 6 — 검증

```bash
npm run test:e2e         # 헤드리스 — 4 케이스 통과 확인
npm run test:e2e:ui      # UI 모드 — 디버깅용
```

---

## 📦 보존 코드 1 — `playwright.config.ts`

baseline에서 떼어낸 _그대로의_ 설정. MSW 통합 + 데스크톱/모바일 viewport 포함.

```typescript
import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E 설정.
 *
 * - 테스트 위치: tests/e2e/
 * - dev 서버 자동 시작 (webServer) — MSW 활성화 상태로
 * - 로컬은 빠른 실행 우선, CI는 안정성 우선 (retries, single worker)
 *
 * 실행:
 *   npm run test:e2e         # 헤드리스
 *   npm run test:e2e:ui      # UI 모드 (디버깅용)
 *
 * 처음 실행 전 한 번만:
 *   npx playwright install chromium
 */
const PORT = 3000

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // mobile-first 회귀 방지 — 모바일 viewport에서도 핵심 흐름 검증.
    // 기본은 chromium 엔진 + iPhone/Pixel viewport(레이아웃 회귀 잡기 충분).
    // 실제 Safari 특화 버그까지 잡으려면 `npx playwright install webkit` 후
    // browserName: 'webkit'으로 변경하세요.
    {
      name: 'mobile-ios',
      use: { ...devices['iPhone 14'], browserName: 'chromium' },
    },
    {
      name: 'mobile-android',
      use: { ...devices['Pixel 7'] },
    },
    // 다른 브라우저가 필요하면 아래 주석 해제 (webkit/firefox 별도 설치 필요):
    // { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  ],

  webServer: {
    // MSW를 켜고 dev 서버 자동 시작 — 백엔드 없이 E2E 가능
    command: 'npm run dev',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      BACKEND_API_BASE_URL: 'http://placeholder.local',
      NEXT_PUBLIC_API_MOCK_ENABLED: 'true',
    },
  },
})
```

---

## 📦 보존 코드 2 — `tests/e2e/auth-protection.spec.ts`

`proxy.ts` matcher의 *보호 라우트 리디렉션*을 검증.

```typescript
import { expect, test } from '@playwright/test'

/**
 * E2E — 보호 라우트(proxy.ts matcher) 동작 검증.
 *
 * `/dashboard/*`는 access_token 쿠키가 없으면 /login?returnTo=...로 리디렉션됩니다.
 * (proxy.ts의 config.matcher에 등록되어 있어야 함)
 */
test.describe('보호 라우트', () => {
  test('미인증 상태에서 /dashboard 접근 시 /login으로 리디렉션', async ({
    page,
  }) => {
    await page.goto('/dashboard/anything')
    await expect(page).toHaveURL(/\/login\?returnTo=/)

    // returnTo 쿼리 파라미터가 보존되었는지
    const url = new URL(page.url())
    expect(url.searchParams.get('returnTo')).toBe('/dashboard/anything')
  })

  test('/users는 보호 라우트가 아니므로 직접 접근 가능 (예시)', async ({
    page,
  }) => {
    await page.goto('/users')
    await expect(page).toHaveURL(/\/users$/)
  })
})
```

---

## 📦 보존 코드 3 — `tests/e2e/users-page.spec.ts`

MSW 통합 흐름(클라이언트 → /api/proxy → mock 핸들러)을 검증.

```typescript
import { expect, test } from '@playwright/test'

/**
 * E2E 테스트 예시 — Phase 1~4 통합 흐름.
 *
 * MSW가 활성화된 dev 서버에서 /users 진입 시:
 *   1. MSW worker 등록
 *   2. /api/proxy/users 호출이 mock 핸들러로 가로채짐
 *   3. mock 응답이 컴포넌트에 렌더됨
 */
test.describe('/users 페이지 — MSW mock 흐름', () => {
  test('mock 사용자 목록이 렌더된다', async ({ page }) => {
    await page.goto('/users')

    await expect(
      page.getByRole('heading', { name: '사용자 목록' })
    ).toBeVisible()

    // mock 데이터는 faker로 생성되므로 *값*이 아닌 *구조*를 검증
    // 사용자 카드가 여러 개이므로 strict mode 위반 방지를 위해 .first()
    await expect(page.getByText(/ID:/).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('네트워크 요청이 /api/proxy/users로 나간다', async ({ page }) => {
    const apiRequest = page.waitForRequest(req =>
      req.url().includes('/api/proxy/users')
    )

    await page.goto('/users')
    const request = await apiRequest

    expect(request.method()).toBe('GET')
    expect(new URL(request.url()).pathname).toBe('/api/proxy/users')
  })
})
```

---

## 📦 보존 코드 4 — `.github/workflows/ci.yml` e2e job

브라우저 캐싱 + 리포트 아티팩트 보존(14일).

```yaml
e2e:
  name: E2E (Playwright)
  runs-on: ubuntu-latest
  needs: check
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: 'npm'
    - run: npm ci

    # Playwright 브라우저 캐싱 — 빌드 시간 단축
    - name: Get Playwright version
      id: playwright-version
      run: echo "version=$(node -p "require('@playwright/test/package.json').version")" >> $GITHUB_OUTPUT
    - name: Cache Playwright browsers
      id: playwright-cache
      uses: actions/cache@v4
      with:
        path: ~/.cache/ms-playwright
        key: playwright-${{ runner.os }}-${{ steps.playwright-version.outputs.version }}
    - name: Install Playwright browsers
      if: steps.playwright-cache.outputs.cache-hit != 'true'
      run: npx playwright install --with-deps chromium
    - name: Install Playwright system deps
      if: steps.playwright-cache.outputs.cache-hit == 'true'
      run: npx playwright install-deps chromium

    - run: npm run test:e2e

    - name: Upload Playwright report
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 14
```

> 도입 후 **Branch Protection**의 required status checks에 _E2E (Playwright)_ 를 추가하세요.

---

## 🚨 흔한 함정과 해결

### 1) `webServer` 시작 실패 (포트 3000 사용 중)

- 기존 dev 서버 종료 후 재실행
- CI에서는 `webServer.env`로 placeholder URL 자동 주입되어 통과

### 2) MSW worker가 E2E에서 가로채지 못함

- `NEXT_PUBLIC_API_MOCK_ENABLED=true` 확인
- `playwright.config.ts`의 `webServer.env`에 명시되어 있어야 함

### 3) `getByText` strict mode 위반 (다중 매치)

- mock 데이터가 여러 행이라 발생
- `.first()` / `.filter({...})` / 더 구체적 selector 사용

### 4) CI에서 브라우저 다운로드가 매번 발생

- 위 §보존 코드 4의 _Cache Playwright browsers_ 단계가 누락됨
- `actions/cache@v4`로 `~/.cache/ms-playwright` 캐싱 필수

### 5) `auth-protection.spec.ts` 실패 — `/dashboard` 매처 없음

- baseline의 `src/proxy.ts` `config.matcher`에 `/dashboard/:path*`가 등록되어 있어야 함
- 새 보호 라우트로 변경 시 spec의 경로도 갱신

---

## 📎 관련 문서

- 테스트 가이드 (단위/컴포넌트): [`../guides/testing.md`](../guides/testing.md)
- MSW 모킹: [`../guides/mocking-msw.md`](../guides/mocking-msw.md)
- 인증 패턴: [`../guides/auth-pattern.md`](../guides/auth-pattern.md)
- 외부 자료:
  - [Playwright](https://playwright.dev/)
  - [Playwright + GitHub Actions](https://playwright.dev/docs/ci-intro)
