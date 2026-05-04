import { apiClient } from './client'

/**
 * orval `client: 'fetch'` 출력이 사용하는 커스텀 mutator.
 *
 * 모든 generated API 호출을 우리 ky 인스턴스로 라우팅합니다.
 * - 토큰/쿠키/401 리프레시/에러 정규화가 자동 적용됨
 * - 4xx/5xx 발생 시 ky가 ApiError를 throw → 호출자가 catch
 * - 성공 시 generated 함수의 응답 타입(`{ status, data, headers }`)으로 변환
 *
 * generated 코드는 다음과 같이 호출합니다:
 *   const result = await orvalFetch<listUsersResponse>(getListUsersUrl(params), {
 *     method: 'GET',
 *   })
 *   // result: { status: 200; data: UserPage; headers: Headers }
 */
export const orvalFetch = async <T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  // ky의 prefixUrl(/api/proxy/)과 결합 가능하도록 leading slash 제거
  const path = url.replace(/^\//, '')

  const response = await apiClient(path, {
    method: (options.method ?? 'GET') as
      | 'GET'
      | 'POST'
      | 'PUT'
      | 'PATCH'
      | 'DELETE'
      | 'HEAD',
    body: options.body ?? undefined,
    headers: options.headers as Record<string, string> | undefined,
    signal: options.signal ?? undefined,
  })

  const isEmpty =
    response.status === 204 || response.status === 205 || !response.body

  const data = isEmpty ? undefined : await response.json()

  return {
    status: response.status,
    data,
    headers: response.headers,
  } as T
}

export default orvalFetch
