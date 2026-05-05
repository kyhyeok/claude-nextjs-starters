'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

/**
 * 리스트 페이지의 검색·필터·페이지·정렬 상태를 URL과 양방향으로 동기화하는 표준 훅.
 *
 * baseline 경계 정책 (PRD `🎨 baseline 경계 정책`):
 * - Layer 1 (behavior) — UI 컴포넌트는 도메인이 자유롭게 결정
 * - TanStack Query와 _분리_ — 이 훅은 URL 상태만, 페칭은 도메인의 features 훅
 *
 * 표준 키 5종은 baseline에서 인식하고, 그 외 모든 search params는 `filters`로 노출됩니다.
 */

export type SortOrder = 'asc' | 'desc'

export interface ListQueryParams {
  q: string
  page: number
  size: number
  sort: string
  order: SortOrder
}

const STANDARD_KEYS = ['q', 'page', 'size', 'sort', 'order'] as const
const STANDARD_KEY_SET = new Set<string>(STANDARD_KEYS)

const DEFAULTS: ListQueryParams = {
  q: '',
  page: 1,
  size: 20,
  sort: '',
  order: 'asc',
}

export interface UseListQueryParamsOptions {
  /** 표준 키의 기본값 일부 또는 전체를 덮어씀 (예: `{ size: 50 }`) */
  defaults?: Partial<ListQueryParams>
}

export interface UseListQueryParamsResult {
  /** URL에서 읽은 현재 표준 파라미터 (defaults 적용됨) */
  params: ListQueryParams
  /** 표준 키를 제외한 모든 search params (도메인 자유 필터) */
  filters: Record<string, string>
  /**
   * 표준 파라미터 / 자유 필터를 부분 갱신.
   * - 값이 `null`/`''`이거나 default와 같으면 URL에서 제거
   * - 기본 동작은 `router.push` (히스토리에 남음). 즉시 입력 반영은 `{ replace: true }` 사용
   */
  setParams: (
    next: Partial<ListQueryParams> & {
      filters?: Record<string, string | null>
    },
    options?: { replace?: boolean }
  ) => void
  /** 모든 표준 파라미터·필터 초기화 (URL을 pathname만으로) */
  reset: () => void
}

export function useListQueryParams(
  options: UseListQueryParamsOptions = {}
): UseListQueryParamsResult {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const {
    q: defQ,
    page: defPage,
    size: defSize,
    sort: defSort,
    order: defOrder,
  } = { ...DEFAULTS, ...options.defaults }

  const params: ListQueryParams = {
    q: searchParams.get('q') ?? defQ,
    page: Number(searchParams.get('page')) || defPage,
    size: Number(searchParams.get('size')) || defSize,
    sort: searchParams.get('sort') ?? defSort,
    order: searchParams.get('order') === 'desc' ? 'desc' : defOrder,
  }

  const filters: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    if (!STANDARD_KEY_SET.has(key)) filters[key] = value
  })

  const setParams = useCallback<UseListQueryParamsResult['setParams']>(
    (next, callOptions = {}) => {
      const sp = new URLSearchParams(searchParams.toString())

      const defaultMap: Record<
        (typeof STANDARD_KEYS)[number],
        string | number
      > = {
        q: defQ,
        page: defPage,
        size: defSize,
        sort: defSort,
        order: defOrder,
      }

      for (const key of STANDARD_KEYS) {
        if (!(key in next)) continue
        const value = next[key]
        if (
          value === undefined ||
          value === null ||
          value === '' ||
          value === defaultMap[key]
        ) {
          sp.delete(key)
        } else {
          sp.set(key, String(value))
        }
      }

      if (next.filters) {
        for (const [key, value] of Object.entries(next.filters)) {
          if (value === null || value === '') sp.delete(key)
          else sp.set(key, value)
        }
      }

      const qs = sp.toString()
      const url = qs ? `${pathname}?${qs}` : pathname

      if (callOptions.replace) router.replace(url, { scroll: false })
      else router.push(url, { scroll: false })
    },
    [router, pathname, searchParams, defQ, defPage, defSize, defSort, defOrder]
  )

  const reset = useCallback(() => {
    router.replace(pathname, { scroll: false })
  }, [router, pathname])

  return { params, filters, setParams, reset }
}
