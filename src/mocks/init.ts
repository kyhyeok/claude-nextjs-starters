/**
 * MSW 시작 진입점. 다음 모든 조건을 만족할 때만 worker가 시작됩니다:
 *
 * - 브라우저 환경 (typeof window !== 'undefined')
 * - 개발 환경 (process.env.NODE_ENV === 'development')
 * - 명시적 활성화 (NEXT_PUBLIC_API_MOCK_ENABLED === 'true')
 *
 * dynamic import 사용으로 prod 번들에 mock/handlers/faker가 포함되지 않습니다.
 */

let started = false

export async function startMSW(): Promise<void> {
  if (started) return
  if (typeof window === 'undefined') return
  if (process.env.NODE_ENV !== 'development') return
  if (process.env.NEXT_PUBLIC_API_MOCK_ENABLED !== 'true') return

  const { worker } = await import('./browser')
  await worker.start({
    // /api/proxy/* 외 요청은 그대로 통과 (Next.js 자체 트래픽 등)
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  })
  started = true
}

/** 페이지에서 MSW가 켜져 있는지 알고 싶을 때 사용 */
export function isMockEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_API_MOCK_ENABLED === 'true'
  )
}
