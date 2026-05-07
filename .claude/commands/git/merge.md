---
description: '브랜치를 안전하게 병합하고 충돌을 해결합니다'
argument-hint: '[병합할 브랜치명]'
disable-model-invocation: true
allowed-tools: Bash(git merge *) Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git branch *) Bash(git fetch *) Bash(git pull *) Bash(git checkout *) Bash(git stash *)
---

# /git:merge — 브랜치 병합

## 사용법

```
/git:merge feature/user-auth        # 기본 (프로젝트 정책 기반 전략)
/git:merge --no-ff feature/...      # 병합 커밋 명시 생성
/git:merge --squash feature/...     # squash 병합
```

## 입력

$ARGUMENTS

## Steps

1. `git status`로 working directory 정리 상태 확인
   → 검증: uncommitted 변경사항이 있으면 사용자에게 (a) 커밋 / (b) stash / (c) 중단 선택 요청
2. 인자에서 병합 대상 브랜치명과 전략 옵션 추출
   → 검증: 브랜치 존재 확인 (`git branch --list`)
3. `git fetch origin`으로 최신화 (네트워크 가능 시)
4. `git log --oneline <current>..<target>`로 병합될 커밋 미리보기
5. `git merge` 실행 (전략에 따라 `--ff-only` / `--no-ff` / `--squash`)
   → 검증: 충돌 발생 여부 확인
6. **충돌 발생 시**: `git status`로 충돌 파일 나열 후 사용자에게 보고하고 해결 방향 확인
   → 검증: 모든 충돌 해결 후 `git diff --check`로 잔존 마커 없음 확인 → `git commit`으로 병합 완료
7. 병합 결과(SHA, 변경 통계) 보고

## 병합 전략

- **Fast-forward** (`--ff-only`): 선형 히스토리. 분기 흔적 없음. 단순 변경에 적합.
- **No-fast-forward** (`--no-ff`): 병합 커밋 생성. 기능 단위 추적. 협업 프로젝트 권장.
- **Squash** (`--squash`): 여러 커밋을 1개로 압축. 깔끔한 메인 히스토리.

전략이 명시되지 않으면 프로젝트 정책 또는 fast-forward 가능 여부에 따라 결정 후 사용자 확인.

## 충돌 해결

충돌 파일별로 사용자에게 옵션 제시:

- `ours` — 현재 브랜치 내용 유지
- `theirs` — 병합 대상 브랜치 내용 채택
- `manual` — 수동 편집 (Claude가 양쪽 의도를 분석해 해결안 제시)

## 안전 규칙

- `git merge --abort`는 사용자가 명시 요청 시에만 실행 (진행 중인 병합 폐기)
- `git reset --hard`, force-push 등 destructive 명령은 **사용자 명시 확인 후에만** (CLAUDE.md Git Safety Protocol)
- 보호 브랜치(main / master)로의 병합은 직접 실행하지 말고 PR 경로(`/git:pr`) 안내
- 병합 직전 현재 HEAD SHA를 출력 (필요 시 `git reset --hard <SHA>`로 사용자가 복구 가능)

## 출력

- 병합 결과: 커밋 SHA + 변경 통계 (파일 수, +/- 라인)
- (충돌 발생 시) 해결된 파일 목록과 선택된 전략(`ours`/`theirs`/`manual`) 요약
