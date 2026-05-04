import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { isApiError } from '@/lib/api/errors'

/**
 * 백엔드 검증 실패 응답을 RHF 폼 필드 에러로 매핑합니다.
 *
 * 가정: 백엔드가 다음 형태로 검증 실패를 내려준다고 가정.
 *   {
 *     "message": "검증 실패",
 *     "code": "VALIDATION_ERROR",
 *     "errors": {
 *       "email": ["이미 사용 중인 이메일입니다"],
 *       "name":  ["최소 2자 이상이어야 합니다"]
 *     }
 *   }
 *
 * 다른 형태라면 이 함수만 수정하면 모든 폼에 일괄 적용됩니다.
 *
 * 반환값:
 * - true  : ApiError + errors 매핑이 있어 setError로 적용됨 (호출자가 toast 생략 가능)
 * - false : 매핑할 fieldErrors 없음 → 호출자가 toast/global error 처리
 */
export function applyApiErrorToForm<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>
): boolean {
  if (!isApiError(error)) return false

  const fieldErrors = (error.details as { errors?: Record<string, string[]> })
    ?.errors
  if (!fieldErrors || typeof fieldErrors !== 'object') return false

  Object.entries(fieldErrors).forEach(([field, messages]) => {
    if (Array.isArray(messages) && messages.length > 0) {
      setError(field as Path<T>, { type: 'server', message: messages[0] })
    }
  })
  return true
}
