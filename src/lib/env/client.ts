import { z } from 'zod'

/**
 * 클라이언트(브라우저)에 노출되는 환경변수.
 *
 * Next.js 규칙:
 * - NEXT_PUBLIC_* 접두사가 붙은 변수만 클라이언트 번들에 inline됩니다.
 * - 다른 변수는 클라이언트에서 undefined이므로 절대 추가하지 마세요.
 * - 비밀 정보는 절대 NEXT_PUBLIC_*에 두지 마세요.
 *
 * 이 모듈은 server/client 양쪽에서 import 가능합니다.
 */
const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_API_MOCK_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform(v => v === 'true'),
})

// process.env.NEXT_PUBLIC_*는 Next.js가 빌드 시 정적으로 inline하므로
// 명시적으로 한 번씩 적어주어야 클라이언트 번들에 포함됩니다.
export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_API_MOCK_ENABLED: process.env.NEXT_PUBLIC_API_MOCK_ENABLED,
})

export type ClientEnv = z.infer<typeof clientSchema>
