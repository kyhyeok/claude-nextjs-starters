'use client'

import { useEffect, useState } from 'react'
import { isMockEnabled } from '@/mocks/init'

interface MockProviderProps {
  children: React.ReactNode
}

/**
 * MSW worker가 준비된 후에만 children을 렌더하는 게이트.
 *
 * - mock 비활성화 상태: 즉시 children 렌더 (성능 영향 0)
 * - mock 활성화 + dev: worker 등록 후 children 렌더 (race condition 방지)
 * - prod: 본 컴포넌트 자체는 렌더되지만 init 모듈이 dynamic import이므로
 *   mock 코드는 번들에 포함되지 않음
 */
export function MockProvider({ children }: MockProviderProps) {
  const [ready, setReady] = useState(() => !isMockEnabled())

  useEffect(() => {
    if (ready) return
    let cancelled = false
    void (async () => {
      const { startMSW } = await import('@/mocks/init')
      await startMSW()
      if (!cancelled) setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [ready])

  if (!ready) return null
  return <>{children}</>
}
