'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { isApiError } from '@/lib/api/errors'
import { BACKEND_AUTH_PATHS } from './config'
import type { SessionUser } from './session'

/**
 * 클라이언트 컴포넌트용 인증 훅 모음.
 *
 * - useSession()        : 현재 로그인 사용자(쿼리). 401 시 null
 * - useLogin()          : 이메일/비밀번호 로그인 (mutation)
 * - useLogout()         : 로그아웃 (mutation, 캐시 클리어)
 *
 * 모든 호출은 same-origin /api/auth/* Route Handler를 거칩니다.
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

interface LoginInput {
  email: string
  password: string
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        credentials: 'include',
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string
        }
        throw new Error(body.message ?? 'Login failed')
      }
      return res.json() as Promise<{ ok: true }>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    },
    onSuccess: () => {
      queryClient.setQueryData(SESSION_QUERY_KEY, null)
      queryClient.clear()
    },
  })
}
