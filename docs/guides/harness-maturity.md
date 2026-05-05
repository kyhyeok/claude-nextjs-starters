# 🧭 하네스 성숙도 가이드

> Claude Code를 실무에 안전하게 붙이려면 **모델 성능이 아니라 모델 주변의 _하네스(Harness)_**를 설계해야 합니다.
> 이 baseline은 _도메인 무관_ 이라는 정체성 때문에 6개 하네스를 _완전히 충족_ 할 수 없습니다 — 그러나 _충족 가능한 형태_ 로 만들어 두었습니다.
> 이 문서는 **starter에서 이미 박혀 있는 것** 과 **도메인 결정 후 직접 채워야 할 것** 을 시기별로 안내합니다.

---

## 1. 6개 하네스 — _도메인 의존도_ 분류

| 하네스                       | 책임                         | 도메인 의존도 | starter에서 결정 가능한 비율 |
| ---------------------------- | ---------------------------- | ------------- | ---------------------------- |
| **Permission**               | 행동 반경 제한               | 무관          | 95% ✅                       |
| **Tool** (Hooks/Slash 골격)  | 실행 전후 강제 + 도구 라우팅 | 무관          | 90% ✅                       |
| **Sub-agent** (기능 분리)    | 컨텍스트 격리 + 역할 분리    | 무관          | 80% ✅                       |
| **Context** (계층 구조)      | 작업면 잘라 주기             | 반의존        | 50% 🟡                       |
| **Verification** (Layer 1)   | 자동 검증 (typecheck/test)   | 반의존        | 70% ✅                       |
| **Verification** (Layer 2/3) | diff 검토 + 반례 루프        | 완전 의존     | 20% 🔴                       |
| **Debugging**                | 재현·진단 절차               | 완전 의존     | 30% 🔴                       |
| **Worktree**                 | 파일 시스템 격리             | 반의존        | 40% 🟡                       |

> _starter가 채울 수 없는 영역_ 이 있다는 사실 자체가 약점이 아닙니다. **비어 있는 자리를 명시하지 않는 것** 이 약점입니다. 이 가이드의 목적입니다.

---

## 2. 성숙도 곡선 — 시기별 채울 항목

### Day 1 — _starter가 이미 박아둔 것_

이미 baseline에 박혀 있어 _별도 작업 불필요_:

- ✅ **Permission**: `.claude/settings.json`의 Deny/Ask 3등급 (`.env`/`rm -rf`/`git push --force`/generated 차단 등)
- ✅ **Tool 골격**: PostToolUse(prettier) + Stop(typecheck) 훅, 6개 슬래시 명령(`/commit` 외)
- ✅ **Sub-agent 골격**: 12개 에이전트(`code-reviewer` / `security-reviewer` / `architecture-reviewer` 외)
- ✅ **Context 계층**: `CLAUDE.md` 글로벌·프로젝트 + `.claude/` 23개 자산 + `MEMORY.md`(auto-memory)
- ✅ **Verification Layer 1**: `npm run check-all` + Vitest + GitHub Actions CI 3 jobs
- ✅ **Debugging 인프라**: X-Request-ID + ApiError + MSW (가이드: [`debugging.md`](./debugging.md))

> **할 일**: 이 baseline의 [Core 5 가이드](../../CLAUDE.md)만 1일 안에 읽고, 도메인 결정으로 넘어가세요. baseline 인프라를 _다시 짜지 마세요_.

### Week 1 — _도메인 결정 직후 즉시 채우기_

도메인 모델링과 첫 API 계약이 나온 시점:

- 🔴 **환경 변수 매트릭스 채움** — [`debugging.md` §4](./debugging.md) 빈 표에 도메인 변수 추가
- 🔴 **첫 도메인 invariant 목록 작성** — 예: "결제 금액 ≥ 0", "유저 ID는 `usr_` prefix"
  - 위치: 도메인 PRD 또는 `docs/guides/<도메인>-invariants.md`
  - `/review:plan-review`의 `architecture-reviewer`가 자동 인용하도록 `.claude/references/`에 추가 권장
- 🔴 **첫 features 도메인 추가** — `src/features/<도메인>/` 4파일 (users/products 복사)
- 🔴 **첫 회귀 테스트 패턴 정착** — `features/users/queries.test.tsx` 같은 패턴을 도메인에 복사
- 🔴 **README/PRD/ROADMAP 재작성** — baseline 정체성 문서를 _프로젝트 정체성_ 으로 교체 (README 상단 안내 참조)

### Month 1 — _첫 사고 후_

실제 프로덕션 또는 스테이징에서 첫 사고가 발생한 시점:

- 🔴 **자주 깨지는 시나리오 카탈로그 시작** — `debugging.md` §부록(또는 별도 파일)에 _Symptom + 원인 + 재발 방지_ 1건 등재
- 🔴 **첫 디버깅 Skill 작성** — _같은 형태_ 의 사고가 2회 이상 발생하면 `.claude/skills/<도메인>-debugging.md` 생성
  - Skills는 *반복 절차의 재사용*에 적합 (글의 Tool Harness §)
- 🔴 **Verification Layer 2 — 도메인 invariant를 plan-review에 통합**:
  - `architecture-reviewer.md`의 참조 섹션에 도메인 invariant 파일 경로 추가
  - 또는 `.claude/agents/dev/<도메인>-flow-reviewer.md` 신규 (예: `payment-flow-reviewer`)

### Month 3 — _병렬 작업 시작 시_

