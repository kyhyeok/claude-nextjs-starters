'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { ApiError, isApiError } from '@/lib/api/errors'
import { BACKEND_AUTH_PATHS } from './config'
import type { SessionUser } from './session'

/**
 * 클라이언트 컴포넌트용 인증 훅 모음.
 *
 * - useSession() : 현재 로그인 사용자(쿼리). 401 시 null
 * - useLogin()   : 이메일/비밀번호 로그인 (mutation)
 * - useSignup()  : 회원가입 (mutation, 백엔드가 자동 로그인 토큰 발급한다고 가정)
 * - useLogout()  : 로그아웃 (mutation, 캐시 클리어)
 *
 * 모든 호출은 same-origin /api/auth/* Route Handler를 거칩니다.
 * 실패 시 ApiError를 throw하여 applyApiErrorToForm 헬퍼와 호환됩니다.
 */

const SESSION_QUERY_KEY = ['auth', 'session'] as const

export function useSession() {
  return useQuery<SessionUser | null>({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      try {
        return await apiClient.get(BACKEND_AUTH_PATHS.me).json<SessionUser>()
      } catch (error) {
        if (isApiError(error) && error.isUnauthorized) return null
        throw error
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * 내부 헬퍼 — /api/auth/* 응답을 ApiError로 정규화.
 * applyApiErrorToForm이 details.errors를 RHF 필드 에러로 매핑할 수 있게 함.
 */
async function postAuth(path: string, body?: unknown): Promise<{ ok: true }> {
  const res = await fetch(path, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })
  const data = (await res.json().catch(() => ({}))) as {
    message?: string
    code?: string
    errors?: Record<string, string[]>
    ok?: true
  }
  if (!res.ok) {
    throw new ApiError({
      message: data.message ?? 'Request failed',
      status: res.status,
      code: data.code,
      details: { errors: data.errors },
    })
  }
  return { ok: true }
}

export interface LoginInput {
  email: string
  password: string
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation<{ ok: true }, ApiError, LoginInput>({
    mutationFn: input => postAuth('/api/auth/login', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
    },
  })
}

export interface SignupInput {
  email: string
  password: string
  name: string
}

export function useSignup() {
  const queryClient = useQueryClient()

  return useMutation<{ ok: true }, ApiError, SignupInput>({
    mutationFn: input => postAuth('/api/auth/signup', input),
    onSuccess: () => {
      // 백엔드가 자동 로그인 토큰을 내려준 경우 세션 갱신 트리거
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation<{ ok: true }, ApiError>({
    mutationFn: () => postAuth('/api/auth/logout'),
    onSuccess: () => {
      queryClient.setQueryData(SESSION_QUERY_KEY, null)
      queryClient.clear()
    },
  })
}
