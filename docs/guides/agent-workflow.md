# 🤖 에이전트 워크플로

claude-nextjs-starters의 23개 `.md` 자산(에이전트 / 슬래시 명령어 / 레퍼런스)을 **vibe 코딩 세션**에 어떻게 통합할지에 대한 가이드입니다.

> **이 문서는 매 세션 시작 시 참조됩니다.** 새 작업을 시작하면 먼저 *세션 유형*을 정하고, 해당 유형의 콤보만 사용하세요. 자산을 다 쓰려 하면 마찰만 늘어 vibe가 죽습니다.

---

## 1. 보유 자산 한눈에

세 부류로 나뉩니다:

| 부류            | 호출 방식                      | 위치                        | 역할               |
| --------------- | ------------------------------ | --------------------------- | ------------------ |
| **에이전트**    | `Agent` 도구 + `subagent_type` | `.claude/agents/` (12개)    | 전문 페르소나 위임 |
| **슬래시 명령** | 사용자가 `/group:name` 입력    | `.claude/commands/` (6개)   | 정형화된 절차      |
| **레퍼런스**    | 에이전트가 _자동_ 인용         | `.claude/references/` (5개) | 사용자 직접 호출 X |

### 1.1 에이전트 (`.claude/agents/dev/` + `docs/`)

| 에이전트                    | 영역 | 호출 시점                                                          |
| --------------------------- | ---- | ------------------------------------------------------------------ |
| `prd-generator`             | 기획 | _대형_ 기능 PRD 초안                                               |
| `prd-validator`             | 기획 | PRD 기술 타당성 검증                                               |
| `development-planner`       | 기획 | `ROADMAP.md` 신규/대규모 갱신                                      |
| `nextjs-app-developer`      | 빌드 | App Router 라우팅·레이아웃·페이지 스캐폴딩                         |
| `ui-markup-specialist`      | 빌드 | UI 정적 마크업 + Tailwind 스타일링 (로직 X)                        |
| `starter-cleaner`           | 청소 | starter 잔재 정리 — _1회성_ (이미 완료된 baseline에서는 호출 X)    |
| `code-reviewer`             | 검증 | _작은_ 변경의 일반 리뷰 (단독)                                     |
| `architecture-reviewer`     | 검증 | SOLID/DRY/KISS/YAGNI + 레이어링 — `/review:plan-review` 경유       |
| `coding-standards-reviewer` | 검증 | CLAUDE.md 행동 가이드라인 + TS strict — `/review:plan-review` 경유 |
| `security-reviewer`         | 검증 | httpOnly/CSP/토큰 — `/review:plan-review` 경유                     |
| `ui-design-reviewer`        | 검증 | shadcn/Tailwind/접근성 — `/review:plan-review` 경유                |
| `performance-reviewer`      | 검증 | RSC/캐시/번들 — `/review:plan-review` 경유                         |

### 1.2 슬래시 명령어 (`.claude/commands/`)

| 명령어                 | 시점                                        |
| ---------------------- | ------------------------------------------- |
| `/git:branch`          | 세션 시작 시 feature 브랜치 분기            |
| `/git:commit`          | 변경 1단위 완료 시 (이모지 + 컨벤셔널)      |
| `/git:pr`              | 기능 완료 시 PR 생성                        |
| `/git:merge`           | 리뷰 통과 후 병합                           |
| `/docs:update-roadmap` | 세션 종료 시 진척 기록                      |
| `/review:plan-review`  | Plan 단계 게이트 — 보안/인프라 영향 변경 시 |

### 1.3 레퍼런스 (`.claude/references/`)

5개 reviewer 에이전트가 _자동 인용_. 사용자 직접 호출 X.

| 파일                                   | 상태                         | 인용 에이전트               |
| -------------------------------------- | ---------------------------- | --------------------------- |
| `architecture/solid-dry-kiss-yagni.md` | 작성됨                       | `architecture-reviewer`     |
| `standards/coding-standards.md`        | 스텁 (CLAUDE.md 직접 인용)   | `coding-standards-reviewer` |
| `security/owasp-frontend.md`           | 스텁 (docs/guides 직접 인용) | `security-reviewer`         |
| `ui/shadcn-tailwind-v4.md`             | 스텁 (docs/guides 직접 인용) | `ui-design-reviewer`        |
| `performance/rsc-react19.md`           | 스텁 (docs/guides 직접 인용) | `performance-reviewer`      |

> 스텁 채우기는 *해당 영역의 위반 패턴이 5+건 누적되었을 때*가 적기. 그 전엔 추측성 일반론으로 채우게 되어 reference 신뢰도가 떨어집니다.

---

## 2. 세션 유형별 콤보

세션마다 _모든 자산을 다 쓰지 마세요_. **세션 유형을 먼저 정하세요.**

### 🟢 유형 A: 새 기능 1개 추가 (가장 흔함, ~80%)

작은 화면 추가, 폼 1개, 버튼 동작 변경 등.

```
1. /git:branch feature/<name>
2. (대화로 plan 합의)
3. (vibe 구현)
4. npm run check-all
5. /git:commit
6. /docs:update-roadmap
```

**호출 안 함**: `prd-generator`, `/review:plan-review`, 5 reviewer 개별 — 작은 기능엔 과함.

### 🟡 유형 B: 새 _도메인_ 추가 (`features/<도메인>`)

