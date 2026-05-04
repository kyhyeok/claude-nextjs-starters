'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { getQueryClient } from '@/lib/query/get-query-client'

interface QueryProviderProps {
  children: React.ReactNode
}

/**
 * TanStack Query 클라이언트를 트리에 주입하는 Provider.
 * 개발 환경에서만 Devtools가 함께 렌더됩니다.
 */
export function QueryProvider({ children }: QueryProviderProps) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' ? (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-left"
        />
      ) : null}
    </QueryClientProvider>
  )
}
