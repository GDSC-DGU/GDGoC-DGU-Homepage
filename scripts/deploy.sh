#!/usr/bin/env bash
# 현재 브랜치에 따라 staging 배포(develop) 또는 로컬 실행(그 외)을 합니다.
# 자세한 규칙은 RULEBOOKS/local-and-deploy.md 3번을 봅니다.
set -euo pipefail

WORKFLOW="deploy-staging.yml"
ONLY=""
DRY_RUN=0
YES=0
DOWN=0

usage() {
  cat <<'USAGE'
사용법: scripts/deploy.sh [옵션]

  develop 브랜치  deploy-staging.yml 을 실행해 staging(dev)에 배포합니다.
  main 브랜치     실행을 거부합니다. (production 은 릴리스 PR 머지 후 Lead 승인)
  그 외 브랜치    로컬 전체 실행 (아직 구현되지 않음)

옵션:
  --only a,b      일부만 배포 (backend, ai, frontend 중에서. 기본: backend,ai)
  --dry-run       실제로 실행하지 않고 할 일만 출력
  -y, --yes       확인 질문 생략
  --down          (로컬) 띄운 컨테이너 종료 (아직 구현되지 않음)
  -h, --help      이 도움말
USAGE
}

die() {
  echo "오류: $*" >&2
  exit 1
}

confirm() {
  [ "$YES" -eq 1 ] && return 0
  printf '%s [y/N] ' "$1"
  read -r answer || answer=""
  case "$answer" in
    y | Y | yes | YES) return 0 ;;
    *)
      echo "취소했습니다."
      exit 1
      ;;
  esac
}

while [ $# -gt 0 ]; do
  case "$1" in
    --only)
      [ $# -ge 2 ] || die "--only 에 값이 필요합니다."
      ONLY="$2"
      shift 2
      ;;
    --only=*)
      ONLY="${1#--only=}"
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -y | --yes)
      YES=1
      shift
      ;;
    --down)
      DOWN=1
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      die "알 수 없는 옵션: $1"
      ;;
  esac
done

# --only 검증
if [ -n "$ONLY" ]; then
  for name in $(echo "$ONLY" | tr ',' ' '); do
    case "$name" in
      backend | ai | frontend) ;;
      *) die "알 수 없는 대상: $name (backend, ai, frontend 중에서 고르세요)" ;;
    esac
  done
fi

git rev-parse --git-dir > /dev/null 2>&1 || die "git 저장소 안에서 실행하세요."
branch="$(git symbolic-ref --short -q HEAD || true)"

if [ -z "$branch" ]; then
  die "detached HEAD 상태입니다. 브랜치를 체크아웃한 뒤 다시 실행하세요. (예: git switch develop)"
fi

if [ "$branch" = "main" ]; then
  die "main 에서는 실행할 수 없습니다. production 은 릴리스 PR 머지 후 Lead 승인으로만 배포됩니다."
fi

if [ "$branch" != "develop" ]; then
  echo "로컬 전체 실행(docker compose + frontend 개발 서버)은 아직 준비되지 않았습니다. (현재 브랜치: $branch)" >&2
  if [ "$DOWN" -eq 1 ]; then
    echo "--down 도 아직 구현되지 않았습니다." >&2
  fi
  exit 1
fi

if [ "$DOWN" -eq 1 ]; then
  die "--down 은 로컬 실행용 옵션입니다. develop 에서는 쓸 수 없습니다."
fi

# ---- develop: staging 배포 ----

command -v gh > /dev/null 2>&1 || die "gh(GitHub CLI)가 설치돼 있지 않습니다. https://cli.github.com"
gh auth status > /dev/null 2>&1 || die "gh 로그인이 필요합니다. (gh auth login)"

git fetch origin develop --quiet || die "git fetch origin develop 에 실패했습니다."

local_sha="$(git rev-parse develop)"
remote_sha="$(git rev-parse origin/develop)"
ahead=0
behind=0
if [ "$local_sha" != "$remote_sha" ]; then
  ahead="$(git rev-list --count origin/develop..develop)"
  behind="$(git rev-list --count develop..origin/develop)"
fi

if [ "$behind" -gt 0 ]; then
  die "로컬 develop 이 origin/develop 보다 ${behind}커밋 뒤처졌습니다. git pull 한 뒤 다시 실행하세요."
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "경고: 커밋하지 않은 변경이 있습니다. 배포에 포함되지 않습니다."
fi

target="${ONLY:-backend,ai}"
echo "배포 대상 커밋: $(git log -1 --format='%h %s' origin/develop)"
echo "배포 대상 서비스: $target"
echo "환경: staging (dev.gdgoc-dgu.com)"

if [ "$ahead" -gt 0 ]; then
  echo "경고: 로컬 develop 이 push 하지 않은 커밋 ${ahead}개 앞서 있습니다. 배포되는 것은 origin/develop입니다."
fi

if [ "$DRY_RUN" -eq 1 ]; then
  echo "[dry-run] gh workflow run $WORKFLOW --ref develop -f only=$target"
  exit 0
fi

confirm "위 내용으로 staging 에 배포할까요?"

started="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
gh workflow run "$WORKFLOW" --ref develop -f "only=$target"

# 방금 만든 실행을 찾습니다. (dispatch 이후 생성된 run 만 인정)
run_id=""
i=0
while [ "$i" -lt 30 ]; do
  i=$((i + 1))
  sleep 3
  run_id="$(gh run list --workflow "$WORKFLOW" --branch develop --event workflow_dispatch --limit 5 \
    --json databaseId,createdAt \
    --jq "[.[] | select(.createdAt >= \"$started\")] | sort_by(.createdAt) | last | .databaseId // empty" 2> /dev/null || true)"
  if [ -n "$run_id" ]; then
    break
  fi
done
[ -n "$run_id" ] || die "실행된 workflow 를 찾지 못했습니다. GitHub 의 Actions 탭에서 확인하세요."

echo "실행: $(gh run view "$run_id" --json url --jq .url)"
gh run watch "$run_id" --exit-status
