import { z } from 'zod'

/**
 * 환경 변수 스키마.
 *
 * 명명 규칙:
 * - NEXT_PUBLIC_*  → 클라이언트 번들에 포함됨. 비밀이 아닌 값만.
 * - 그 외          → 서버 전용. 클라이언트에서 절대 노출되지 않음.
 *
 * 외부 백엔드 URL은 서버 전용(BACKEND_API_BASE_URL)이며, 브라우저는
 * 항상 same-origin Route Handler(/api/proxy/*)를 거쳐 호출합니다.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  VERCEL_URL: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // 외부 백엔드 (Java/Kotlin/Nest) 절대 URL — 서버 전용
  BACKEND_API_BASE_URL: z.string().url(),

  // MSW 활성화 — 백엔드 미완성 상태에서 프론트 선행 개발 시 'true'
  NEXT_PUBLIC_API_MOCK_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform(v => v === 'true'),
})

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_URL: process.env.VERCEL_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  BACKEND_API_BASE_URL: process.env.BACKEND_API_BASE_URL,
  NEXT_PUBLIC_API_MOCK_ENABLED: process.env.NEXT_PUBLIC_API_MOCK_ENABLED,
})

export type Env = z.infer<typeof envSchema>
