---
description: '브랜치 생성, 전환, 삭제 등 브랜치 관리 작업을 수행합니다'
argument-hint: '[브랜치명, 예: feature/user-auth]'
disable-model-invocation: true
allowed-tools: Bash(git branch *) Bash(git checkout *) Bash(git switch *) Bash(git status *) Bash(git stash *) Bash(git log *) Bash(git fetch *)
---

# /git:branch — 브랜치 생성·전환·관리

## 사용법

```
/git:branch feature/user-auth    # 새 브랜치 생성 후 전환
/git:branch                      # 현재 상태와 브랜치 목록 보고 후 사용자 선택
```

## 입력

$ARGUMENTS

## Steps

1. `git status`로 uncommitted 변경사항 확인
   → 검증: 변경사항이 있으면 사용자에게 (a) 커밋 / (b) stash / (c) 그대로 진행 중 선택 요청
2. 인자가 비어있으면 `git branch -vv`로 로컬 브랜치 목록 + 현재 브랜치 보고 후 종료
3. 인자가 있으면 브랜치명 검증 (네이밍 규칙)
   → 검증: 위반 시 자동 제안 후 사용자 확인
4. `git fetch origin`으로 최신 상태 가져오기 (네트워크 가능 시)
5. base 브랜치(`main` 또는 `develop`) 기준 새 브랜치 생성 + 전환: `git switch -c <name>`
   → 검증: `git status`로 전환 성공 확인

## 브랜치 네이밍 규칙

**프리픽스:**

- `feature/` — 새 기능
- `fix/` — 버그 수정
- `hotfix/` — 긴급 수정
- `docs/` — 문서
- `chore/` — 빌드·설정·유지보수
- `refactor/` — 리팩토링
- `test/` — 테스트

**예시:**

```
✅ feature/user-authentication
✅ fix/login-validation-error
✅ hotfix/security-patch

❌ feature-user-auth      # 슬래시 없음
❌ FEATURE/USER-AUTH      # 대문자
❌ feature/user auth      # 공백
❌ temp                   # 불명확
```

## 안전 규칙

- 브랜치 삭제(`git branch -d` / `-D`)는 사용자가 명시 요청 시에만 실행
- `-D`(force delete)는 미병합 브랜치를 잃을 수 있어 더블 확인
- 현재 체크아웃된 브랜치는 삭제 불가 — 먼저 다른 브랜치로 전환 안내
- main / master / develop 등 보호 브랜치 삭제 요청 시 거절

## 출력

- 생성·전환된 브랜치명
- (stash 했다면) stash 식별자 — 나중에 `git stash pop` 안내
