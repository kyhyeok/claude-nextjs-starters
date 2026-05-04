import 'server-only'

import { type KyInstance } from 'ky'
import { serverEnv } from '@/lib/env/server'
import { _createKyClientForServer, type TokenProvider } from './client'

/**
 * 서버 컴포넌트/Route Handler 전용 ky 인스턴스 팩토리.
 *
 * BACKEND_API_BASE_URL을 직접 호출하며, cookies() API로 읽은 토큰을
 * Authorization 헤더로 부착합니다. 'server-only' 모듈이므로 클라이언트에서
 * import하면 빌드가 실패합니다.
 *
 * 사용 예:
 *   import { cookies } from 'next/headers'
 *   import { AUTH_COOKIES } from '@/lib/auth/config'
 *   import { createServerApiClient } from '@/lib/api/server-client'
 *
 *   const token = (await cookies()).get(AUTH_COOKIES.accessToken)?.value
 *   const client = createServerApiClient(() => token ?? null)
 *   const me = await client.get('users/me').json<User>()
 */
export function createServerApiClient(
  tokenProvider: TokenProvider
): KyInstance {
  return _createKyClientForServer({
    baseUrl: serverEnv.BACKEND_API_BASE_URL,
    tokenProvider,
  })
}
