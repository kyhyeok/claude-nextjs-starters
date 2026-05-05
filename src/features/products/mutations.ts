'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createProduct,
  deleteProduct,
} from '@/lib/api/generated/products/products'
import type { CreateProductInput, Product } from '@/lib/api/generated/schemas'
import { productKeys } from './keys'

/**
 * products 도메인 Mutation 훅 모음.
 *
 * 패턴 규칙:
 * - 성공 시 관련 query를 invalidate (목록/상세) 또는 cache 직접 갱신
 * - 비관적 업데이트가 기본 (안정성↑). 낙관적 업데이트가 필요하면 onMutate/rollback 추가
 * - 응답에서 .data만 unwrap해 반환
 */

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation<Product, unknown, CreateProductInput>({
    mutationFn: async input => {
      const res = await createProduct(input)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, string>({
    mutationFn: async id => {
      await deleteProduct(id)
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() })
      queryClient.removeQueries({ queryKey: productKeys.detail(id) })
    },
  })
}
