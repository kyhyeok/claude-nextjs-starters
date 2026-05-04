import 'server-only'

import { z } from 'zod'

/**
 * 서버 전용 환경변수.
 *
 * 이 모듈은 'server-only' import로 클라이언트 번들에 포함되지 않도록 강제됩니다.
 * 클라이언트에서 import하면 빌드가 실패합니다 — 이는 의도된 동작입니다.
 *
 * - BACKEND_API_BASE_URL: 외부 백엔드 절대 URL. NEXT_PUBLIC_*이 아니므로 클라 번들에 노출되지 않음.
 *   클라이언트는 항상 /api/proxy/*를 거쳐 이 URL로 포워딩됩니다.
 */
const serverSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  VERCEL_URL: z.string().optional(),
  BACKEND_API_BASE_URL: z.string().url(),
})

export const serverEnv = serverSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_URL: process.env.VERCEL_URL,
  BACKEND_API_BASE_URL: process.env.BACKEND_API_BASE_URL,
})

export type ServerEnv = z.infer<typeof serverSchema>
