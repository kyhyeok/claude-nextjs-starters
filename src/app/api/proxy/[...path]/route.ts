import { type NextRequest, NextResponse } from 'next/server'
import { serverEnv } from '@/lib/env/server'
import { readAccessToken } from '@/lib/auth/cookies'
import { getOrCreateRequestId, REQUEST_ID_HEADER } from '@/lib/api/request-id'

/**
 * /api/proxy/* — 외부 백엔드(BACKEND_API_BASE_URL)로 모든 메서드를 포워딩하는 catch-all.
 *
 * 동작:
 * - 클라이언트가 /api/proxy/users/me 호출 → 백엔드 {BASE}/users/me 로 전달
 * - httpOnly access_token 쿠키 → Authorization: Bearer 헤더로 변환
 * - 응답 바디/상태 그대로 통과
 *
 * 보안:
 * - 백엔드 절대 URL이 클라이언트 번들에 노출되지 않음
 * - 토큰은 JS에서 접근 불가 (httpOnly)
 * - same-origin이므로 CSRF는 sameSite=lax 쿠키로 1차 방어
 */

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'te',
  'trailer',
  'proxy-authorization',
  'proxy-authenticate',
  'upgrade',
  'host',
  'content-length',
])

async function handle(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  const { path } = await ctx.params
  const targetPath = path.join('/')
  const search = request.nextUrl.search
  const targetUrl = `${serverEnv.BACKEND_API_BASE_URL}/${targetPath}${search}`

  const headers = new Headers()
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value)
    }
  })

  const accessToken = await readAccessToken()
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  } else {
    headers.delete('Authorization')
  }

  // 사고 진단을 위한 X-Request-ID 보존/생성 (백엔드와 추적 연결)
  const requestId = getOrCreateRequestId(request.headers)
  headers.set(REQUEST_ID_HEADER, requestId)

  // GET/HEAD는 body 없음
  const hasBody = !['GET', 'HEAD'].includes(request.method)

  let upstream: Response
  try {
    upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      // Edge/Node 양쪽 호환을 위해 duplex 명시 (스트리밍 body)
      ...(hasBody && { duplex: 'half' as const }),
      redirect: 'manual',
      cache: 'no-store',
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Upstream request failed',
        cause: error instanceof Error ? error.message : 'unknown',
      },
      {
        status: 502,
        headers: { [REQUEST_ID_HEADER]: requestId },
      }
    )
  }

  // 응답 헤더 정리 (hop-by-hop 제거, content-encoding은 fetch가 이미 디코딩)
  const responseHeaders = new Headers()
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (HOP_BY_HOP_HEADERS.has(lower)) return
    if (lower === 'content-encoding' || lower === 'content-length') return
    responseHeaders.set(key, value)
  })

  // X-Request-ID echo (백엔드가 echo하지 않더라도 프론트로 전파)
  if (!responseHeaders.has(REQUEST_ID_HEADER)) {
    responseHeaders.set(REQUEST_ID_HEADER, requestId)
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  })
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
export const HEAD = handle
export const OPTIONS = handle
