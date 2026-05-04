# 🧪 테스트 가이드

이 문서는 baseline의 3-tier 테스트 전략과 작성 패턴을 정의합니다.

---

## 🧭 테스트 3계층

| 계층         | 도구                 | 대상                     | 속도   |
| ------------ | -------------------- | ------------------------ | ------ |
| **단위**     | Vitest               | 순수 함수, 헬퍼, 스키마  | ⚡⚡⚡ |
| **컴포넌트** | Vitest + RTL + jsdom | React 컴포넌트, 훅       | ⚡⚡   |
| **E2E**      | Playwright           | 실제 브라우저 + dev 서버 | ⚡     |

**원칙**: _피라미드 — 단위 多, 컴포넌트 中, E2E 少_. 각 도메인 추가 시 단위/컴포넌트 위주로 늘리고 E2E는 *핵심 사용자 흐름*만 커버.

---

## 🚀 명령어

```bash
npm run test          # Vitest 단위/컴포넌트 (CI 모드)
npm run test:watch    # Vitest watch 모드
npm run test:e2e      # Playwright E2E (헤드리스)
npm run test:e2e:ui   # Playwright UI 모드 (디버깅)
```

처음 한 번:

```bash
npx playwright install chromium    # 브라우저 다운로드
```

---

## 🏗 셋업 파일

```
vitest.config.ts                     # Vitest 설정 (jsdom + RTL)
playwright.config.ts                 # Playwright 설정 (webServer 자동 시작)

src/test/setup.ts                    # Vitest 글로벌 셋업
                                     #  - @testing-library/jest-dom 매처
                                     #  - MSW node server lifecycle
                                     #  - jsdom 폴리필 (ResizeObserver 등)

src/mocks/server.ts                  # MSW node server (테스트용)
                                     # browser.ts와 같은 handlers를 공유

tests/e2e/                           # Playwright E2E 테스트
├── users-page.spec.ts
└── auth-protection.spec.ts
```

---

## 1️⃣ 단위 테스트 — 순수 함수

가장 빠르고, 가장 많이 작성하세요.

**위치**: 대상 파일과 같은 폴더에 `*.test.ts`

**예시** (`src/lib/forms/api-error-to-form.test.ts`):

```typescript
import { describe, expect, it, vi } from 'vitest'
import { applyApiErrorToForm } from './api-error-to-form'

describe('applyApiErrorToForm', () => {
  it('일반 Error는 false 반환', () => {
    const setError = vi.fn()
    expect(applyApiErrorToForm(new Error('x'), setError)).toBe(false)
    expect(setError).not.toHaveBeenCalled()
  })

  // ... 모든 분기 커버
})
```

**규칙**:

- 외부 의존성 X (DB, 네트워크, DOM)
- `vi.fn()`으로 콜백 검증
- 모든 early return / 분기 케이스 커버
- AAA 패턴 (Arrange / Act / Assert)

---

## 2️⃣ 컴포넌트 테스트 — RTL

UI의 *행동*을 검증. *구현 세부사항*이 아닌 *사용자 관점*에서 작성.

**위치**: 컴포넌트와 같은 폴더 (`*.test.tsx`)

