import { NextResponse } from 'next/server'
import { serverEnv } from '@/lib/env/server'
import { BACKEND_AUTH_PATHS } from '@/lib/auth/config'
import {
  clearAuthCookies,
  readAccessToken,
  readRefreshToken,
} from '@/lib/auth/cookies'

/**
 * POST /api/auth/logout
 *
 * 1. 백엔드 /auth/logout 호출 (실패해도 무시 — 클라 쿠키는 반드시 삭제)
 * 2. httpOnly 토큰 쿠키 클리어
 */
export async function POST() {
  const accessToken = await readAccessToken()
  const refreshToken = await readRefreshToken()

  if (accessToken || refreshToken) {
    try {
      await fetch(
        `${serverEnv.BACKEND_API_BASE_URL}/${BACKEND_AUTH_PATHS.logout}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
          },
          body: JSON.stringify({ refreshToken }),
        }
      )
    } catch {
      // 백엔드 로그아웃 실패는 무시 — 클라이언트 쿠키 정리가 우선
    }
  }

  await clearAuthCookies()

  return NextResponse.json({ ok: true })
}
