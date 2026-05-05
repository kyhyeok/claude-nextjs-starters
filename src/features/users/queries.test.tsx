import { describe, expect, it } from 'vitest'
import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useUsersQuery } from './queries'

/**
 * Query 훅 + MSW 통합 테스트 예시.
 *
 * 패턴 규칙:
 * - QueryClientProvider 래퍼 필수 (테스트마다 신선한 client — 캐시 격리)
 * - retry: false (실패 시 재시도 대기로 테스트가 느려지는 것 방지)
 * - MSW 핸들러는 src/test/setup.ts가 글로벌 listen 중 → 별도 셋업 불필요
 * - 검증은 *응답 형태*(unwrap 여부, 타입) 우선 (생성된 faker 값에 의존하지 않음)
 */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe('useUsersQuery', () => {
  it('MSW 핸들러를 통해 페이지 응답을 unwrap해 반환한다', async () => {
    const { result } = renderHook(() => useUsersQuery({ page: 1, size: 20 }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeDefined()
    expect(Array.isArray(result.current.data?.items)).toBe(true)
    expect(typeof result.current.data?.page).toBe('number')
    expect(typeof result.current.data?.total).toBe('number')
  })
})
