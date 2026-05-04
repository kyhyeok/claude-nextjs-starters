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
