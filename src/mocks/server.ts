import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/**
 * Node 환경(Vitest 등)에서 사용하는 MSW server.
 * 브라우저용 setupWorker(`browser.ts`)와 동일한 핸들러를 공유합니다.
 *
 * 사용처: src/test/setup.ts
 */
export const server = setupServer(...handlers)
