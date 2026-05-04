import type { ListUsersParams } from '@/lib/api/generated/schemas'

/**
 * Query Key Factory — 도메인별로 *항상* 이 형태를 따르세요.
 *
 * 계층 구조 (얕음 → 깊음):
 *   ['users']                         → 전체 도메인 (invalidate 시 도메인 전체 무효화)
 *   ['users', 'list']                 → 모든 list 변형
 *   ['users', 'list', { page, size }] → 특정 파라미터의 list
 *   ['users', 'detail']               → 모든 detail
 *   ['users', 'detail', id]           → 특정 id의 detail
 *
 * 사용 패턴:
 *   queryClient.invalidateQueries({ queryKey: userKeys.lists() })  // 모든 list 무효화
 *   queryClient.invalidateQueries({ queryKey: userKeys.all })      // 도메인 전체 무효화
 *
 * 참고: https://tkdodo.eu/blog/effective-react-query-keys
 */
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: ListUsersParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
} as const