동시에 진행되는 Claude 세션이 _2개를 넘어서는_ 시점:

- 🔴 **Worktree 정책 도입**:

  ```bash
  # 메인 worktree는 baseline 보존용 — 작업하지 않음
  git worktree add ../<repo>-feat-auth feat/auth
  git worktree add ../<repo>-feat-payment feat/payment
  ```

  - 동시 세션마다 worktree 1개씩 — 파일 충돌·테스트 결과 혼선 차단
  - PR 머지 후 `git worktree remove`

- 🔴 **read-only Explorer 패턴 정착** — 조사 전용 서브 에이전트는 `Read/Grep`만 (Edit/Write 권한 없이)
- 🔴 **Verification Layer 3 — 반례 검증 루프** — [`debugging.md` §5](./debugging.md)의 5문항을 PR 리뷰 체크리스트로 정착

### Month 6 — _도메인 패턴 안정화 시_

PR 리뷰 코멘트가 _패턴화_ 되는 시점 (같은 지적이 반복):

- 🔴 **도메인 reviewer 추가** — 반복 지적을 에이전트화
  - `.claude/agents/dev/<도메인>-reviewer.md` (예: `hipaa-compliance-reviewer`, `i18n-reviewer`)
  - `/review:plan-review`의 5명 → 6~7명으로 확장
- 🔴 **Skills 라이브러리 확장** — 반복 작업을 Skills로 묶어 컨텍스트 비용 절감
- 🔴 **PreToolUse 훅 강화** — _도메인 특화 차단_ (예: 결제 코드 수정 시 별도 승인)

---

## 3. starter가 _충족하지 못하는_ 영역의 정직한 명시

이 baseline이 **본질적으로 채울 수 없는** 5가지 슬롯입니다. 도메인 결정 전에는 비워둘 수밖에 없습니다.

| 슬롯                          | 왜 starter에서 못 채우는가              | 어디서 채우는가                             |
| ----------------------------- | --------------------------------------- | ------------------------------------------- |
| **도메인 invariant**          | 무엇이 불변인지는 도메인이 정함         | `.claude/references/<도메인>-invariants.md` |
| **사고 카탈로그**             | 무엇이 깨지는지는 _깨져 본_ 후에 안다   | `debugging.md` §부록 또는 별도 파일         |
| **도메인 Skill**              | 반복되는 진단/구현 절차는 도메인 의존   | `.claude/skills/<도메인>-*.md`              |
| **도메인 reviewer**           | 도메인별 리뷰 패턴은 6개월 누적 후 보임 | `.claude/agents/dev/<도메인>-reviewer.md`   |
| **도메인 환경 변수 매트릭스** | 변수 목록은 인프라 결정 후에야 확정     | `debugging.md` §4 표 채움                   |

> 이 5개 자리가 비어 있다는 사실을 _부끄러워하지 말고 표시_ 하세요. baseline의 책임은 _도메인 무관 영역_ 에 한해서만 정직하게 박혀 있습니다.

---

## 4. 자기 진단 체크리스트

각 단계의 _다음 단계로 넘어갈 시점_ 을 판단하는 기준입니다.

### Day 1 → Week 1 진입 조건

- [ ] [Core 5 가이드](../../CLAUDE.md) 읽음 (1,479 LOC)
- [ ] `npm run dev` 정상 실행
- [ ] `npm run gen:api` 한 번 실행해 본 경험
- [ ] `features/users` + `features/products` 두 템플릿의 차이를 한 줄로 설명 가능

### Week 1 → Month 1 진입 조건

- [ ] 첫 도메인 invariant 5건 이상 명문화
- [ ] 환경 변수 매트릭스 1차 작성 (Local/Docker/CI/Prod)
- [ ] features에 도메인 1개 이상 추가됨
- [ ] README/PRD/ROADMAP을 프로젝트 정체성으로 재작성

### Month 1 → Month 3 진입 조건

- [ ] 실제 사고 1건 이상 발생 + `debugging.md` 절차로 진단 완료
- [ ] 회귀 테스트 1건 이상 추가
- [ ] 같은 형태 사고 2회 이상이면 첫 Skill 작성

### Month 3 → Month 6 진입 조건

- [ ] 동시 Claude 세션 2개 이상 운영
- [ ] worktree 정책 정착 (메인 worktree는 보존용)
- [ ] PR 리뷰에 반례 루프 5문항 적용

### Month 6 — 정착 단계

- [ ] 도메인 reviewer 1명 이상 운영
- [ ] Skills 3개 이상
- [ ] PreToolUse 훅에 도메인 차단 1건 이상

---

## 5. 한 줄 정리

> **하네스 엔지니어링의 *완전한 충족*은 도메인을 아는 자만이 가능합니다.**
> starter는 _최대한 채우기_ 가 아니라 **모범적으로 채우되, 못 채우는 영역을 정직하게 표시하는 것**이 책임입니다.
> 비어 있는 슬롯을 _당신의 도메인_ 으로 채워가세요.

---

## 함께 읽기

- [에이전트 워크플로](./agent-workflow.md) — `.claude/` 23 자산의 세션 유형별 활용
- [디버깅 하네스](./debugging.md) — Symptom/Evidence/Verification Loop 분리 + 환경 매트릭스
- [API 통신 패턴](./api-pattern.md) — features 도메인 추가 표준
- [PRD](../PRD.md) — baseline 정체성과 경계 정책
- [ROADMAP](../ROADMAP.md) — baseline 자체의 개발 이력 (Phase 1 ~ 5-O)
