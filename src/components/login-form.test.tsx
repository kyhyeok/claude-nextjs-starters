import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LoginForm } from './login-form'

/**
 * 컴포넌트 테스트 예시 — RTL + user-event.
 *
 * 패턴 규칙:
 * - 외부 의존성(훅, next/navigation 등)은 vi.mock으로 stub
 * - QueryClientProvider 래퍼 필수 (useLogin이 useQueryClient에 의존)
 * - 사용자 인터랙션은 userEvent (fireEvent 대신)
 * - 검증은 *접근성 쿼리* 우선 (getByRole, findByText)
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

const mockMutate = vi.fn()
vi.mock('@/lib/auth/use-auth', () => ({
  useLogin: () => ({ mutate: mockMutate, isPending: false }),
}))

function renderLoginForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <LoginForm />
    </QueryClientProvider>
  )
}

describe('LoginForm', () => {
  it('빈 입력으로 제출 시 클라이언트 검증 에러를 표시한다', async () => {
    const user = userEvent.setup()
    renderLoginForm()

    await user.click(screen.getByRole('button', { name: /로그인하기/ }))

    expect(await screen.findByText(/이메일을 입력/)).toBeInTheDocument()
    expect(screen.getByText(/비밀번호를 입력/)).toBeInTheDocument()
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('유효한 입력으로 제출 시 useLogin.mutate를 호출한다', async () => {
    const user = userEvent.setup()
    mockMutate.mockClear()
    renderLoginForm()

    await user.type(
      screen.getByPlaceholderText('your@email.com'),
      'alice@test.com'
    )
    await user.type(
      screen.getByPlaceholderText('비밀번호를 입력하세요'),
      'secret123'
    )
    await user.click(screen.getByRole('button', { name: /로그인하기/ }))

    expect(mockMutate).toHaveBeenCalledWith(
      { email: 'alice@test.com', password: 'secret123' },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      })
    )
  })

  it('비밀번호 보기 토글 버튼이 input type을 전환한다', async () => {
    const user = userEvent.setup()
    renderLoginForm()

    // password input이 wrapper div 안에 있어 label 연결이 끊김 — placeholder로 selector
    const passwordInput = screen.getByPlaceholderText(
      '비밀번호를 입력하세요'
    ) as HTMLInputElement
    expect(passwordInput.type).toBe('password')

    await user.click(screen.getByRole('button', { name: '비밀번호 보기' }))
    expect(passwordInput.type).toBe('text')

    await user.click(screen.getByRole('button', { name: '비밀번호 숨기기' }))
    expect(passwordInput.type).toBe('password')
  })
})
