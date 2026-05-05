import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { server } from '@/mocks/server'

/**
 * Vitest 글로벌 셋업.
 *
 * - jest-dom 매처(`toBeInTheDocument` 등) 활성화
 * - MSW node server 시작/리셋/종료
 * - jsdom 미구현 API 폴리필 (Radix UI 등이 의존)
 */

// Radix UI(Checkbox 등)가 ResizeObserver를 사용
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver =
  global.ResizeObserver ?? (MockResizeObserver as typeof ResizeObserver)

class MockIntersectionObserver {
  root = null
  rootMargin = ''
  thresholds = []
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
global.IntersectionObserver =
  global.IntersectionObserver ??
  (MockIntersectionObserver as unknown as typeof IntersectionObserver)

// matchMedia (next-themes 등)
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

// scrollIntoView (Radix Select 등이 사용)
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn()
}

// jsdom + undici(Node 18+ native fetch)는 상대 경로(`/api/proxy/...`)를
// location.origin으로 자동 prefix 하지 않음 — 브라우저 동작과 동일하게 보정.
// fetch + Request 둘 다 patch (ky 내부에서 Request 생성 시 throw 방지).
function _absolutize(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input === 'string' && input.startsWith('/')) {
    return window.location.origin + input
  }
  return input
}
const _originalFetch = globalThis.fetch
globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
  _originalFetch(_absolutize(input), init)) as typeof fetch
const _OriginalRequest = globalThis.Request
class _PatchedRequest extends _OriginalRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(_absolutize(input), init)
  }
}
globalThis.Request = _PatchedRequest as typeof Request

// MSW node server lifecycle
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
