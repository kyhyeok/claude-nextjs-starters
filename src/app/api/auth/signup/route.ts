import { NextResponse, type NextRequest } from 'next/server'
import { serverEnv } from '@/lib/env/server'
import { BACKEND_AUTH_PATHS } from '@/lib/auth/config'
import { setAuthCookies } from '@/lib/auth/cookies'

/**
 * POST /api/auth/signup
 *
 * 회원가입 → 백엔드 /auth/signup에 위임 → 응답으로 받은 토큰을 httpOnly 쿠키로 저장.
 * (백엔드가 회원가입 성공 시 자동 로그인 토큰을 발급한다고 가정)
 *
 * 백엔드가 자동 로그인을 안 하고 별도 로그인이 필요하다면, 토큰 부분을 제거하고
 * { ok: true }만 반환한 뒤 클라이언트에서 useLogin을 호출하도록 변경하세요.
 *
 * 백엔드 응답 계약(기본):
 *   { accessToken, refreshToken, expiresIn?, refreshExpiresIn?, user? }
 * 또는 검증 실패 시:
 *   { message, code?, errors?: { [field]: string[] } }
 */
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  }

  const upstream = await fetch(
    `${serverEnv.BACKEND_API_BASE_URL}/${BACKEND_AUTH_PATHS.signup}`,
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
    code?: string
    errors?: Record<string, string[]>
  }

  if (!upstream.ok) {
    return NextResponse.json(
      {
        message: data.message ?? 'Signup failed',
        code: data.code,
        errors: data.errors,
      },
      { status: upstream.status || 400 }
    )
  }

  if (data.accessToken) {
    await setAuthCookies({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      accessTokenMaxAge: data.expiresIn,
      refreshTokenMaxAge: data.refreshExpiresIn,
    })
  }

  return NextResponse.json({ ok: true })
}
