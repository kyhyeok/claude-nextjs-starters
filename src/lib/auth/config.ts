/**
 * 인증 관련 상수. 백엔드 계약에 맞춰 수정해 사용하세요.
 *
 * 이 파일은 *서버/클라이언트 양쪽*에서 import 가능해야 하므로
 * 비밀 값(시크릿 등)을 두지 않습니다.
 */

/**
 * 외부 백엔드의 인증 엔드포인트 (BACKEND_API_BASE_URL 기준 상대 경로).
 * Spring Security/Nest 표준에 가까운 기본값을 둡니다.
 */
export const BACKEND_AUTH_PATHS = {
  login: 'auth/login',
  logout: 'auth/logout',
  refresh: 'auth/refresh',
  me: 'auth/me',
} as const

/**
 * 토큰 쿠키 이름. 변경 시 middleware.ts와 함께 일관되게 수정.
 */
export const AUTH_COOKIES = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
} as const

/**
 * 쿠키 만료(초). 백엔드가 만료를 직접 응답으로 내려주는 경우 그 값을 우선합니다.
 */
export const AUTH_COOKIE_MAX_AGE = {
  accessToken: 60 * 15, // 15분
  refreshToken: 60 * 60 * 24 * 14, // 14일
} as const

/**
 * 보호 라우트 / 인증 라우트 정의. middleware.ts에서 참조됩니다.
 */
export const AUTH_ROUTES = {
  login: '/login',
  // 로그인 후 기본 리디렉션 위치
  defaultRedirect: '/',
} as const
