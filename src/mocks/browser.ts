import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

/**
 * 브라우저 전용 MSW worker.
 * 이 모듈은 `src/mocks/init.ts`에서 dynamic import로만 로드되며,
 * prod 번들에는 포함되지 않습니다.
 */
export const worker = setupWorker(...handlers)
