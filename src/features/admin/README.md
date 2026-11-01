# 관리자 화면 (/admin) — 2단계가 알아야 할 약속 · 부품 쓰는 법

구조 · 데이터 · API 붙이는 법 · 권한 표는 [`docs/ADMIN.md`](../../../docs/ADMIN.md). 여기는 **만들 때 옆에 펴 두는 쪽지**입니다.

## 1. 내 폴더만 고친다

| 담당 | 고치는 곳 |
|---|---|
| 게시판 · 프로젝트 · 콘텐츠 | `boards/` `projects/` `contents/` + `data/boards/` `data/projects/` `data/contents/` |
| 사용자 | `users/` + `data/users/` |
| 모집 | `recruit/` + `data/recruit/` |
| 기초 (고치지 않음) | `ui/` `shell/` `auth/` `dashboard/` `data/common/` `data/*.ts` `screens.ts` `routes.tsx` `AdminRoot.tsx` |

공통 부품에 바랄 점은 고치지 말고 자기 폴더에 `NOTES.md` 로 적어 주세요. 자기 폴더 안에서 부품을 감싸 쓰는 것은 자유입니다.

## 2. 구역 폴더 약속

- `<구역>/index.ts` 가 **페이지 컴포넌트를 아래 이름 그대로** 내보냅니다. 주소 · 이름은 `screens.ts` 가 정하고 `routes.tsx` 가 연결합니다.

  | 폴더 | 내보낼 이름 → 주소 |
  |---|---|
  | `boards` | `TeamsBoardPage` /admin/boards/teams · `CommunityBoardPage` /admin/boards/community · `CommunityWritePage` /admin/boards/community/write |
  | `projects` | `ProjectListPage` /admin/projects · `ProjectWritePage` /admin/projects/write (수정은 `?id=`) |
  | `contents` | `ContentsPage` /admin/contents |
  | `users` | `UsersPage` /admin/users · `UserHistoryPage` /admin/users/history |
  | `recruit` | `RecruitFormPage` /admin/recruit/form · `RecruitCriteriaPage` …/form/criteria · `ApplicantsPage` …/applicants · `ApplicantDetailPage` …/applicants/:applicantId · `MailTemplatesPage` /admin/recruit/templates |

- 지금은 `<ScreenPlaceholder screenId="P-…" />`('이 화면은 만드는 중')입니다. 채우면 지우고 `PageHeader` 로 시작합니다.
- 팝업(P-AMB-02 등)은 주소가 없으니 그 페이지 안의 부품으로 자기 폴더에 둡니다.
- 링크는 `adminPath` 로: `adminPath.applicant(id)` · `adminPath.projectWrite(id)` (`screens.ts`).
- 대시보드는 게시판 관리로 `?post=<id>` · `?comment=<id>` 를 붙여 보냅니다. 받아서 그 행을 강조하면 좋습니다 (선택).

## 3. 데이터: store · seed · repo

```ts
import { useQuery, useMutation } from '@tanstack/react-query'
import { adminKeys, errorMessage, useAdminRepos } from '@/features/admin/data'

const repos = useAdminRepos()
const posts = useQuery({ queryKey: adminKeys.section('boards', 'posts', board, query), queryFn: () => repos.boards.listPosts(board, query) })
const remove = useMutation({ mutationFn: (ids: string[]) => repos.boards.deletePosts(board, ids) })
```

- 화면은 **repos 만** 씁니다 (store 를 직접 읽지 않기: 서버로 바꿔도 화면 코드가 그대로이도록).
- 저장 · 삭제가 store 를 바꾸면 `['admin']` 쿼리가 **저절로 다시 불립니다**. mutation 뒤 invalidate 는 필요 없습니다.
- 쿼리 key 는 꼭 `adminKeys.section(…)` 으로 (`'admin'` 으로 시작해야 위 자동 갱신 · '처음으로'가 먹습니다).
- 구역 파일 네 개: `data/<구역>/types.ts`(명세 API 모양) · `seed.ts`(예시 데이터) · `repository.ts`(인터페이스 = API 한 줄씩) · `mockRepository.ts`(예시 구현).
  - mock 은 `respond(() => …)` 로 감쌉니다 (200–400ms 지연 + 복사본). 쓰기 전에 `requireActor(ctx)` (누가 했는지 기록에 씀).
  - 자기 slice 만: `ctx.store.get('users')` · `ctx.store.set('users', (s) => …)`. 다른 구역은 읽기만.
  - 실패는 `throw new AdminRepoError('CONFLICT', '명세 안내 문구')` → 화면은 `errorMessage(e)`. 칸별 오류는 `{ fields: { email: '…' } }`.
  - 모집 mock 은 읽기 · 임시 저장 · 게시 · 템플릿 읽기만 채웠고 나머지는 `notReady('F-ARC-…')` 입니다.
