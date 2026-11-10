# infra

Firestore rules·indexes와 Cloud Storage 설정을 담습니다.

| 항목 | 내용 |
|---|---|
| 담당 팀 | Homepage-Lead/PM (`homepage-lead-pm`) · Homepage-BE (`homepage-be`) 공동 |
| PR 영역 라벨 | `area:infra` |
| 스택 · 도구 | Firebase (Firestore, Cloud Storage) |
| 배포 | develop · main의 `infra/**` 변경 시 `deploy-infra.yml`이 staging / production에 반영합니다 |

## 지킬 것

- Firestore 쿼리를 추가하면 `infra/firebase/firestore.indexes.json`도 함께 고칩니다.
- 서비스 계정 키(JSON), 토큰, 실제 지원자·회원 정보를 넣지 않습니다. GCP 인증은 Workload Identity Federation으로 합니다.

## 관련 문서

- [실행 · 배포](../RULEBOOKS/local-and-deploy.md)
- [레포 설정](../RULEBOOKS/repo-settings.md)
- [머지 규칙](../RULEBOOKS/merge-rules.md)
