'use client'

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { getUser, listUsers } from '@/lib/api/generated/users/users'
import type {
  ListUsersParams,
  User,
  UserPage,
} from '@/lib/api/generated/schemas'
import { userKeys } from './keys'

/**
 * users 도메인 Query 훅 모음.
 *
 * 패턴 규칙:
 * - generated 함수(`listUsers`, `getUser`)는 직접 호출하지 않고 반드시 이 훅들을 통해 사용
 * - 응답에서 .data만 unwrap해 컴포넌트에 전달 (status/headers는 필요 시 별도 훅으로)
 * - queryKey는 항상 `userKeys.*` 팩토리에서 생성
 * - 4xx/5xx는 ApiError로 throw됨 → ErrorBoundary 또는 useQuery의 error로 처리
 * - 새 endpoint 추가 시 이 파일에 훅을 추가하세요 (generated 함수만 사용 금지)
 */

type ListQueryOptions = Omit<UseQueryOptions<UserPage>, 'queryKey' | 'queryFn'>

export function useUsersQuery(
  params: ListUsersParams = {},
  options?: ListQueryOptions
) {
  return useQuery<UserPage>({
    queryKey: userKeys.list(params),
    queryFn: async ({ signal }) => {
      const res = await listUsers(params, { signal })
      return res.data
    },
    ...options,
  })
}

type DetailQueryOptions = Omit<
  UseQueryOptions<User>,
  'queryKey' | 'queryFn' | 'enabled'
> & { enabled?: boolean }

export function useUserQuery(id: string, options?: DetailQueryOptions) {
  return useQuery<User>({
    queryKey: userKeys.detail(id),
    queryFn: async ({ signal }) => {
      const res = await getUser(id, { signal })
      // 4xx는 ky가 ApiError throw → 도달하지 않음
      return res.data as User
    },
    enabled: Boolean(id) && (options?.enabled ?? true),
    ...options,
  })
}
