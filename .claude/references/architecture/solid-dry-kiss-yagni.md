# 아키텍처 리뷰 참조: SOLID / DRY / KISS / YAGNI

> **목적**: `architecture-reviewer` 에이전트가 PR 리뷰 시 인용하는 참조 문서.
> 일반론이 아니라 **claude-nextjs-starters baseline의 실제 파일/패턴에 매핑된 체크리스트**.
>
> **우선순위 충돌 시**: `CLAUDE.md` > 이 문서. 특히 "외과적 변경(Surgical Changes)" 원칙이 항상 위.

---

## 사용 규칙

1. 각 원칙별 **✅ 통과 신호 / 🚨 위반 신호**로 판단한다
2. 위반 발견 시 다음 형식으로 보고한다:
   ```
   [원칙] [심각도: 높음/중간/낮음]
   - 위치: <file>:<line>
   - 위반: <구체적 사실>
   - baseline 권장: <어느 파일/패턴이 정답인지>
   - 사용자 요청 범위 내 수정인가? (yes/no)
   ```
3. `사용자 요청 범위 밖`의 위반은 **언급만 하고 수정하지 않는다** — 별도 PR 제안
4. baseline 표준 템플릿(`src/features/users/`)은 _복사 OK, 수정 X_

---

## SOLID (frontend 해석)

### Single Responsibility (SRP)

**baseline 적용 방식**:

- 컴포넌트는 한 가지만: 표시 / 데이터 페칭 / 결정 로직 중 _하나_
- 도메인은 4파일로 분리: `features/<도메인>/{keys,queries,mutations,index}.ts`

**✅ 통과 신호**

- 페이지 컴포넌트가 `useXxxQuery` 호출 + JSX 렌더만 수행
- `keys.ts`에 query key factory만, `queries.ts`에 useQuery만, `mutations.ts`에 useMutation만

**🚨 위반 신호**

- 한 컴포넌트가 fetch + 데이터 변환 + 표시 + 라우팅 + 인증 검사를 모두 수행
- `queries.ts`에 mutation이 섞이거나 그 반대
- `src/lib/api/client.ts` 인터셉터에 특정 도메인 분기 추가 (인터셉터는 횡단 관심사 전용)

---

### Open/Closed (OCP)

**baseline 적용 방식**: ky hooks, RHF resolver, React Query options 같은 확장 포인트를 사용. 라이브러리/생성 코드 수정 금지.

**✅ 통과 신호**

- 새 공통 헤더가 필요할 때 `client.ts`의 `hooks.beforeRequest`에 추가
- 새 에러 처리 정책이 필요할 때 `errors.ts`의 `ApiError` 정규화 흐름에 추가

**🚨 위반 신호**

- `src/lib/api/generated/`의 orval 산출물 수동 편집 (CLAUDE.md 금지)
- shadcn/ui 컴포넌트 소스 직접 수정 (variant prop 또는 wrapper로 확장)

---

### Liskov / Interface Segregation (LSP / ISP)

**baseline 적용 방식**: TS strict, `Pick<...>` / `Omit<...>`로 props 좁히기, generated 타입을 그대로 노출하지 않기.

**🚨 위반 신호**

- `as any` / `as unknown as X` 캐스팅 (특히 generated 타입 우회 목적)
- god-props 컴포넌트 (예: 하나의 `<UserDialog>`가 form/list/detail 3가지 모드를 모두 받음 → 분리 권장)
- generated DTO를 컴포넌트 props로 그대로 흘림 (변경 시 레이어 전체 깨짐)

---

### Dependency Inversion (DIP)

**baseline 적용 방식**: 컴포넌트 → `features/<도메인>` 훅 → orval generated. 역방향 / 단축 금지.

**✅ 통과 신호**

- `import { useUsersQuery } from '@/features/users'`

**🚨 위반 신호 (CLAUDE.md 핵심 금지사항)**

