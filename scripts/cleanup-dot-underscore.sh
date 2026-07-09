#!/usr/bin/env bash
# macOS AppleDouble(._*) 파일/폴더 삭제
#
# 사용법:
#   ./scripts/cleanup-dot-underscore.sh
#   ./scripts/cleanup-dot-underscore.sh --dry-run
#   npm run cleanup

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DRY_RUN=false
INCLUDE_NODE_MODULES=false
QUIET=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --include-node-modules) INCLUDE_NODE_MODULES=true ;;
    --quiet) QUIET=true ;;
    -h|--help)
      cat <<'EOF'
Usage: cleanup-dot-underscore.sh [options]

Options:
  --dry-run               삭제 대상만 출력
  --include-node-modules  node_modules 내부도 정리
  --quiet                 삭제 로그 최소화
  -h, --help              도움말 표시
EOF
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

export COPYFILE_DISABLE=1
export COPYFILE_DONT_USE_FSCP=1

log() {
  if [[ "$QUIET" == false ]]; then
    printf '%s\n' "$*"
  fi
}

FIND_ARGS=("$ROOT")
if [[ "$INCLUDE_NODE_MODULES" == false ]]; then
  FIND_ARGS+=(-path "$ROOT/node_modules" -prune -o -name '._*' -print0)
else
  FIND_ARGS+=(-name '._*' -print0)
fi

count=0
while IFS= read -r -d '' path; do
  if [[ "$DRY_RUN" == true ]]; then
    log "  [dry-run] $path"
  else
    rm -rf "$path"
    log "  deleted: $path"
  fi
  count=$((count + 1))
done < <(find "${FIND_ARGS[@]}")

if [[ "$QUIET" == false ]]; then
  if [[ "$count" -eq 0 ]]; then
    log "✅ 삭제할 ._ 파일이 없습니다."
  else
    log "✅ ${count}개 ._ 항목 처리 완료."
  fi
fi
