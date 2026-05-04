import { NextResponse } from 'next/server'
import { serverEnv } from '@/lib/env/server'
import { BACKEND_AUTH_PATHS } from '@/lib/auth/config'
import {
  clearAuthCookies,
  readRefreshToken,
  setAuthCookies,
} from '@/lib/auth/cookies'

/**
 * POST /api/auth/refresh
 *
 * httpOnly refresh_token 쿠키를 읽어 백엔드 /auth/refresh에 전달하고,
 * 응답으로 받은 새 토큰을 다시 쿠키에 저장합니다.
 *
 * 클라이언트 ky 인스턴스의 401 인터셉터가 자동 호출하며,
 * 실패 시(예: 리프레시 토큰 만료) 쿠키를 정리하고 401을 반환 → 호출자가 /login 리디렉션
 */
export async function POST() {
  const refreshToken = await readRefreshToken()

  if (!refreshToken) {
    return NextResponse.json({ message: 'No refresh token' }, { status: 401 })
  }

  let upstream: Response
  try {
    upstream = await fetch(
      `${serverEnv.BACKEND_API_BASE_URL}/${BACKEND_AUTH_PATHS.refresh}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }
    )
  } catch {
    return NextResponse.json(
      { message: 'Refresh request failed' },
      { status: 502 }
    )
  }

  const data = (await upstream.json().catch(() => ({}))) as {
    accessToken?: string
    refreshToken?: string
    expiresIn?: number
    refreshExpiresIn?: number
    message?: string
  }

  if (!upstream.ok || !data.accessToken) {
    await clearAuthCookies()
    return NextResponse.json(
      { message: data.message ?? 'Refresh failed' },
      { status: 401 }
    )
  }

  await setAuthCookies({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    accessTokenMaxAge: data.expiresIn,
    refreshTokenMaxAge: data.refreshExpiresIn,
  })

  return NextResponse.json({ ok: true })
}
