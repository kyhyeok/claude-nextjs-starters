# claude-nextjs-starters

> **외부 백엔드(Java/Kotlin/Nest 등)와 통신하는 모든 프론트엔드 프로젝트의 보편 baseline.**
> Next.js 16 + React 19 + TypeScript 5 + TailwindCSS v4 + shadcn/ui.

## 🎯 정체성

이 starter는 _도메인 무관_ 기반입니다. 인증/HTTP/모킹/테스트/CI/보안 헤더가 처음부터 박혀 있어, 새 프로젝트마다 같은 셋업을 다시 짜지 않아도 됩니다.

**핵심 가치**: 안정성 → 유지보수성 → 보안 → 성능 (이 순서로)

## 🛠 기술 스택

| 영역        | 도구                                                |
| ----------- | --------------------------------------------------- |
| 프레임워크  | Next.js 16.2.4 (App Router + Turbopack)             |
| 런타임      | React 19.2.5 + TypeScript 5                         |
| 스타일링    | TailwindCSS v4 + shadcn/ui (new-york) + next-themes |
| 폼          | React Hook Form 7 + Zod 4                           |
| HTTP        | ky 1                                                |
| 데이터/상태 | TanStack Query 5                                    |
| 코드 생성   | orval 7 (OpenAPI → typed 함수 + MSW 핸들러)         |
| 모킹        | MSW 2 (dev-only, dynamic import)                    |
| 인증        | httpOnly 쿠키 + Route Handler 프록시 (자체 구현)    |
| 테스트      | Vitest + RTL + Playwright                           |
| CI/배포     | GitHub Actions + Vercel                             |

## 🚀 빠른 시작

```bash
# 1) 클론
git clone <this-repo> my-new-project
cd my-new-project

# 2) 환경변수
cp .env.example .env.local
# .env.local 편집:
#   BACKEND_API_BASE_URL=http://localhost:8080      (서버 전용, 필수)
#   NEXT_PUBLIC_API_MOCK_ENABLED=true               (MSW로 백엔드 선행 개발 시)

# 3) 의존성 설치
npm install
npx playwright install chromium    # E2E 테스트용 (한 번만)

# 4) (옵션) 백엔드 OpenAPI 스펙으로 typed 코드 생성
npm run gen:api

# 5) 개발 서버
npm run dev
```

브라우저에서 `http://localhost:3000` 접속.

## 📦 자주 쓰는 명령어

```bash
npm run dev              # 개발 서버 (Turbopack)
npm run build            # 프로덕션 빌드
npm run check-all        # typecheck + lint + format:check (작업 완료 시)

npm run gen:api          # OpenAPI 스펙 → typed 함수 + MSW 핸들러
npm run test             # Vitest 단위/컴포넌트
npm run test:e2e         # Playwright E2E
```

## 📚 문서

새 프로젝트를 시작하기 전에 _최소_ `📋 PRD`와 `🔌 API 통신 패턴`을 읽으세요.

| 문서                                                             | 내용                                    |
| ---------------------------------------------------------------- | --------------------------------------- |
| [📋 PRD](./docs/PRD.md)                                          | baseline 정체성/제공 기능/사용 시나리오 |
| [🗺 ROADMAP](./docs/ROADMAP.md)                                  | 완료된 Phase + 향후 옵션                |
| [📁 프로젝트 구조](./docs/guides/project-structure.md)           | 디렉터리/네이밍/별칭                    |
| [🔌 API 통신 패턴](./docs/guides/api-pattern.md)                 | TanStack Query + ky + features          |
| [🔐 인증 패턴](./docs/guides/auth-pattern.md)                    | httpOnly 쿠키 + 401 리프레시            |
| [🃏 MSW 모킹](./docs/guides/mocking-msw.md)                      | 백엔드 미완성 시 선행 개발              |
| [🔗 백엔드 스펙 통합](./docs/guides/backend-spec-integration.md) | SpringDoc / restDocs                    |
| [🧪 테스트](./docs/guides/testing.md)                            | Vitest + RTL + Playwright               |
| [🛡 보안 헤더 + CSP](./docs/guides/security-headers.md)          | HSTS / CSP / 헬스체크 / X-Request-ID    |
| [🚀 Vercel 배포](./docs/guides/deploy-vercel.md)                 | Vercel + GitHub Actions 분담            |
| [📊 모니터링](./docs/guides/monitoring.md)                       | Sentry + Prometheus/Grafana 분담        |
| [🌐 i18n 도입](./docs/guides/i18n.md)                            | 옵션 — 필요 시 도입 절차                |
| [🎨 스타일링](./docs/guides/styling-guide.md)                    | TailwindCSS + mobile-first              |
| [🧩 컴포넌트 패턴](./docs/guides/component-patterns.md)          | RSC / Client / 변형                     |
| [⚡ Next.js 16](./docs/guides/nextjs-16.md)                      | proxy/async APIs/Turbopack              |
| [📝 폼 처리](./docs/guides/forms-react-hook-form.md)             | RHF + Zod + mutation                    |

> 🤖 **Claude Code 사용자**: [`CLAUDE.md`](./CLAUDE.md)에 개발 지침과 자주 쓰는 명령이 정리되어 있습니다.

## 🎯 새 도메인 추가 표준 절차

```bash
# 1) 백엔드 OpenAPI 스펙을 openapi/example.yaml로 교체 (또는 추가)
# 2) 코드 생성
npm run gen:api

# 3) src/features/<도메인>/ 작성 (users 폴더 복사가 가장 빠름)
#    keys.ts / queries.ts / mutations.ts / index.ts

# 4) 컴포넌트에서 import
#    import { useXxxQuery } from '@/features/<도메인>'
```

자세한 절차: [`api-pattern.md`](./docs/guides/api-pattern.md)

## 🚫 핵심 금지사항

- ❌ 컴포넌트에서 `@/lib/api/generated/*` 직접 import (항상 `@/features/<도메인>` 경유)
- ❌ 컴포넌트에서 `apiClient` 또는 raw fetch 직접 호출 (항상 mutation/query 훅 경유)
- ❌ 토큰을 `localStorage`/`sessionStorage`에 저장 (httpOnly 쿠키만)
- ❌ `BACKEND_API_BASE_URL`을 `NEXT_PUBLIC_*`로 노출 (서버 전용 유지)

## 📜 라이선스

이 starter의 라이선스는 자유롭게 채택하세요 (MIT/Apache 2.0 등).
