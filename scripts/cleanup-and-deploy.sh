#!/usr/bin/env bash
# ._ 파일 삭제 후 GitHub 푸시 및 Vercel 배포
#
# 사용법:
#   ./scripts/cleanup-and-deploy.sh
#   npm run cleanup:deploy

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DRY_RUN=false
SKIP_GIT=false
SKIP_VERCEL=false
INCLUDE_NODE_MODULES=false
COMMIT_MESSAGE="chore: remove AppleDouble metadata files (._*)"

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --skip-git) SKIP_GIT=true ;;
    --skip-vercel) SKIP_VERCEL=true ;;
    --include-node-modules) INCLUDE_NODE_MODULES=true ;;
    -h|--help)
      cat <<'EOF'
Usage: cleanup-and-deploy.sh [options]

Options:
  --dry-run               삭제 대상만 출력 (실제 삭제/배포 안 함)
  --skip-git              Git 커밋·푸시 건너뛰기
  --skip-vercel           Vercel 배포 건너뛰기
  --include-node-modules  node_modules 내부 ._ 파일도 삭제
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

log() { printf '%s\n' "$*"; }

CLEANUP_ARGS=()
[[ "$DRY_RUN" == true ]] && CLEANUP_ARGS+=(--dry-run)
[[ "$INCLUDE_NODE_MODULES" == true ]] && CLEANUP_ARGS+=(--include-node-modules)

git_sync() {
  if [[ "$SKIP_GIT" == true ]]; then
    log "⏭️  Git 동기화 건너뜀"
    return
  fi

  if [[ "$DRY_RUN" == true ]]; then
    log "[dry-run] git add / commit / push 건너뜀"
    return
  fi

  if ! git rev-parse --git-dir >/dev/null 2>&1; then
    log "⚠️  Git 저장소가 아닙니다. Git 동기화를 건너뜁니다."
    return
  fi

  local branch
  branch="$(git rev-parse --abbrev-ref HEAD)"

  while IFS= read -r tracked; do
    [[ -z "$tracked" ]] && continue
    git rm -r --cached --ignore-unmatch "$tracked" >/dev/null 2>&1 || true
  done < <(git ls-files '**/._*' '._*' 2>/dev/null || true)

  git add -A

  if git diff --cached --quiet; then
    log "ℹ️  커밋할 변경 사항이 없습니다."
  else
    git commit -m "$COMMIT_MESSAGE"
    log "✅ Git 커밋 완료"
  fi

  if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
    git push origin "$branch"
    log "✅ GitHub 푸시 완료 (origin/$branch)"
  else
    log "⚠️  upstream 브랜치가 없습니다. 수동으로 push 해 주세요:"
    log "    git push -u origin $branch"
  fi
}

vercel_deploy() {
  if [[ "$SKIP_VERCEL" == true ]]; then
    log "⏭️  Vercel 배포 건너뜀"
    return
  fi

  if [[ "$DRY_RUN" == true ]]; then
    log "[dry-run] vercel deploy 건너뜀"
    return
  fi

  log "🚀 Vercel 배포 중..."

  if npx --yes vercel@latest deploy --prod --yes; then
    log "✅ Vercel 프로덕션 배포 완료"
  else
    log "⚠️  Vercel CLI 배포 실패."
    log "   GitHub 연동이 되어 있다면 git push만으로도 자동 배포됩니다."
    log "   수동 배포: npx vercel deploy --prod"
  fi
}

main() {
  log "📁 프로젝트: $ROOT"
  bash "$ROOT/scripts/cleanup-dot-underscore.sh" "${CLEANUP_ARGS[@]}"
  git_sync
  vercel_deploy
  log "🎉 완료!"
}

main
