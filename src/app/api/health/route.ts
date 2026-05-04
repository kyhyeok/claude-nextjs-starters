import { NextResponse } from 'next/server'

/**
 * GET /api/health
 *
 * 무인증 헬스체크 엔드포인트.
 *
 * 사용처:
 * - Vercel/uptime 모니터링 (StatusCake, UptimeRobot 등)
 * - 로드 밸런서 liveness probe (k8s, ALB)
 * - 배포 후 자동 검증
 *
 * 검증 범위: *프론트 자체 가동* 여부만. 백엔드 의존 없음.
 * 백엔드까지 검증하려면 별도 `/api/health/deep` 엔드포인트를 추가하세요
 * (백엔드 staging URL 호출 + DB ping 등 — 주의: 외부 의존성↑).
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: typeof process !== 'undefined' ? process.uptime() : null,
  })
}

export const dynamic = 'force-dynamic'
