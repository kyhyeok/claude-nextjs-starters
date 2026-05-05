import type { ListProductsParams } from '@/lib/api/generated/schemas'

/**
 * Query Key Factory — 도메인별로 *항상* 이 형태를 따르세요.
 *
 * 계층 구조 (얕음 → 깊음):
 *   ['products']                         → 전체 도메인 (invalidate 시 도메인 전체 무효화)
 *   ['products', 'list']                 → 모든 list 변형
 *   ['products', 'list', { page, size }] → 특정 파라미터의 list
 *   ['products', 'detail']               → 모든 detail
 *   ['products', 'detail', id]           → 특정 id의 detail
 *
 * 사용 패턴:
 *   queryClient.invalidateQueries({ queryKey: productKeys.lists() })  // 모든 list 무효화
 *   queryClient.invalidateQueries({ queryKey: productKeys.all })      // 도메인 전체 무효화
 *
 * 참고: https://tkdodo.eu/blog/effective-react-query-keys
 */
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params: ListProductsParams) =>
    [...productKeys.lists(), params] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
} as const
