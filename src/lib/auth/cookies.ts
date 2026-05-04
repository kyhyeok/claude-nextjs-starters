import 'server-only'

import { cookies } from 'next/headers'
import { serverEnv } from '@/lib/env/server'
import { AUTH_COOKIES, AUTH_COOKIE_MAX_AGE } from './config'

/**
 * 토큰 쿠키 입출력 헬퍼. 모두 서버 전용.
 *
 * - httpOnly: JS 접근 불가 (XSS 안전)
 * - sameSite=lax: CSRF 1차 방어 + OAuth 콜백 호환
 * - secure: 프로덕션에서만 (localhost http 개발용 false)
 * - path=/: 전체 사이트
 */

interface SetTokensInput {
  accessToken: string
  refreshToken?: string
  /** 백엔드가 만료(초)를 직접 내려주면 우선 사용 */
  accessTokenMaxAge?: number
  refreshTokenMaxAge?: number
}

const isProd = serverEnv.NODE_ENV === 'production'

export async function setAuthCookies(input: SetTokensInput): Promise<void> {
  const store = await cookies()

  store.set(AUTH_COOKIES.accessToken, input.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: input.accessTokenMaxAge ?? AUTH_COOKIE_MAX_AGE.accessToken,
  })

  if (input.refreshToken) {
    store.set(AUTH_COOKIES.refreshToken, input.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: input.refreshTokenMaxAge ?? AUTH_COOKIE_MAX_AGE.refreshToken,
    })
  }
}

export async function clearAuthCookies(): Promise<void> {
  const store = await cookies()
  store.delete(AUTH_COOKIES.accessToken)
  store.delete(AUTH_COOKIES.refreshToken)
}

export async function readAccessToken(): Promise<string | null> {
  const store = await cookies()
  return store.get(AUTH_COOKIES.accessToken)?.value ?? null
}

export async function readRefreshToken(): Promise<string | null> {
  const store = await cookies()
  return store.get(AUTH_COOKIES.refreshToken)?.value ?? null
}