- seed 모양(필드)을 바꾸면 그 seed.ts 의 `*_SEED_VERSION` 을 1 올립니다 (탭에 남은 옛 데이터가 그 구역만 새 seed 로 바뀜).
- 예시 이름 규칙: `운영진A` · `예시 멤버 01` · `예시 지원자 01`, 학번 `2026000101`, 이메일 `@example.com`, 내용에 '예시'. `screens.test.ts` 가 확인합니다.
- `data/users/seed.ts` 맨 앞의 예시 관리자 계정(`ADMIN_ACCOUNT_SEED`)은 지우지 마세요 (로그인이 깨집니다).
- 서버 일(메일 발송 · 업로드 · AI 채점)은 흉내만: 진행 표시 → 결과. 실제 네트워크 요청 금지. 업로드는 `repos.uploads.upload(file, 'projectThumbnail')` (object URL).

## 4. 권한

```ts
import { useAdminActor } from '@/features/admin/auth/authContext'
import { canEditUser, canUnlockApplicantResult } from '@/features/admin/data'

const actor = useAdminActor()                 // { id, role: 'Lead' | 'Core' }
const d = canEditUser(actor, user)            // { allowed: true } | { allowed: false, reason: 'Core 계정은 …' }
<Button variant="secondary" size="xs" disabledReason={d.allowed ? undefined : d.reason}>수정</Button>
```

- 막힌 버튼은 숨기지 말고 `disabledReason` (명세: 'Core에게는 버튼 비활성'). 초점이 닿고 이유를 읽습니다. 메뉴째 숨기는 것은 `AREA_ACCESS` (기초 담당).
- mock 도 같은 함수로 한 번 더 막습니다 (서버처럼): `if (!d.allowed) throw new AdminRepoError('FORBIDDEN', d.reason)`.

## 5. 부품 (`@/features/admin/ui`)

```tsx
import { Button, DataTable, Dialog, PageHeader, useConfirm, useToast } from '@/features/admin/ui'
```

**페이지 머리 · 판**
```tsx
<PageHeader title="사용자 관리" description="…" actions={<Button onClick={openAdd}>사용자 추가</Button>} />   // h1 + 탭 제목
<PageHeader back={{ to: adminPath.users, label: '사용자 관리' }} title="사용자 변경 이력" />
<Panel title="홈 소개 이미지" description="마지막 변경 운영진A · 10.31 14:00" actions={…}>…</Panel>   // 영역 묶음 (h2)
```

**버튼** — 주 버튼(primary)은 한 화면에 하나. `size`: `lg` 52 · `md` 40(기본) · `xs` 32(표 안, 사이 8px)
```tsx
<Button busy={saving} type="submit">저장</Button>
<Button variant="secondary" size="xs">수정</Button>
<Button variant="danger">삭제</Button>          // 확인 팝업의 되돌리기 어려운 행동에만
<ButtonLink to={adminPath.communityWrite}>글쓰기</ButtonLink>
```

**툴바 · 표 · 페이지**
```tsx
<Toolbar
  start={<><FilterTabs label="분류" options={[{ value: 'all', label: '전체', count: 24 }, …]} value={cat} onChange={setCat} />
          <SearchBox label="게시글 검색" placeholder="제목 · 내용 · 작성자" value={q} onSearch={setQ} /></>}
  end={<SelectField hideLabel label="정렬" options={…} value={sort} onChange={…} />}
/>
<TotalCount total={data?.total ?? 0} searching={!!q} />
<BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
  <Button variant="secondary" size="xs" onClick={removeSelected}>선택 삭제</Button>
</BulkBar>
<DataTable caption="Teams 게시글" rows={data?.items} rowKey={(r) => r.id} loading={isFetching} error={isError && errorMessage(error)}
  empty={q ? '검색 결과가 없습니다.' : '게시글이 없습니다.'}
  rowTone={(r) => (r.byAdmin ? 'shaded' : undefined)}                       // 음영 + 행 안에 '운영진' 글자도
  selection={{ selected, onChange: setSelected, label: (r) => `${r.title} 선택` }}
  sort={sort} onSortChange={setSort}
  columns={[{ key: 'no', header: '번호', cell: (r) => r.no, width: '72px', align: 'end' },
            { key: 'title', header: '제목', cell: (r) => r.title, rowHeader: true },
            { key: 'actions', header: '관리', hideHeader: true, cell: (r) => <Button variant="secondary" size="xs" aria-label={`${r.title} 삭제`}>삭제</Button> }]} />
<Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} label="게시글 목록 페이지" />
```
- 표는 넓으면 자기 상자 안에서만 가로로 넘어갑니다 (`minWidth`, 기본 720). 페이지 전체 가로 넘침은 0 이어야 합니다.
- 행을 눌러 이동(P-ARC-02)은 이름 칸에 진짜 `<Link>` 를 둡니다 (행 전체 onClick 만으로는 키보드가 못 갑니다).
- 같은 행의 버튼은 `aria-label` 에 무엇의 버튼인지 ('예시 멤버 01 수정').

