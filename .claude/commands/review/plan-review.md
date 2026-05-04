---
description: 'Plan 모드 결과를 5개 전문 리뷰어로 병렬 검토합니다'
allowed-tools: ['Read', 'Agent', 'Bash(git status:*)', 'Bash(git diff:*)']
---

# /plan-review

Plan 모드에서 작성한 구현 계획을 **5개 전문 페르소나로 병렬 리뷰**합니다.
구현 시작 전에 아키텍처/표준/보안/UI/성능 관점의 블로커를 미리 잡는 게이트입니다.

## 사용법

```
/plan-review               # 직전 Plan(또는 conversation의 가장 최근 계획)을 사용
/plan-review <plan text>   # 명시적 텍스트 전달
```

## 사전 조건 (없으면 사용자에게 안내 후 중단)

- `.claude/agents/dev/` 에 다음 5개 에이전트가 정의되어 있어야 합니다 (`/plan-review`는 step **B**에서 만들어진 에이전트에 의존):
  - `architecture-reviewer.md`
  - `coding-standards-reviewer.md`
  - `security-reviewer.md`
  - `ui-design-reviewer.md`
  - `performance-reviewer.md`

부재 시: 어떤 에이전트가 빠졌는지 명시하고, 존재하는 것만 호출할지 사용자에게 묻는다.

---

## 실행 단계

### 1. Plan 입력 확보

- `$ARGUMENTS`가 비어 있으면 직전 ExitPlanMode 산출물 또는 conversation의 가장 최근 계획을 사용
- 어떤 것도 못 찾으면: "Plan을 먼저 작성하시거나 본문을 붙여넣어 주세요" 응답 후 **종료** (계획 자동 생성 금지)

### 2. 컨텍스트 수집 (선택)

- `git status` / `git diff`로 현재 변경 범위 파악 (있는 경우)
- 변경된 파일이 어느 baseline 영역에 속하는지 분류 (features, lib/api, app/, etc.)

### 3. 5개 에이전트 **병렬** 호출

> ⛔ **중요**: 5개 Agent 도구 호출은 *반드시 동일 메시지*에 담는다. 순차 호출 금지 — 그러면 토큰·시간 낭비이며 에이전트가 서로의 결과에 오염될 수 있다.

각 에이전트에 동일한 base 프롬프트 + 페르소나별 참조 문서를 전달:

```
다음 구현 계획을 [페르소나명] 관점에서만 리뷰해주세요.
다른 영역(예: UI 리뷰어가 보안 의견 내기)은 절대 다루지 마세요.

## 계획
<plan 본문>

## 변경 컨텍스트
<git status / diff 요약, 있다면>

## 필수 참조 문서 (반드시 읽고 인용할 것)
- <에이전트별 참조 경로>

## 보고 형식 (엄격히 준수)
🚨 높음 (반드시 수정) / ⚠️ 중간 (권장 수정) / 💡 낮음 (선택) / 📌 범위 밖 (언급만)

각 항목:
- 위치: <plan step 번호 또는 file:line>
- 위반: <구체 사실>
- baseline 권장: <어느 패턴이 정답인지>

## 금지 사항
- 추측: "혹시 모르니까" 항목 추가 금지. 근거 있는 것만.
- 범위 외 의견: 페르소나 영역 밖 코멘트 금지.
- CLAUDE.md "외과적 변경"과 충돌하는 권고 금지.
```

### 4. 에이전트별 매핑 (참조 문서)

| subagent_type             | 참조 문서                                                           |
| ------------------------- | ------------------------------------------------------------------- |
| architecture-reviewer     | `.claude/references/architecture/solid-dry-kiss-yagni.md`           |
| coding-standards-reviewer | `CLAUDE.md` (특히 "행동 가이드라인" 1~4절)                          |
| security-reviewer         | `docs/guides/security-headers.md`, `docs/guides/auth-pattern.md`    |
| ui-design-reviewer        | `docs/guides/styling-guide.md`, `docs/guides/component-patterns.md` |
| performance-reviewer      | `docs/guides/nextjs-16.md`                                          |

> 참조 문서가 부재하는 경우(현재 architecture만 채워짐): 에이전트 프롬프트에 "참조 문서 없음 — 일반 baseline 원칙으로 대체" 명시. 추측으로 채워 넣지 않는다.

### 5. 결과 통합

5개 보고서를 받은 후:

1. **충돌 해결 (tiebreaker)** — `CLAUDE.md "🧭 설계 원칙"` 우선순위 적용:

   ```
   안정성 > 유지보수성 > 보안 > 성능
   ```

   - 예: 보안 리뷰어 "X 검증 추가" vs 성능 리뷰어 "X 검증은 핫패스에서 비싸다" → **보안 우선** (3 > 4)
   - 충돌이 있었다는 사실 자체를 사용자에게 표시 (어느 의견이 졌는지 명시)

2. **중복 병합** — 같은 위치(plan step 또는 file:line)에 여러 에이전트가 지적 → 1개 항목으로 합치고 모든 관점 나열
3. **사용자 화면 출력 형식**:

   ```markdown
   ## 🚨 Plan 리뷰 블로커

   - [영역] step N: <위반> → baseline 권장 <...>

   ## ⚠️ 경고

   - ...

   ## 💡 제안

   - ...

   ## 📌 범위 밖 (참고만)

   - ...

   ## ⚖️ 충돌 해결 기록

   - <영역A> vs <영역B>: <쟁점> → <우선원칙> 적용으로 <영역A> 채택

   ## ✅ 통과 영역

   - <에이전트 목록>
   ```

### 6. 사용자 의사결정 대기

- 블로커 있음 → "Plan을 수정하시겠습니까? (수정 후 다시 `/plan-review`)" 질문
- 블로커 없음, 경고만 → "경고 검토 후 구현 진행할까요?" 질문
- **자동으로 다음 단계로 넘어가지 않는다** (CLAUDE.md "Think Before Coding")

---

## 안티 패턴 (이 명령어가 하면 안 되는 것)

- ❌ 5개 호출을 순차(1→2→3→…)로 실행
- ❌ 리뷰 결과를 사용자 승인 없이 적용
- ❌ 5명 모두 통과해도 "추가 의견"을 만들어내기 (LLM hallucination)
- ❌ 참조 문서 부재 시 일반론으로 대체 후 _마치 baseline 표준인 것처럼_ 권고
- ❌ 페르소나 경계 무너뜨리기 (UI 리뷰어가 보안 의견 + 보안 리뷰어가 UI 의견)
- ❌ Plan 자체가 불충분/불명확해도 일단 리뷰 진행 → "Plan이 부족하다"고 사용자에게 알리고 중단

## 비용 가이드

5 에이전트 × Plan 1회 = 단일 PR 기준 1회 호출. **PR 단위로만 사용** 권장 (커밋 단위는 `/code-review-multi`가 담당 — step B 이후 추가 예정).
