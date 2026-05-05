'use client'

import { useCallback, useEffect, useRef, type RefCallback } from 'react'

/**
 * sentinel 엘리먼트가 뷰포트에 진입하면 자동으로 다음 페이지를 페치하는 ref callback.
 *
 * baseline 경계 정책 (PRD `🎨 baseline 경계 정책`):
 * - Layer 1 (behavior) — IntersectionObserver 트리거만 표준화. UI는 도메인이 자유.
 * - TanStack Query `useInfiniteQuery`와 _분리_ — 4개 입력만 받음.
 *
 * 사용 예:
 * ```tsx
 * const { hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteQuery(...);
 * const sentinelRef = useInfiniteScroll({
 *   hasNextPage: hasNextPage ?? false,
 *   isFetchingNextPage,
 *   fetchNextPage,
 * });
 * return <>{...} <div ref={sentinelRef} /></>;
 * ```
 */

export interface UseInfiniteScrollOptions {
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => unknown
  /** sentinel 진입 감지 여백 (기본 '200px') */
  rootMargin?: string
  /** 옵저버 활성화 여부 (기본 true) — 모달 등에서 일시 정지 시 사용 */
  enabled?: boolean
}

export function useInfiniteScroll(
  options: UseInfiniteScrollOptions
): RefCallback<HTMLElement> {
  const {
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    rootMargin = '200px',
    enabled = true,
  } = options

  const observerRef = useRef<IntersectionObserver | null>(null)

  const setSentinelRef = useCallback<RefCallback<HTMLElement>>(
    node => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }

      if (!node || !enabled || !hasNextPage || isFetchingNextPage) return
      if (typeof IntersectionObserver === 'undefined') return

      const observer = new IntersectionObserver(
        entries => {
          if (entries[0]?.isIntersecting) {
            fetchNextPage()
          }
        },
        { rootMargin }
      )
      observer.observe(node)
      observerRef.current = observer
    },
    [enabled, hasNextPage, isFetchingNextPage, fetchNextPage, rootMargin]
  )

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect()
      observerRef.current = null
    }
  }, [])

  return setSentinelRef
}
