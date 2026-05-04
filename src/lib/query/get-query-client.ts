import {
  defaultShouldDehydrateQuery,
  isServer,
  QueryClient,
} from '@tanstack/react-query'

/**
 * Next.js App Router에서 권장하는 QueryClient 인스턴스 관리 패턴.
 *
 * - 서버: 매 요청마다 새 인스턴스 (요청 간 데이터 누수 방지)
 * - 클라이언트(브라우저): 싱글톤 재사용 (HMR 안전)
 *
 * 참고: https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr
 */

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 서버에서 prefetch한 데이터가 즉시 stale 상태가 되어 클라이언트에서 재요청되는 것을 방지
        staleTime: 60 * 1000,
        retry: (failureCount, error) => {
          // 4xx는 재시도하지 않음 (네트워크/5xx만 1회 재시도)
          const status = (error as { status?: number }).status
          if (status && status >= 400 && status < 500) return false
          return failureCount < 1
        },
      },
      dehydrate: {
        // pending 상태의 쿼리도 직렬화 — 스트리밍 SSR 시 유리
        shouldDehydrateQuery: query =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

export function getQueryClient(): QueryClient {
  if (isServer) {
    // 서버: 매 요청마다 새 인스턴스
    return makeQueryClient()
  }

  // 클라이언트: 싱글톤
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient()
  }
  return browserQueryClient
}
