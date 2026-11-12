<!--
PR 제목 = squash 후 develop에 남는 커밋 메시지입니다. 규칙을 지키지 않으면 CI가 실패합니다.
  형식: <type>(<scope>): <요약>
  예시: feat(frontend): Teams 게시글 작성 기능 추가
        design(frontend): Teams 목록 카드 스타일 Figma 반영
        fix(backend): 지원서 중복 제출 검사 누락 수정
        feat(backend)!: 지원서 응답에 status 필드 필수화
릴리스 PR(develop → main)은 아래 본문을 지우고 "릴리스 PR" 섹션만 채웁니다.
-->

## 관련 이슈
<!-- 이슈가 있으면 번호를 적고, 없으면 아래 줄을 지웁니다 -->
Closes #

## 기능 ID
<!-- 노션 기능 명세서 ID. 기능 작업이 아니면 '-' -->

## 변경 내용
<!-- 무엇을 바꿨는지 2~5줄. 리뷰어가 diff를 열기 전에 큰 그림을 잡을 수 있게 씁니다. -->

## 변경 영역
- [ ] frontend
- [ ] backend
- [ ] ai
- [ ] infra
- [ ] ci / repo 설정

## 스크린샷 · 동작 영상
<!-- UI 변경이 있으면 전/후. 개인정보가 보이지 않게 가립니다. -->

## 디자인 확인 (design/ 브랜치 또는 UI 변경 시)
- Figma 링크: 
- Vercel 프리뷰 링크: <!-- PR 댓글에 생성된 프리뷰 주소 -->
- [ ] 모바일 / 태블릿 / 데스크톱 확인
- [ ] 다크모드 확인

## 확인 방법
<!-- 리뷰어가 직접 확인하는 순서. 예: Vercel 프리뷰에서 /teams/new 접속 → ... -->
<!-- 로그인이 필요한 기능은 PR 프리뷰에서 확인할 수 없습니다(승인 도메인 제한). 로컬(./scripts/deploy.sh, 에뮬레이터 로그인)이나 develop 머지 후 deploy.sh로 올린 staging에서 확인합니다. -->

## 셀프 체크
- [ ] PR 제목이 커밋 규칙을 따른다
- [ ] 머지 전 diff를 처음부터 끝까지 직접 읽었다
- [ ] 시크릿, 개인정보, 실제 운영 데이터, 채점 루브릭 본문이 포함되지 않았다
- [ ] 환경변수를 추가했다면 `.env.example`과 README를 갱신했다
- [ ] Firestore 쿼리를 추가했다면 `infra/firebase/firestore.indexes.json`을 갱신했다
- [ ] backend·ai: controller/router에 업무 로직·DB 접근이 없다
- [ ] 테스트를 추가했거나, 추가하지 않은 이유를 아래에 적었다

## 리뷰어에게
<!-- 특히 봐줬으면 하는 부분, 고민한 대안, 이 PR에서 일부러 하지 않은 것 -->

---

<!--
## 릴리스 PR (develop → main 전용)
제목: release: YYYY-MM-DD

### 포함된 변경
(develop에 쌓인 PR 목록. GitHub "Generate release notes" 결과를 붙여도 됩니다.)

### 배포 전 확인
- [ ] staging(dev.gdgoc-dgu.com)에서 주요 흐름 확인: 로그인, 지원서 제출, 관리자 페이지
- [ ] 이번 릴리스에 Firestore 인덱스·rules 변경이 있는지 확인
- [ ] 새 환경변수·시크릿이 production 환경에 등록됐는지 확인
- [ ] 지원 기간이면 Cloud Run min-instances 설정 확인
-->
