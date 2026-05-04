import type { NextConfig } from 'next'

/**
 * 환경별 CSP(Content Security Policy) 정책.
 *
 * - dev: Next dev/HMR이 'unsafe-eval' + 'unsafe-inline' 필요 (turbopack/dev tools)
 * - prod: 'unsafe-eval' 제거 → XSS 방어 강화
 *
 * 외부 도메인 추가 시(Sentry/분석/CDN 등) 이 함수 *한 곳*만 수정하세요.
 * 자세한 절차는 docs/guides/security-headers.md 참조.
 */
function buildContentSecurityPolicy(): string {
  const isProd = process.env.NODE_ENV === 'production'

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Next.js 인라인 부트스트랩 스크립트 (nonce 마이그레이션 가능)
      ...(isProd ? [] : ["'unsafe-eval'"]), // dev HMR용
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Tailwind/shadcn의 inline style attribute
    ],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': [
      "'self'",
      // Next dev WebSocket (HMR)
      ...(isProd ? [] : ['ws:', 'wss:']),
      // Sentry/분석 도구 도입 시 여기에 도메인 추가:
      // 'https://*.sentry.io',
    ],
    'frame-ancestors': ["'none'"], // clickjacking 방지
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"],
  }

  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ')
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Clickjacking 방지 — frame-ancestors와 중복이지만 구형 브라우저 호환
          { key: 'X-Frame-Options', value: 'DENY' },

          // MIME 스니핑 방지
          { key: 'X-Content-Type-Options', value: 'nosniff' },

          // Referrer 제어 — 외부 사이트로 이동 시 origin만 노출
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },

          // 구형 브라우저용 (현대 브라우저는 무시) — CSP가 더 강력
          { key: 'X-XSS-Protection', value: '1; mode=block' },

          // HTTPS 강제 (HSTS) — preload 등록 시 1년 권장
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },

          // 위험한 브라우저 API 기본 차단 — 필요 시 도메인 결정 후 허용
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },

          // DNS prefetch 활성화 — 페이지 로드 시간 단축
          { key: 'X-DNS-Prefetch-Control', value: 'on' },

          // CSP — XSS 2차 방어. 외부 도메인 추가 시 buildContentSecurityPolicy() 수정
          {
            key: 'Content-Security-Policy',
            value: buildContentSecurityPolicy(),
          },
        ],
      },
    ]
  },
}

export default nextConfig
