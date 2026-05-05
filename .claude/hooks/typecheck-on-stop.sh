#!/bin/bash
# Claude Code Stop 훅 — 변경된 .ts/.tsx가 있으면 typecheck 강제
#
# 세션 종료 시점에 워킹 트리에 변경된 TypeScript 파일(.ts/.tsx)이 있으면
# `npm run typecheck`를 실행해 타입 오류를 잡아냅니다.
#
# 동작:
# - 변경된 .ts/.tsx 없음 → 조용히 종료 (exit 0)
# - typecheck 통과 → 조용히 종료 (exit 0)
# - typecheck 실패 → exit 2 (Claude가 오류를 받아 후속 작업 진행)
#
# 무한 루프 방지: stop_hook_active=true면 즉시 종료
# 참고: PostToolUse가 prettier를 자동 실행하므로 lint는 별도로 강제하지 않음

set -u

INPUT=$(cat)
STOP_ACTIVE=$(printf '%s' "$INPUT" | jq -r '.stop_hook_active // false')

# 이미 Stop 훅이 활성화된 상태면 무한 루프 방지를 위해 종료
if [ "$STOP_ACTIVE" = "true" ]; then
    exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR" || exit 0

# git 저장소가 아니면 조용히 종료
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    exit 0
fi

# 변경된(staged + unstaged + untracked) .ts/.tsx 파일이 있는지 확인
CHANGED_TS=$(git status --porcelain | awk '{print $2}' | grep -E '\.(ts|tsx)$' || true)

if [ -z "$CHANGED_TS" ]; then
    exit 0
fi

# typecheck 실행
TYPECHECK_OUTPUT=$(npm run typecheck --silent 2>&1)
TYPECHECK_EXIT=$?

if [ $TYPECHECK_EXIT -eq 0 ]; then
    exit 0
fi

# 실패 시 stderr로 출력 후 exit 2 (Claude에게 후속 작업 요구)
{
    echo "[stop-hook] typecheck 실패 — TypeScript 오류를 수정하세요."
    echo ""
    echo "$TYPECHECK_OUTPUT"
} >&2

exit 2
