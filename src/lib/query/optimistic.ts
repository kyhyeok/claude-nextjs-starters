import type { QueryClient, QueryKey } from '@tanstack/react-query'

/**
 * TanStack Query 낙관적 업데이트 표준 흐름을 한 호출로 캡슐화.
 *
 * 표준 4단계 중 *cancel → snapshot → setQueryData* 3단계를 자동화하고,
 * *rollback* 클로저를 반환합니다. `invalidateQueries`는 도메인이 `onSettled`에서 명시적으로 호출하세요.
 *
 * 사용 예:
 *
 *   const mutation = useMutation({
 *     mutationFn: toggleLike,
 *     onMutate: async (input) => {
 *       return await applyOptimisticUpdate<Post>(qc, postKeys.detail(input.id), (old) =>
 *         old ? { ...old, liked: !old.liked, likeCount: old.likeCount + (old.liked ? -1 : 1) } : old
 *       )
 *     },
 *     onError: (_err, _input, ctx) => ctx?.rollback(),
 *     onSettled: (_data, _err, input) => qc.invalidateQueries({ queryKey: postKeys.detail(input.id) }),
 *   })
 *
 * 다중 쿼리에 영향을 주는 경우 (예: 목록 + 상세 동시 갱신) 헬퍼를 *여러 번 호출*하고
 * 반환된 rollback들을 모두 실행하세요. 자세히는 docs/guides/optimistic-update-pattern.md.
 */
export async function applyOptimisticUpdate<TData>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  updater: (old: TData | undefined) => TData
): Promise<{ rollback: () => void }> {
  // 진행 중인 refetch가 낙관적 업데이트를 덮어쓰지 못하도록 취소
  await queryClient.cancelQueries({ queryKey })

  const previous = queryClient.getQueryData<TData>(queryKey)
  queryClient.setQueryData<TData>(queryKey, old => updater(old))

  return {
    rollback: () => {
      queryClient.setQueryData<TData>(queryKey, previous)
    },
  }
}
