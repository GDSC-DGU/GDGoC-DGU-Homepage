# 머지 규칙

PR이 어떤 조건을 만족해야 머지되는지, 누가 어떤 방식으로 머지하는지 정리합니다. **강제**는 레포 설정(ruleset, CI)이 막는 규칙이고, **약속**은 팀원이 지키는 규칙입니다. 설정값은 [레포 설정](./repo-settings.md)에 있습니다.

## 1. 대상 브랜치별 머지 조건

| 조건 | → `develop` | → `main` |
|---|---|---|
| PR 필수 (직접 push 금지) | ✅ | ✅ |
| 승인 수 | **0명** (필수 아님) | **0명** (필수 아님) |
| production 배포 승인 | — | **Lead** (Environment 승인으로 강제) |
| 필수 체크 | `pr-title` | `pr-title` |
| 브랜치 최신화 필요 | ❌ | ✅ |
| 모든 리뷰 코멘트 해결 | ✅ | ✅ |
| 허용 머지 방식 | **Squash만** | **Merge commit만** |
| force push · 브랜치 삭제 | 금지 | 금지 |
| 머지하는 사람 | PR 작성자 | Lead (약속) |

## 2. 릴리스 (develop → main)

1. Lead가 develop → main PR을 엽니다. 제목은 `release: YYYY-MM-DD`입니다.
2. PR 템플릿 하단의 "릴리스 PR" 체크리스트를 채웁니다. 특히 staging에서 주요 흐름을 확인합니다.
3. Lead가 **Create a merge commit**으로 머지합니다.
4. main 푸시로 production 배포 워크플로우가 시작되고, `production` 환경 승인 대기 상태가 됩니다. Lead가 승인하면 배포됩니다.
5. 배포 후 GitHub Release를 만들고 "Generate release notes"로 변경 목록을 남깁니다. 태그는 `vYYYY.MM.DD`입니다.

릴리스 주기는 고정하지 않습니다. 기능 묶음이 staging에서 확인되면 릴리스합니다. 단, **지원 기간 중에는 지원서 관련 변경을 릴리스하지 않습니다.** (약속)

## 3. 핫픽스 (production 긴급 수정)

```
main ──● hotfix/61-login-cookie-domain ──PR──▶ main ──back-merge PR──▶ develop
```

1. `main`에서 `hotfix/<ID>-<짧은-설명>` 브랜치를 만듭니다. ID 규칙은 [작업 규칙](./contributing.md#2-브랜치-명명-규칙)을 따릅니다.
2. `main`으로 PR을 엽니다. Lead가 merge commit으로 머지하고, `production` 환경 승인 후 배포됩니다.
3. main → develop **back-merge PR**을 엽니다. `back-merge` 워크플로우가 자동으로 열고, 자동으로 열리지 않으면 Lead가 직접 엽니다.
4. **Lead가 back-merge PR을 "Create a merge commit"으로 머지합니다.** develop은 squash만 허용하므로 Lead의 우회 권한(bypass)으로 머지합니다.

back-merge 전에는 main의 최신화 조건 때문에 다음 릴리스 PR을 머지할 수 없습니다.

## 4. 규칙 우회 (bypass)

- 우회 권한은 **Repository admin 역할**에만 있고, 모드는 **"PR에서만(For pull requests only)"**입니다. 레포의 Admin 권한은 `homepage-lead-pm` 팀(Lead, PM)에만 있으므로 우회할 수 있는 사람은 이 두 명입니다. 이들도 보호 브랜치에 직접 push할 수 없고, PR 머지 시점에만 규칙을 건너뛸 수 있습니다.
- Organization Owner는 레포 권한과 관계없이 Admin으로 취급되어 우회 권한을 함께 갖습니다.
- 우회는 back-merge 머지와, CI 장애로 체크가 돌지 않는 긴급 상황에만 씁니다.
- 우회 기록은 Settings → Rules → Insights에 남습니다. 긴급 우회 후에는 팀 채널에 사유를 공유합니다. (약속)
