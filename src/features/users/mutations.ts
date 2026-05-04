'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createUser, deleteUser } from '@/lib/api/generated/users/users'
import type { CreateUserInput, User } from '@/lib/api/generated/schemas'
import { userKeys } from './keys'

/**
 * users 도메인 Mutation 훅 모음.
 *
 * 패턴 규칙:
 * - 성공 시 관련 query를 invalidate (목록/상세) 또는 cache 직접 갱신
 * - 비관적 업데이트가 기본 (안정성↑). 낙관적 업데이트가 필요하면 onMutate/rollback 추가
 * - 응답에서 .data만 unwrap해 반환
 */

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation<User, unknown, CreateUserInput>({
    mutationFn: async input => {
      const res = await createUser(input)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, string>({
    mutationFn: async id => {
      await deleteUser(id)
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      queryClient.removeQueries({ queryKey: userKeys.detail(id) })
    },
  })
}
