import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import { applyApiErrorToForm } from './api-error-to-form'

/**
 * 단위 테스트 예시 — 순수 함수.
 *
 * 새 헬퍼/유틸리티는 이 패턴으로 테스트하세요:
 * - 외부 의존성 X
 * - 입력 → 출력 검증
 * - 모든 분기(early return 포함) 커버
 */
describe('applyApiErrorToForm', () => {
  it('일반 Error에 대해서는 false를 반환하고 setError를 호출하지 않는다', () => {
    const setError = vi.fn()
    const result = applyApiErrorToForm(new Error('일반 에러'), setError)

    expect(result).toBe(false)
    expect(setError).not.toHaveBeenCalled()
  })

  it('ApiError에 fieldErrors가 없으면 false를 반환한다 (예: 401)', () => {
    const setError = vi.fn()
    const error = new ApiError({
      message: '인증 실패',
      status: 401,
    })

    expect(applyApiErrorToForm(error, setError)).toBe(false)
    expect(setError).not.toHaveBeenCalled()
  })

  it('details.errors의 각 필드를 setError로 매핑한다', () => {
    const setError = vi.fn()
    const error = new ApiError({
      message: '검증 실패',
      status: 400,
      details: {
        errors: {
          email: ['이미 사용 중인 이메일입니다'],
          name: ['최소 2자 이상이어야 합니다'],
        },
      },
    })

    expect(applyApiErrorToForm(error, setError)).toBe(true)
    expect(setError).toHaveBeenCalledWith('email', {
      type: 'server',
      message: '이미 사용 중인 이메일입니다',
    })
    expect(setError).toHaveBeenCalledWith('name', {
      type: 'server',
      message: '최소 2자 이상이어야 합니다',
    })
  })

  it('빈 errors 객체는 false를 반환한다', () => {
    const setError = vi.fn()
    const error = new ApiError({
      message: 'x',
      status: 400,
      details: { errors: {} },
    })

    expect(applyApiErrorToForm(error, setError)).toBe(true) // 객체 자체는 truthy로 매핑 시도
    expect(setError).not.toHaveBeenCalled()
  })

  it('messages 배열이 비어 있으면 해당 필드는 호출하지 않는다', () => {
    const setError = vi.fn()
    const error = new ApiError({
      message: 'x',
      status: 400,
      details: { errors: { email: [] } },
    })

    applyApiErrorToForm(error, setError)
    expect(setError).not.toHaveBeenCalled()
  })
})
