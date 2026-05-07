---
description: 'GitHub Pull Request를 생성하고 관리합니다'
argument-hint: '[선택: PR 제목]'
disable-model-invocation: true
allowed-tools: Bash(gh pr *) Bash(gh api *) Bash(gh repo view *) Bash(git push *) Bash(git status *) Bash(git log *) Bash(git diff *) Bash(git branch *) Bash(git fetch *)
---

# /git:pr — GitHub Pull Request 생성

## 사용법

```
/git:pr                        # 변경사항 분석 후 제목·본문 자동 초안
/git:pr "사용자 인증 기능 구현"  # 제목 명시
```

## 입력

$ARGUMENTS

## Steps

1. `git status` + `git branch --show-current`로 현재 상태와 브랜치명 확인
   → 검증: 보호 브랜치(main/master)에서 PR 생성 시도 시 거절
2. base 브랜치(보통 `main`) 기준 diff 분석:
   - `git fetch origin`
   - `git log origin/main..HEAD --oneline`
   - `git diff origin/main...HEAD --stat`
     → 검증: 커밋이 0개면 PR 생성 불가 안내
3. 원격 브랜치 동기화 상태 확인 → 필요 시 `git push -u origin <branch>`
   → 검증: push 성공 여부 확인. force push는 절대 자동 실행 X
4. 인자에서 PR 제목 추출 (없으면 커밋 히스토리 + 브랜치명에서 초안 생성)
   → 검증: 제목 70자 미만, 명령형 어조
5. PR 본문 초안 작성 (아래 표준 템플릿)
6. `gh pr create --title "..." --body "$(cat <<'EOF' ... EOF)"`로 생성
   → 검증: 생성된 PR URL 확인 후 사용자에게 보고

## 표준 PR 템플릿

```markdown
## Summary

<1~3줄 요약>

## 주요 변경사항

- <변경 1>
- <변경 2>

## Test plan

- [ ] <확인 항목 1>
- [ ] <확인 항목 2>
```

## 제목 규칙

- 70자 미만 (긴 내용은 본문에)
- 명령형 어조 ("추가" not "추가됨")
- 브랜치 프리픽스 → 커밋 타입 매핑:
  - `feature/...` → `feat: ...`
  - `fix/...` → `fix: ...`
  - `docs/...` → `docs: ...`
  - `refactor/...` → `refactor: ...`

## 안전 규칙

- `git push --force` / `--force-with-lease`는 사용자 명시 요청 시에만 실행 (CLAUDE.md Git Safety Protocol)
- main / master로의 force push는 사용자가 명시해도 한 번 더 경고
- PR 본문에 시크릿(.env, 토큰, 키)이 우연히 포함되지 않았는지 diff 확인
- Draft 여부, 라벨, 리뷰어, 마일스톤 등 메타데이터는 사용자가 명시 요청 시에만 추가 (자동 할당 X)
- `gh pr merge` 실행 절대 금지 (병합은 GitHub UI 또는 별도 명시 요청)

## 출력

- 생성된 PR URL
- 제목 + Summary 첫 줄
- 변경 통계 (파일 수, +/- 라인)
