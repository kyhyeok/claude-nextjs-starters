import { NextResponse, type NextRequest } from 'next/server'
import { serverEnv } from '@/lib/env/server'
import { BACKEND_AUTH_PATHS } from '@/lib/auth/config'
import { setAuthCookies } from '@/lib/auth/cookies'

/**
 * POST /api/auth/login
 *
 * 클라이언트가 이메일/비밀번호를 보내면, 백엔드 /auth/login에 전달하고
 * 응답으로 받은 access/refresh 토큰을 httpOnly 쿠키로 저장합니다.
 *
 * 백엔드 응답 계약(기본): { accessToken, refreshToken, expiresIn?, refreshExpiresIn? }
 * 다른 형태의 응답이라면 아래 매핑만 수정하면 됩니다.
 */
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  }

  const upstream = await fetch(
    `${serverEnv.BACKEND_API_BASE_URL}/${BACKEND_AUTH_PATHS.login}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )

  const data = (await upstream.json().catch(() => ({}))) as {
    accessToken?: string
    refreshToken?: string
    expiresIn?: number
    refreshExpiresIn?: number
    message?: string
  }

  if (!upstream.ok || !data.accessToken) {
    return NextResponse.json(
      { message: data.message ?? 'Login failed' },
      { status: upstream.status || 401 }
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