- 컴포넌트에서 `import { ... } from '@/lib/api/generated/...'` 직접 import
- 컴포넌트에서 `apiClient` 또는 raw `fetch()` 직접 호출

---

## DRY

**baseline 적용 방식**:

- 도메인 로직은 `features/<도메인>`에 _한 번만_
- 스키마 단일 출처: `openapi/<spec>.yaml` → `npm run gen:api`
- 에러 객체는 `ApiError`(`src/lib/api/errors.ts`)로 통일

**✅ 통과 신호**

- 동일 mutation을 여러 컴포넌트가 재사용
- 검증 스키마는 generated에서 import (수기 재정의 X)

**🚨 위반 신호**

- 같은 fetch 로직이 두 페이지에 복붙
- Zod 스키마를 `generated/`와 별도로 다시 손으로 정의
- 동일한 에러 처리 if-else가 여러 컴포넌트에 산재 (→ `ApiError` 분기 활용)

**⚠️ 주의 — 과도 적용 금지**

- "3번 등장 = 추출" 룰. **2번까지는 중복 OK** (premature abstraction이 더 비싸다)
- 우연한 일치(동일 코드지만 다른 의미)는 추출 금지

---

## KISS

**baseline 적용 방식**: 라이브러리 기본 동작을 신뢰. 직접 구현 X.

**✅ 통과 신호**

- React Query 기본 캐시 그대로 사용 (별도 store X)
- shadcn 컴포넌트 그대로 사용 (forwardRef 직접 안 만듬)
- ky 인스턴스 1개 (`client.ts`) — 도메인별 클라이언트 X

**🚨 위반 신호**

- 이유 없이 Zustand / Recoil / Jotai 추가
- React Query를 한 번 더 감싼 `useApiQuery` 같은 추상화 (정당화 없음)
- ky의 retry/timeout/auth를 처음부터 직접 구현
- 단순한 useState 충분한 곳에 useReducer / Context

---

## YAGNI

**baseline 적용 방식**: 첫 사용처 1곳이면 추상화 X. 추측성 유연성 거부.

**✅ 통과 신호**

- 한 번만 쓰는 헬퍼는 호출 지점에 인라인
- props 인터페이스가 _현재_ 필요한 것만 받음

**🚨 위반 신호**

- "옵션이 늘어날 수 있으니" config 객체로 받는 props
- 사용처 없는 `<T extends ...>` generic
- 빈 인터페이스 / 미사용 export
- "나중에 다른 백엔드도 붙일 수 있게" 같은 가정 기반 plugin 레이어
- 한 곳에서만 쓰는 strategy 패턴
- 발생 불가능한 시나리오에 대한 try/catch (CLAUDE.md "발생 불가능한 시나리오에 대한 에러 핸들링 금지")

---

## 교차 원칙: 우선순위와 충돌

여러 원칙이 충돌하면 baseline의 우선순위(`CLAUDE.md "🧭 설계 원칙"`)를 따른다:

```
안정성 > 유지보수성 > 보안 > 성능
```

- **DRY vs YAGNI 충돌**: YAGNI 우선 (premature abstraction이 중복보다 비쌈)
- **SRP vs KISS 충돌**: 작업 범위가 좁다면 KISS 우선 (분리 자체가 새 추상화)
- **OCP vs YAGNI 충돌**: YAGNI 우선 — 확장 포인트는 *두 번째 사용처*가 등장할 때 만든다

---

## 리뷰 보고 형식 (architecture-reviewer가 따를 템플릿)

```
## 아키텍처 리뷰 결과

### 🚨 높음 (반드시 수정)
- [원칙명] <file>:<line>
  - 위반: ...
  - baseline 권장: ...

### ⚠️ 중간 (권장 수정)
- ...

### 💡 낮음 (선택)
- ...

### 📌 범위 밖 (수정 X — 언급만)
- 기존 코드의 위반 사항. 별도 PR 권장.
```
