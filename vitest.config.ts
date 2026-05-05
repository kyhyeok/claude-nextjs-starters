import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * Vitest 설정 — 단위/컴포넌트 테스트.
 *
 * - 환경: jsdom (브라우저 API 시뮬레이션)
 * - 셋업: src/test/setup.ts (jest-dom matchers + MSW node + 폴리필)
 * - 경로 별칭: Vite 7 native tsconfigPaths (tsconfig.json의 @/* 자동 인식)
 * - E2E(Playwright)는 별도 (tests/e2e/) — 이 설정에서 제외
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    // 상대 경로 fetch(`/api/proxy/*`)가 절대 URL로 resolve되도록 origin 고정.
    // 이게 없으면 jsdom의 fetch가 'Failed to parse URL'로 throw됩니다.
    environmentOptions: {
      jsdom: { url: 'http://localhost:3000' },
    },
    globals: true,
    css: false,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/.next/**',
      '**/tests/e2e/**',
      '**/dist/**',
      'src/lib/api/generated/**',
    ],
  },
})
