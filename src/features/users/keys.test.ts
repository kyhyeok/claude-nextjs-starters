import { describe, expect, it } from 'vitest'
import { userKeys } from './keys'

/**
 * Query Key Factory 단위 테스트.
 *
 * - 외부 의존성 0 (순수 함수 테스트)
 * - 새 도메인 추가 시 동일 패턴으로 keys.test.ts를 함께 작성하면
 *   캐시 무효화 정책이 깨지는 회귀를 가장 싸게 잡습니다.
 */
describe('userKeys factory', () => {
  it('루트 키는 도메인명으로 시작한다', () => {
    expect(userKeys.all).toEqual(['users'])
  })

  it('list 키는 list 변형들을 모두 포함하는 prefix를 만든다', () => {
    expect(userKeys.lists()).toEqual(['users', 'list'])
    expect(userKeys.list({ page: 1 })).toEqual(['users', 'list', { page: 1 }])
  })

  it('detail 키는 detail 변형들을 모두 포함하는 prefix를 만든다', () => {
    expect(userKeys.details()).toEqual(['users', 'detail'])
    expect(userKeys.detail('usr_1')).toEqual(['users', 'detail', 'usr_1'])
  })

  it('파라미터가 다르면 list 키도 달라진다', () => {
    const a = userKeys.list({ page: 1, size: 20 })
    const b = userKeys.list({ page: 2, size: 20 })
    expect(a).not.toEqual(b)
  })

  it('id가 다르면 detail 키도 달라진다', () => {
    expect(userKeys.detail('a')).not.toEqual(userKeys.detail('b'))
  })
})
