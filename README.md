# GDGoC DGU 홈페이지

동국대학교 Google Developer Groups on Campus(GDGoC DGU) 홈페이지 팀 레포입니다.
프론트엔드, 백엔드, AI를 한 레포에서 폴더로 나눠 관리합니다. API 명세와 코드를 한곳에서 맞추기 위해서입니다.

## 폴더

| 폴더 | 내용 | 파트 |
| --- | --- | --- |
| `frontend/` | 웹 화면 (Vite + React + TypeScript). 실행 방법은 [frontend/README.md](frontend/README.md) | FE |
| `backend/` | API 서버 | BE |
| `ai/` | 지원서 채점 등 AI 기능 | AI |

`backend/` 와 `ai/` 는 각 파트가 만들어 채웁니다.

## 규칙

- 명령은 각 폴더 안에서 실행합니다. 예: `cd frontend` 다음 `npm run dev`
- 브랜치 · 커밋 규칙은 파트마다 정해 각 폴더 README 에 적습니다.
- 커밋은 AI 에게 맡기지 않고 각자 합니다.
- API 명세는 Notion 'API 명세서'(GDG 워크스페이스)에 있습니다.

## 배포

- `frontend/`: Vercel (프로젝트 설정의 Root Directory 를 `frontend` 로 둠)
- 서버 · 인프라: GCP (GDG 계정)