**예시 패턴** (`src/components/login-form.test.tsx`):

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// 외부 훅은 vi.mock으로 stub
vi.mock('@/lib/auth/use-auth', () => ({
  useLogin: () => ({ mutate: mockMutate, isPending: false }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

it('빈 입력 제출 시 검증 에러 표시', async () => {
  const user = userEvent.setup()
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LoginForm />
    </QueryClientProvider>,
  )
  await user.click(screen.getByRole('button', { name: /로그인/ }))
  expect(await screen.findByText(/이메일을 입력/)).toBeInTheDocument()
})
```

**규칙**:

- **selector 우선순위**: `getByRole` > `getByLabelText` > `getByPlaceholderText` > `getByTestId`
- **사용자 인터랙션**: `userEvent` (`fireEvent` 대신)
- **비동기**: `findByX` 또는 `await waitFor`
- **외부 훅 mock**: `vi.mock(...)` 모듈 단위
- **QueryClientProvider 래퍼**: TanStack Query 훅을 쓰는 컴포넌트는 필수
- **shadcn Form / Radix 컴포넌트**: jsdom 폴리필 필요 (이미 setup.ts에 들어있음)
- **wrapper div 안의 input**: `getByLabelText`가 안 되면 `getByPlaceholderText`로

---

## 3️⃣ E2E 테스트 — Playwright

*핵심 사용자 흐름*만 작성. 모든 페이지를 E2E로 커버하지 마세요 (단위/컴포넌트가 더 효율적).

**위치**: `tests/e2e/`

**MSW와의 통합**:

- `playwright.config.ts`의 `webServer.env.NEXT_PUBLIC_API_MOCK_ENABLED='true'`
- dev 서버가 자동 시작되며 MSW worker가 활성화 → 실제 백엔드 없이 E2E 가능

**예시** (`tests/e2e/users-page.spec.ts`):

```typescript
import { expect, test } from '@playwright/test'

test('/users 페이지에 mock 데이터가 렌더된다', async ({ page }) => {
  await page.goto('/users')
  await expect(page.getByRole('heading', { name: '사용자 목록' })).toBeVisible()
  await expect(page.getByText(/ID:/).first()).toBeVisible()
})
```

**언제 E2E를 작성할까**:

- ✅ 인증 흐름 (로그인 → 보호 라우트 진입)
- ✅ 결제, 주문 같은 _돌이킬 수 없는_ 흐름
- ✅ 여러 페이지를 거치는 위저드
- ❌ 단순 CRUD (컴포넌트 테스트로 충분)
- ❌ 폼 검증 (컴포넌트 테스트로)

**Playwright 패턴**:

- `getByRole` 우선
- `expect(...).toBeVisible({ timeout })` — 비동기 렌더 대기
- `page.waitForRequest(...)` — 네트워크 검증
- 여러 매치는 `.first()` / `.nth(i)` / `.filter(...)`로 좁힘
- 인증 상태가 필요한 시나리오는 `storageState`로 재사용 (Playwright fixtures)

---

## 🤖 CI 통합

`.github/workflows/ci.yml`에 다음 job이 등록됨:

| Job     | 실행 내용                                  |
| ------- | ------------------------------------------ |
| `check` | typecheck + lint + format                  |
| `build` | `next build`                               |
| `test`  | `npm run test` (Vitest)                    |
| `e2e`   | `npm run test:e2e` (Playwright + chromium) |

**Branch Protection**에서 위 4개 status check를 *모두 required*로 설정하면, 테스트 통과해야만 머지 가능.

E2E 실패 시 `playwright-report/`가 GitHub Actions artifact로 14일간 보존 — 실패 원인을 비주얼로 확인 가능.

---

## 🚨 흔한 함정과 해결

### 1) Radix UI 컴포넌트(Checkbox/Select/Dialog)를 렌더하면 `ResizeObserver is not defined`

- 원인: jsdom이 미구현
- 해결: `src/test/setup.ts`에 폴리필이 이미 들어있음. _수정하지 마세요_

### 2) `getByLabelText('비밀번호')`가 input을 못 찾음

- 원인: input이 wrapper div 안에 있어 FormControl의 id 주입이 div로 갔음
- 해결: `getByPlaceholderText` 또는 `getByRole('textbox', { name })`로

### 3) E2E 테스트가 `webServer` 시작 실패

- 원인: 포트 3000이 이미 사용 중이거나 BACKEND_API_BASE_URL 누락
- 해결: 다른 dev 서버 종료. CI는 `webServer.env`에서 placeholder 자동 주입

### 4) MSW가 *테스트 환경*에서 호출을 가로채지 못함

- 단위/컴포넌트 (Vitest): `setup.ts`의 `server.listen()`이 시작했는지 확인
- E2E (Playwright): browser worker가 등록됨. `NEXT_PUBLIC_API_MOCK_ENABLED=true` 확인

### 5) Strict mode violation (`getByText` 다중 매치)

- 원인: mock 데이터가 여러 행 — selector가 여러 element 매치
- 해결: `.first()` / `.filter({...})` / 더 구체적 selector

### 6) `waitFor` 타임아웃

- 원인: 비동기 작업이 완료되지 않음 (mutation 미응답, query 미해결)
- 해결: `findByX`로 자동 재시도 또는 `waitFor(() => ..., { timeout })` 늘림

---

## ✅ 새 도메인 추가 시 테스트 체크리스트

`src/features/<도메인>/` 작업과 동시에:

- [ ] `keys.test.ts` — query key factory 출력 검증 (단순)
- [ ] `queries.test.tsx` — 훅 동작 검증 (MSW로 응답 mock)
- [ ] `mutations.test.tsx` — invalidate 동작 검증
- [ ] (선택) `tests/e2e/<도메인>.spec.ts` — 핵심 흐름 1개

폼이 있는 경우:

- [ ] 폼 컴포넌트 테스트 — 빈 입력 검증, 성공 케이스, 에러 케이스
- [ ] `applyApiErrorToForm`이 호출되는지 검증

---

## 📎 관련 문서

- API 통신 패턴: [`api-pattern.md`](./api-pattern.md)
- MSW 모킹: [`mocking-msw.md`](./mocking-msw.md)
- 폼 패턴: [`forms-react-hook-form.md`](./forms-react-hook-form.md)
- 외부 자료:
  - [Vitest](https://vitest.dev/)
  - [Testing Library](https://testing-library.com/docs/react-testing-library/intro)
  - [Playwright](https://playwright.dev/)
