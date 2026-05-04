import { NextResponse, type NextRequest } from 'next/server'
import { AUTH_COOKIES, AUTH_ROUTES } from '@/lib/auth/config'

/**
 * 보호 라우트 프록시 (Next.js 16+ 신규 컨벤션, 구 middleware).
 *
 * - access_token 쿠키 부재 시 /login으로 리디렉션 (returnTo 쿼리로 원본 경로 보존)
 * - 이미 로그인한 사용자가 /login 진입 시 홈으로 리디렉션
 *
 * 사용법: 아래 config.matcher에 보호하고 싶은 경로 패턴을 추가하세요.
 * 인증이 필요 없는 경로는 매처에서 제외됩니다.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const hasAccessToken = request.cookies.has(AUTH_COOKIES.accessToken)

  // 로그인 페이지: 인증된 사용자는 홈으로
  if (pathname === AUTH_ROUTES.login) {
    if (hasAccessToken) {
      return NextResponse.redirect(
        new URL(AUTH_ROUTES.defaultRedirect, request.url)
      )
    }
    return NextResponse.next()
  }

  // 보호 라우트: 토큰 부재 시 로그인으로
  if (!hasAccessToken) {
    const loginUrl = new URL(AUTH_ROUTES.login, request.url)
    loginUrl.searchParams.set('returnTo', `${pathname}${search}`)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  /**
   * 보호하고 싶은 라우트만 명시적으로 추가하세요.
   * 기본값은 예시로 /dashboard/* 만 보호합니다. 새 보호 라우트가 생기면 여기에 추가:
   *   matcher: ['/dashboard/:path*', '/admin/:path*', '/login']
   *
   * /login은 "이미 로그인한 사용자 → 홈 리디렉션" 분기를 위해 포함됩니다.
   */
  matcher: ['/dashboard/:path*', '/login'],
}
