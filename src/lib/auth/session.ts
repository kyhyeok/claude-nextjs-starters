import 'server-only'

import { readAccessToken } from './cookies'
import { createServerApiClient } from '@/lib/api/server-client'
import { BACKEND_AUTH_PATHS } from './config'
import { isApiError } from '@/lib/api/errors'

/**
 * 서버 컴포넌트/Route Handler에서 현재 세션을 조회.
 * 토큰이 없거나 백엔드 검증에 실패하면 null.
 *
 * 사용 예:
 *   // app/dashboard/page.tsx
 *   const session = await getSession()
 *   if (!session) redirect('/login')
 */
export interface SessionUser {
  id: string
  email?: string
  name?: string
  [key: string]: unknown
}

export async function getSession(): Promise<SessionUser | null> {
  const token = await readAccessToken()
  if (!token) return null

  const client = createServerApiClient(() => token)

  try {
    return await client.get(BACKEND_AUTH_PATHS.me).json<SessionUser>()
  } catch (error) {
    if (isApiError(error) && error.isUnauthorized) return null
    throw error
  }
}
