/**
 * X-Request-ID 헤더 헬퍼.
 *
 * 사고 진단 시 *프론트 에러*와 *백엔드 로그/Sentry/Grafana*를 연결하는 키.
 * 프론트가 자동 생성/부착하면 백엔드는 같은 ID를 echo하기만 하면 됨.
 *
 * 흐름:
 *   apiClient → ky beforeRequest hook 이 자동 부착 → /api/proxy/* → 백엔드
 *   응답 헤더에 echo되어 클라이언트로 전파됨
 */

export const REQUEST_ID_HEADER = 'x-request-id'

/**
 * UUID v4를 사용한 요청 ID 생성. 모든 모던 환경에서 사용 가능.
 */
export function generateRequestId(): string {
  return crypto.randomUUID()
}

/**
 * 요청 헤더에서 X-Request-ID를 추출하거나 새로 생성.
 * 클라이언트가 이미 ID를 보냈다면 보존, 없으면 생성.
 */
export function getOrCreateRequestId(
  headers: Headers | Record<string, string | undefined>
): string {
  const existing =
    headers instanceof Headers
      ? headers.get(REQUEST_ID_HEADER)
      : (headers[REQUEST_ID_HEADER] ?? headers[REQUEST_ID_HEADER.toUpperCase()])
  return existing ?? generateRequestId()
}
