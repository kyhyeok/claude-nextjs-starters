/**
 * users feature의 단일 진입점.
 *
 * 컴포넌트는 항상 이 모듈에서 import 하세요:
 *   import { useUsersQuery, useCreateUser, userKeys } from '@/features/users'
 *
 * generated/* 코드를 직접 import 금지 — 모든 호출은 이 feature 레이어를 거쳐야
 * query key 일관성과 캐시 무효화 정책이 유지됩니다.
 */

export { userKeys } from './keys'
export { useUsersQuery, useUserQuery } from './queries'
export { useCreateUser, useDeleteUser } from './mutations'

export type {
  User,
  UserPage,
  CreateUserInput,
  ListUsersParams,
} from '@/lib/api/generated/schemas'
