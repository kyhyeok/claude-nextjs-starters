#!/bin/bash
# Claude Code PostToolUse 훅 — Edit/Write 후 Prettier 자동 실행
#
# Edit/Write 도구로 변경된 파일이 Prettier가 지원하는 확장자라면
# 자동으로 `npx prettier --write`를 실행합니다.
#
# - 프로젝트 외부 파일은 무시
# - generated / node_modules 등은 .prettierignore가 처리
# - 실패해도 Claude 흐름은 계속 (exit 0)

set -u

# stdin JSON에서 도구명과 파일 경로 추출
INPUT=$(cat)
TOOL_NAME=$(printf '%s' "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty')

# Edit/Write 외에는 무시
case "$TOOL_NAME" in
    Edit|Write|MultiEdit) ;;
    *) exit 0 ;;
esac

# 파일 경로가 없으면 무시
if [ -z "$FILE_PATH" ]; then
    exit 0
fi

# 프로젝트 디렉터리 외부 파일은 무시 (예: ~/.claude/*)
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
case "$FILE_PATH" in
    "$PROJECT_DIR"/*) ;;
    *) exit 0 ;;
esac

# 파일이 실제로 존재해야 함 (삭제된 경우 등 무시)
if [ ! -f "$FILE_PATH" ]; then
    exit 0
fi

# Prettier가 지원하는 확장자만 처리
case "$FILE_PATH" in
    *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.json|*.jsonc|*.md|*.mdx|*.css|*.scss|*.html|*.yaml|*.yml) ;;
    *) exit 0 ;;
esac

# Prettier 실행 (조용히, 실패해도 Stop 흐름에 영향 X)
cd "$PROJECT_DIR" || exit 0
npx --no-install prettier --write --log-level=warn "$FILE_PATH" >&2 2>&1 || true

exit 0
