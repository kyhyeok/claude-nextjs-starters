---
description: '이모지와 컨벤셔널 커밋 메시지로 잘 포맷된 커밋을 생성합니다'
argument-hint: '[선택: 커밋 메시지 힌트]'
disable-model-invocation: true
allowed-tools: Bash(git add *) Bash(git status *) Bash(git commit *) Bash(git diff *) Bash(git log *)
---

# /git:commit — 이모지 컨벤셔널 커밋 생성

## 사용법

```
/git:commit                        # 스테이지된 변경사항을 분석해 커밋
/git:commit "로그인 버그 수정"       # 메시지 방향 힌트 전달
```

## 입력

$ARGUMENTS

## Steps

1. `git status`로 스테이지 상태 확인
   → 검증: 스테이지된 파일이 있으면 그 파일만 커밋, 없으면 사용자에게 무엇을 스테이지할지 확인
2. `git diff --cached` (또는 `git diff`)로 변경사항 분석
   → 검증: 단일 논리 변경인지 확인. 여러 관심사가 섞였으면 분할 제안
3. 최근 커밋 메시지 스타일 확인 (`git log -10 --oneline`)
   → 검증: 프로젝트 컨벤션 추론
4. 이모지 컨벤셔널 포맷으로 메시지 작성: `<이모지> <타입>: <한국어 설명>`
5. `git commit -m "<메시지>"` 실행
   → 검증: pre-commit hook 통과 여부 확인. 실패 시 원인 분석 후 수정하여 **새 커밋** 생성 (--amend 사용 X)

## 커밋 포맷

`<이모지> <타입>: <설명>`

**타입:**

- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서화
- `style`: 포맷팅
- `refactor`: 코드 리팩토링
- `perf`: 성능 개선
- `test`: 테스트
- `chore`: 빌드/도구

**규칙:**

- 명령형 어조 ("추가" not "추가됨")
- 첫 줄 72자 미만
- 원자적 커밋 (단일 목적)
- 관련 없는 변경사항은 분할

## 분할 기준

다른 관심사 / 혼합된 타입 / 파일 패턴 / 큰 변경사항이면 사용자에게 분할 제안.

## 안전 규칙

- 시크릿(.env, credentials.json 등)이 staged면 커밋 전 사용자에게 경고
- pre-commit hook 실패 시 `--no-verify`로 우회 금지 — 원인을 고치고 새 커밋
- `git commit --amend`는 사용자가 명시 요청 시에만 (이전 커밋 수정 위험)

## 출력

생성된 커밋의 SHA + 메시지를 한 줄로 보고.

## 참고

- **커밋에 Claude 서명 절대 추가하지 않음**