**팝업 · 확인 · 토스트**
```tsx
<Dialog open={open} onClose={close} title="리뷰 추가" size="md" onSubmit={save}
  footer={<><Button variant="secondary" onClick={close}>취소</Button><Button type="submit" busy={saving}>저장</Button></>}>
  …폼…
</Dialog>
const confirm = useConfirm()
if (!(await confirm(deleteConfirm('게시글', ids.length, '삭제한 게시글은 홈페이지 목록에서 사라집니다.')))) return
toast.success(doneMessage('게시글', ids.length, '삭제'))   // '게시글 3개를 삭제했습니다.'
toast.error(errorMessage(e))
```
- `<dialog>` + showModal: 초점 가두기 · Esc · 닫으면 연 버튼으로 초점. 배경 클릭으로 닫지 않습니다. 닫을 수 없는 팝업은 `dismissible={false}`.
- **팝업 안 오류는 팝업 안 글로** (팝업이 열린 동안 바깥 토스트는 화면 읽기가 못 읽습니다).
- 확인 문구 규칙 (`ui/confirmText.ts`): 제목은 '~할까요?', 본문은 생기는 일 한두 문장, 확인 버튼은 동사('삭제'), 취소는 '취소'. 단위: 개 · 명 · 건 · 장.

**폼** — label · 도움말 · 오류가 입력 칸에 이어집니다. 제출 때 `focusFirstInvalid(formEl)`.
```tsx
<TextField label="제목" required value={title} onChange={…} error={errors.title} limit={60} help="60자 이내" />
<TextArea label="후기" required limit={200} … />
<SelectField label="기수" placeholder="기수 선택" options={[{ value: '4', label: '4기' }]} … />
<Checkbox label="공개" description="끄면 홈에서 바로 숨깁니다." checked={isPublic} onChange={…} />
<RadioGroup legend="관리 유형" name="type" options={[{ value: 'General', label: 'General' }, …]} value={type} onChange={setType} />
<DateTimeField kind="datetime-local" stepMinutes={10} label="면접 일시" help="10분 단위 · 한국 시간" … />
<FileDrop label="썸네일" required rule={FILE_RULES.projectThumbnail} value={thumb} busy={uploading} onSelect={upload} onClear={() => setThumb(null)} />
```

**그 밖**
```tsx
<StatusBadge tone="danger">발송 실패</StatusBadge>       // success · danger · warning · pending · locked · muted · neutral (글자 + 모양)
<Tabs label="지원서" items={[…]} value={tab} onChange={setTab} />                 // 화면 안 영역
<NavTabs label="지원폼" items={[{ to: adminPath.recruitForm, label: '지원폼 질문' }, { to: adminPath.recruitCriteria, label: '평가 기준' }]} />
<EmptyState title="검색 결과가 없습니다." />
formatDateTimeLong(iso)  // '2026.10.23 (금) 14:00'  · formatDate · formatPeriod · relativeTime
maskStudentId('2026000042')  // '2026****42'
```

## 6. 지킬 것 (BRIEF)

- 문구는 ~습니다체, 명세 안내 문구가 있으면 그대로. 13px 미만 한글 금지.
- 색만으로 상태를 말하지 않기 (StatusBadge · 음영 행에는 글자도). 장소색(구글 4색)은 관리자 화면에 쓰지 않음.
- 누르는 곳 44 (표 안 작은 버튼 32 + 사이 8). 키보드로 모든 기능.
- 공개 사이트가 쓰지 않는 react-router 부품(`Routes` · `Route` · `Navigate` · `Form` · `useBlocker` …)은 쓰지 않습니다: 공개 페이지와 같이 받는 공통 파일이 커집니다. 이동은 `useNavigate` · `<Redirect>`(`shell/Redirect`) · `<Link>`.
- 새 라이브러리는 꼭 필요할 때만 (기초 담당과 먼저 이야기).
