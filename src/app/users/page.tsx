'use client'

import { Container } from '@/components/layout/container'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useUsersQuery } from '@/features/users'
import { isApiError } from '@/lib/api/errors'

/**
 * 예시 페이지 — Phase 1~4 통합 흐름 검증.
 *
 * 데이터 흐름:
 *   useUsersQuery → ky(apiClient) → /api/proxy/users
 *                                    └─ MSW 활성화 시 mock 응답 가로챔 (dev only)
 *                                    └─ 비활성화 시 BACKEND_API_BASE_URL로 포워딩
 *
 * 4xx/5xx → ApiError throw → useQuery의 error로 노출
 *
 * 새 도메인을 만들 때도 같은 패턴을 그대로 사용하세요:
 *   features/&lt;도메인&gt;/queries.ts에 훅 정의 → 페이지에서 import
 */
export default function UsersPage() {
  const { data, isLoading, error } = useUsersQuery({ page: 1, size: 10 })

  return (
    <Container size="md" className="py-12">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">사용자 목록</h1>
        <p className="text-muted-foreground text-sm">
          Phase 1~4 통합 흐름 데모. 개발 중 MSW가 활성화되면 mock 데이터가
          노출됩니다 (
          <code className="bg-muted rounded px-1">
            NEXT_PUBLIC_API_MOCK_ENABLED=true
          </code>
          ).
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardHeader>
            <CardTitle>요청 실패</CardTitle>
            <CardDescription>
              {isApiError(error)
                ? `HTTP ${error.status} — ${error.message}`
                : (error as Error).message}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3">
          {data?.items.map(user => (
            <Card key={user.id}>
              <CardHeader>
                <CardTitle className="text-base">{user.name}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-xs">
                  ID: {user.id} · 가입: {user.createdAt}
                </p>
              </CardContent>
            </Card>
          ))}
          {data?.items.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>비어 있음</CardTitle>
                <CardDescription>등록된 사용자가 없습니다.</CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      )}
    </Container>
  )
}
