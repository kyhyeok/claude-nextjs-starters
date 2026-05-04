# 🤖 Claude Code 개발 지침

**claude-nextjs-starters**는 Next.js 16.2.4 + React 19.2.5 기반 **외부 백엔드(Java/Kotlin/Nest)와 통신하는 모든 프론트엔드 프로젝트의 보편 baseline**입니다.

## 🛠 핵심 기술 스택

- **Framework**: Next.js 16.2.4 (App Router + Turbopack)
- **Runtime**: React 19.2.5 + TypeScript 5
- **Styling**: TailwindCSS v4 + shadcn/ui (new-york style) + next-themes
- **Forms**: React Hook Form + Zod
- **HTTP**: ky 1
- **State**: @tanstack/react-query 5
- **Codegen**: orval 7 (OpenAPI → typed 함수 + MSW 핸들러)
- **Mocking**: MSW 2 (dev only, dynamic import)
- **Auth**: httpOnly 쿠키 + Route Handler 프록시 (자체 구현)
- **Development**: ESLint 9 + Prettier + Husky + lint-staged + server-only

## 🧭 설계 원칙 (우선순위)

1. **안정성** — 도구/버전 변경에 강한 구조
2. **유지보수성** — 새 멤버가 1일 내 패턴 파악 가능한 명시성
3. **보안** — XSS/CSRF/토큰 노출 방지가 코드에 박힘
4. **성능** — 위 3가지를 해치지 않는 선에서

## 📚 개발 가이드

### baseline 정체성

- **📋 PRD (스타터 정체성)**: `@/docs/PRD.md`
- **🗺 개발 로드맵**: `@/docs/ROADMAP.md`

### 핵심 패턴 (★ 새 도메인 작업 시 필독)

- **🔌 API 통신 패턴**: `@/docs/guides/api-pattern.md`
- **🔐 인증 패턴**: `@/docs/guides/auth-pattern.md`
- **🧪 MSW 모킹**: `@/docs/guides/mocking-msw.md`
- **🔗 백엔드 스펙 통합**: `@/docs/guides/backend-spec-integration.md` (SpringDoc / restDocs / 둘 다)

### 일반 가이드

- **📁 프로젝트 구조**: `@/docs/guides/project-structure.md`
- **🎨 스타일링 가이드**: `@/docs/guides/styling-guide.md`
- **🧩 컴포넌트 패턴**: `@/docs/guides/component-patterns.md`
- **⚡ Next.js 16 가이드**: `@/docs/guides/nextjs-16.md`
- **📝 폼 처리 가이드**: `@/docs/guides/forms-react-hook-form.md`

## ⚡ 자주 사용하는 명령어

```bash
# 개발
npm run dev           # 개발 서버 (Turbopack)
npm run build         # 프로덕션 빌드
npm run check-all     # typecheck + lint + format:check (작업 완료 시 권장)

# API 코드 생성
npm run gen:api       # openapi/<spec>.yaml → typed 함수 + 스키마 + MSW 핸들러

# UI 컴포넌트
npx shadcn@latest add button   # 새 shadcn 컴포넌트 추가
```

## 🌱 새 프로젝트 셋업

```bash
# 1) 환경변수
cp .env.example .env.local
# .env.local 편집:
#   BACKEND_API_BASE_URL=http://localhost:8080      (서버 전용, 필수)
#   NEXT_PUBLIC_API_MOCK_ENABLED=true               (MSW로 백엔드 선행 개발 시)

# 2) 백엔드 OpenAPI 스펙 → openapi/example.yaml로 교체 → 코드 생성
npm run gen:api

# 3) 개발 서버
npm run dev
```

## ✅ 작업 완료 체크리스트

```bash
npm run check-all     # 모든 검사 통과 확인 (typecheck + lint + format)
npm run build         # 빌드 성공 확인
```

## 🎯 새 도메인 추가 표준 절차

1. `openapi/<spec>.yaml`에 엔드포인트 추가 → `npm run gen:api`
2. `src/features/<도메인>/`에 4개 파일 작성 (`keys.ts`/`queries.ts`/`mutations.ts`/`index.ts`)
   - `src/features/users/`를 복사 후 도메인명만 변경하면 가장 빠름
3. (선택) 보호 라우트라면 `src/proxy.ts`의 `config.matcher`에 추가
4. 컴포넌트에서 `import { useXxxQuery } from '@/features/<도메인>'`

자세한 절차는 `@/docs/guides/api-pattern.md` 참조.

## 🚫 핵심 금지사항

- ❌ 컴포넌트에서 `@/lib/api/generated/*` 직접 import (항상 `@/features/<도메인>` 경유)
- ❌ 컴포넌트에서 `apiClient` 또는 raw fetch 직접 호출 (항상 mutation/query 훅 경유)
- ❌ 토큰을 `localStorage`/`sessionStorage`에 저장 (httpOnly 쿠키만 사용)
- ❌ `BACKEND_API_BASE_URL`을 `NEXT_PUBLIC_*`로 노출 (서버 전용 유지)

> 외부 백엔드 통신 시 폼은 **mutation 훅 + RHF + Zod** 조합이 1차 권장입니다.
> Server Actions는 Next.js 내부 라우트나 자체 RSC 흐름에서 사용하세요 — 자세히는 `@/docs/guides/forms-react-hook-form.md`.

💡 **상세 규칙은 위 개발 가이드 문서들을 참조하세요.**
