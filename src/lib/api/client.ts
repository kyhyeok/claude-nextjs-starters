import ky, { type KyInstance, type Options } from 'ky'
import { ApiError } from './errors'
import { generateRequestId, REQUEST_ID_HEADER } from './request-id'

/**
 * 외부 백엔드(Java/Kotlin/Nest)와 통신하는 단일 HTTP 클라이언트.
 *
 * 설계 원칙:
 * - 모든 fetch는 이 인스턴스를 거친다 (직접 fetch 금지)
 * - 토큰 부착, 에러 정규화, 재시도, 401 리프레시는 모두 인터셉터에서 처리
 * - 브라우저: same-origin /api/proxy/* Route Handler 경유 (백엔드 URL 노출 X)
 * - 서버: BACKEND_API_BASE_URL 직접 호출 + cookies()의 토큰을 Authorization 부착
 */

const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_RETRY_LIMIT = 1
const CLIENT_PROXY_PREFIX = '/api/proxy/'
const REFRESH_ENDPOINT = '/api/auth/refresh'

/**
 * 토큰 주입 전략.
 * - 클라이언트: httpOnly 쿠키가 자동 동봉되므로 별도 토큰 주입 불필요
 * - 서버: cookies() API로 직접 토큰을 읽어 인자로 전달
 */
type TokenProvider = () => Promise<string | null> | string | null

const defaultTokenProvider: TokenProvider = () => null

interface CreateApiClientParams {
  baseUrl: string
  tokenProvider?: TokenProvider
  /** 401 발생 시 호출되는 리프레시 트리거. 성공 시 true 반환 */
  refreshOn401?: () => Promise<boolean>
  extra?: Options
}

function createApiClient(params: CreateApiClientParams): KyInstance {
  const {
    baseUrl,
    tokenProvider = defaultTokenProvider,
    refreshOn401,
    extra,
  } = params

  return ky.create({
    prefixUrl: baseUrl,
    timeout: DEFAULT_TIMEOUT_MS,
    // ky 기본 HTTPError를 끄고, afterResponse에서 ApiError로 직접 throw
    throwHttpErrors: false,
    retry: {
      limit: DEFAULT_RETRY_LIMIT,
      methods: ['get', 'put', 'head', 'delete', 'options', 'trace'],
      statusCodes: [408, 413, 429, 500, 502, 503, 504],
    },
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    hooks: {
      beforeRequest: [
        async request => {
          const token = await tokenProvider()
          if (token) {
            request.headers.set('Authorization', `Bearer ${token}`)
          }
          // 사고 진단을 위한 X-Request-ID 자동 부착 (이미 있으면 보존)
          if (!request.headers.has(REQUEST_ID_HEADER)) {
            request.headers.set(REQUEST_ID_HEADER, generateRequestId())
          }
        },
      ],
      afterResponse: [
        async (request, options, response) => {
          // 401 자동 리프레시 (브라우저 전용, refresh 엔드포인트 자체는 제외)
          if (
            response.status === 401 &&
            refreshOn401 &&
            !request.url.includes(REFRESH_ENDPOINT) &&
            !request.headers.has('x-no-retry')
          ) {
            const refreshed = await refreshOn401()
            if (refreshed) {
              // 무한 루프 방지를 위해 헤더로 1회 제한 표시 후 재요청
              const retryRequest = new Request(request, {
                headers: new Headers(request.headers),
              })
              retryRequest.headers.set('x-no-retry', '1')
              return ky(retryRequest, options)
            }
          }

          if (response.ok) return response

          let body: unknown = undefined
          try {
            body = await response.clone().json()
          } catch {
            // 응답이 JSON이 아닌 경우 무시
          }

          const message =
            (body as { message?: string } | undefined)?.message ??
            response.statusText ??
            'Request failed'
          const code = (body as { code?: string } | undefined)?.code

          throw new ApiError({
            message,
            status: response.status,
            code,
            details: body,
          })
        },
      ],
    },
    ...extra,
  })
}

/**
 * 동시 401에 대해 단일 리프레시 in-flight을 공유.
 */
let inflightRefresh: Promise<boolean> | null = null

async function triggerRefresh(): Promise<boolean> {
  if (inflightRefresh) return inflightRefresh

  inflightRefresh = (async () => {
    try {
      const res = await fetch(REFRESH_ENDPOINT, {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-no-retry': '1' },
      })
      return res.ok
    } catch {
      return false
    } finally {
      // 다음 401에서 다시 시도 가능하도록 슬롯 해제
      setTimeout(() => {
        inflightRefresh = null
      }, 0)
    }
  })()

  return inflightRefresh
}

/**
 * 클라이언트(브라우저) 전용 인스턴스.
 * /api/proxy/* Route Handler를 거쳐 백엔드로 포워딩되며,
 * httpOnly 쿠키가 자동 동봉되므로 별도 토큰 주입 불필요.
 */
export const apiClient: KyInstance = createApiClient({
  baseUrl: CLIENT_PROXY_PREFIX,
  refreshOn401: triggerRefresh,
  extra: {
    credentials: 'include',
  },
})

/**
 * 내부 헬퍼 — server-client.ts에서 호출됩니다.
 * 직접 사용하지 마세요. 서버에서는 `createServerApiClient`(server-only)를,
 * 클라이언트에서는 위의 `apiClient`를 사용하세요.
 */
export function _createKyClientForServer(params: {
  baseUrl: string
  tokenProvider: TokenProvider
}): KyInstance {
  return createApiClient({
    baseUrl: params.baseUrl,
    tokenProvider: params.tokenProvider,
  })
}

export type { TokenProvider }
