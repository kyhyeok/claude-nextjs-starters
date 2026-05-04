import { defineConfig } from 'orval'

/**
 * orval 코드 생성 설정.
 *
 * 입력: openapi/example.yaml (실제 백엔드 스펙으로 교체)
 * 출력: src/lib/api/generated/
 *
 * 생성되는 것:
 * - tags 단위로 분리된 typed fetch 함수 (훅 X — TanStack Query 훅은 features/&lt;도메인&gt;/queries.ts에서 직접)
 * - schemas/ 디렉터리에 모델 타입
 * - .msw.ts 파일에 MSW 핸들러 (백엔드 미완성 상태에서 프론트 선행 개발용)
 *
 * 변경 시:
 *   npm run gen:api
 */
export default defineConfig({
  api: {
    input: {
      target: './openapi/example.yaml',
    },
    output: {
      mode: 'tags-split',
      target: './src/lib/api/generated/index.ts',
      schemas: './src/lib/api/generated/schemas',
      client: 'fetch',
      // 모든 fetch를 우리 ky 인스턴스(401 리프레시/에러 정규화)로 라우팅
      override: {
        mutator: {
          path: './src/lib/api/orval-mutator.ts',
          name: 'orvalFetch',
        },
      },
      mock: {
        type: 'msw',
        delay: 300,
        // useExamples=true: 스펙의 example 값을 mock 응답에 사용
        useExamples: true,
        // 클라이언트는 /api/proxy/* 로 요청하므로 핸들러 매칭 base를 맞춤
        baseUrl: '/api/proxy',
      },
      clean: true,
      prettier: true,
      // 같은 프로젝트의 다른 환경에서 import 가능하도록 path-aliasing 활성화
      tsconfig: './tsconfig.json',
    },
  },
})
