import type { HttpHandler } from 'msw'
import { getUsersMock } from '@/lib/api/generated/users/users.msw'
import { getProductsMock } from '@/lib/api/generated/products/products.msw'

/**
 * MSW 핸들러 통합.
 *
 * 새 도메인 추가 시:
 *   1) `npm run gen:api`로 `<domain>.msw.ts` 자동 생성
 *   2) 이 파일에서 `getXxxMock()`을 import하여 spread
 *
 * 백엔드와 다르게 동작시키고 싶은 케이스가 있으면, 도메인별로 override 함수 인자에
 * 직접 응답을 넣어 호출하거나 별도 핸들러를 추가하세요.
 *
 * 예:
 *   import { getListUsersMockHandler } from '@/lib/api/generated/users/users.msw'
 *   ...
 *   getListUsersMockHandler({ items: [...], page: 1, size: 20, total: 1 })
 */
export const handlers: HttpHandler[] = [...getUsersMock(), ...getProductsMock()]
