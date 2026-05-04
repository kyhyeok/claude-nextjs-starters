import { expect, test } from '@playwright/test'

/**
 * E2E — 보호 라우트(proxy.ts matcher) 동작 검증.
 *
 * `/dashboard/*`는 access_token 쿠키가 없으면 /login?returnTo=...로 리디렉션됩니다.
 * (proxy.ts의 config.matcher에 등록되어 있어야 함)
 */
test.describe('보호 라우트', () => {
  test('미인증 상태에서 /dashboard 접근 시 /login으로 리디렉션', async ({
    page,
  }) => {
    await page.goto('/dashboard/anything')
    await expect(page).toHaveURL(/\/login\?returnTo=/)

    // returnTo 쿼리 파라미터가 보존되었는지
    const url = new URL(page.url())
    expect(url.searchParams.get('returnTo')).toBe('/dashboard/anything')
  })

  test('/users는 보호 라우트가 아니므로 직접 접근 가능 (예시)', async ({
    page,
  }) => {
    await page.goto('/users')
    await expect(page).toHaveURL(/\/users$/)
  })
})