OpenAPI 엔드포인트 그룹이 새로 추가될 때.

```
1. /git:branch feature/<domain>-domain
2. openapi/<spec>.yaml 갱신 → npm run gen:api
3. (대화로 plan)
4. /review:plan-review            ← ⚠️ 게이트 — 5명 병렬, 레이어링/보안 점검
5. nextjs-app-developer 위임      ← 페이지/라우트 스캐폴딩
6. (도메인 코드 vibe — features/users/ 복사로 시작)
7. npm run check-all
8. /git:commit (단계별 분할 가능)
9. /docs:update-roadmap
```

**`/review:plan-review`를 호출하는 이유**: 새 도메인은 _features 레이어링 / proxy.ts matcher / generated import_ 위반이 가장 발생하기 쉬운 지점.

### 🔵 유형 C: 보안/인증/인프라 영향 변경

`src/lib/api/client.ts`, `src/proxy.ts`, `next.config.ts`, 인증 흐름 등.

```
1. /git:branch fix/<area>
2. (대화로 plan)
3. /review:plan-review            ← ⚠️ 필수 — 보안 페르소나 검증
4. (구현)
5. npm run check-all
6. (수동 동작 확인)               ← 자동 검증만으로 부족
7. code-reviewer 위임             ← 추가 1명 검증
8. /git:commit
```

### 🟣 유형 D: 대형 기능 — PRD부터

여러 도메인/화면을 아우르는 기능.

```
1. prd-generator 위임             ← PRD 초안
2. prd-validator 위임             ← 기술 타당성 검증
3. development-planner 위임       ← ROADMAP에 phase 추가
4. /docs:update-roadmap
5. → 유형 B 또는 A로 단계별 진행
```

---

## 3. 실전 시나리오 — "로그인 페이지 추가"

vibe 코딩이 어떻게 흘러가는지 구체적으로 (유형 B + C 혼합):

```
[세션 1 — 인증 백엔드 spec 동기화]
  • OpenAPI에 /auth/login, /auth/refresh, /auth/me 추가
  • npm run gen:api
  • /git:commit "🔧 chore: auth 엔드포인트 추가"

[세션 2 — features/auth 도메인]
  • /git:branch feature/auth
  • 대화: "features/auth 4파일 작성. login mutation + me query"
  • /review:plan-review            ← 보안 + 아키텍처 게이트
  • (vibe 구현)
  • npm run check-all → /git:commit

[세션 3 — 로그인 페이지 UI]
  • 대화: "/login 페이지 RHF + Zod"
  • ui-markup-specialist 위임      ← 마크업만 먼저
  • (로직은 본인이 vibe — useLoginMutation 연결)
  • (다크모드 동작 확인)
  • npm run check-all → /git:commit

[세션 4 — proxy.ts 보호 라우트]
  • 대화: "src/proxy.ts matcher에 /dashboard/:path* 추가"
  • /review:plan-review            ← 보안 페르소나 검증
  • (구현 — 1줄 수정)
  • npm run check-all → /git:commit

[세션 5 — 마무리]
  • /git:pr                        ← PR 생성
  • /docs:update-roadmap           ← Phase 체크
  • /git:merge                     ← (리뷰 통과 후)
```

---

## 4. 우선순위 — 매 세션 _반드시_ 쓰는 4개

자산이 많지만 *매번 쓰는 건 4개*뿐:

```
✅ /git:branch              (세션 시작)
✅ npm run check-all        (검증)
✅ /git:commit              (저장)
✅ /docs:update-roadmap     (진척 기록)
```

나머진 _상황에 맞을 때만_ 호출:

| 상황                  | 호출할 자산                             |
| --------------------- | --------------------------------------- |
| 새 도메인 / 보안 변경 | `/review:plan-review`                   |
| UI 마크업 복잡        | `ui-markup-specialist`                  |
| 라우팅 구조 변경      | `nextjs-app-developer`                  |
| 큰 기능 시작          | `prd-generator` → `development-planner` |
| 단순 변경 검증        | `code-reviewer` (1명)                   |

---

## 5. 안티패턴

- ❌ **모든 세션에 `/review:plan-review` 호출** — 작은 변경엔 과함, vibe 죽음
- ❌ **개별 reviewer 5명을 일일이 호출** — `/review:plan-review`가 병렬 호출 + 통합 리포트 + tiebreaker를 알아서 처리
- ❌ **레퍼런스 문서를 사용자가 직접 인용** — 에이전트가 자동 인용. 사용자는 신규 위반 패턴 누적 시 *보강*만
- ❌ **`starter-cleaner` 재호출** — 1회성. 이미 정리된 baseline에서는 호출 X
- ❌ **자산을 다 쓰려는 욕심** — vibe 코딩의 본질은 _흐름_. 콤보를 단순하게.

---

## 6. 매 세션 시작 체크리스트

```
[ ] 작업이 어떤 세션 유형인가? (A/B/C/D 중 하나)
[ ] /git:branch 로 분기했는가?
[ ] 작업 범위가 ROADMAP에 있는가? (없으면 추가)
[ ] (B/C 유형이면) /review:plan-review 게이트 통과했는가?
[ ] 작업 끝에 npm run check-all → /git:commit 했는가?
[ ] /docs:update-roadmap 으로 체크했는가?
```
