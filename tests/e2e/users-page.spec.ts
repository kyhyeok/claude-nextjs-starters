import { expect, test } from '@playwright/test'

/**
 * E2E 테스트 예시 — Phase 1~4 통합 흐름.
 *
 * MSW가 활성화된 dev 서버에서 /users 진입 시:
 *   1. MSW worker 등록
 *   2. /api/proxy/users 호출이 mock 핸들러로 가로채짐
 *   3. mock 응답이 컴포넌트에 렌더됨
 */
test.describe('/users 페이지 — MSW mock 흐름', () => {
  test('mock 사용자 목록이 렌더된다', async ({ page }) => {
    await page.goto('/users')

    await expect(
      page.getByRole('heading', { name: '사용자 목록' })
    ).toBeVisible()

    // mock 데이터는 faker로 생성되므로 *값*이 아닌 *구조*를 검증
    // 사용자 카드가 여러 개이므로 strict mode 위반 방지를 위해 .first()
    await expect(page.getByText(/ID:/).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('네트워크 요청이 /api/proxy/users로 나간다', async ({ page }) => {
    const apiRequest = page.waitForRequest(req =>
      req.url().includes('/api/proxy/users')
    )

    await page.goto('/users')
    const request = await apiRequest

    expect(request.method()).toBe('GET')
    expect(new URL(request.url()).pathname).toBe('/api/proxy/users')
  })
})
