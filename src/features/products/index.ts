/**
 * products feature의 단일 진입점.
 *
 * 컴포넌트는 항상 이 모듈에서 import 하세요:
 *   import { useProductsQuery, useCreateProduct, productKeys } from '@/features/products'
 *
 * generated/* 코드를 직접 import 금지 — 모든 호출은 이 feature 레이어를 거쳐야
 * query key 일관성과 캐시 무효화 정책이 유지됩니다.
 */

export { productKeys } from './keys'
export { useProductsQuery, useProductQuery } from './queries'
export { useCreateProduct, useDeleteProduct } from './mutations'

export type {
  Product,
  ProductPage,
  CreateProductInput,
  ListProductsParams,
} from '@/lib/api/generated/schemas'
