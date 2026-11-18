# backend

Spring Boot(Java)로 만든 백엔드입니다. Cloud Run에 배포하며, 데이터를 쓰는 서버는 이 backend 하나뿐입니다.

| 항목 | 내용 |
|---|---|
| 담당 팀 | Homepage-BE (`homepage-be`) |
| PR 영역 라벨 | `area:backend` |
| CI | `.github/workflows/ci-backend.yml` (Homepage-BE가 작성 · 관리) |
| 스택 · 도구 | Spring Boot 4.1, Java 25, Gradle 9.8 |
| 로컬 주소 | http://localhost:8080 (Docker 컨테이너) |

## 빌드 · 실행

`backend/` 폴더에서 실행합니다. Gradle은 따로 설치하지 않고 함께 들어 있는 `./gradlew`를 씁니다(Windows 명령 프롬프트는 `gradlew.bat`).

```bash
./gradlew test       # 테스트
./gradlew bootRun    # 서버 실행 (프로필 local, 포트 8080)
```

확인 주소: http://localhost:8080/api/v1/health

실제 Google ID 토큰을 검증하려면 프론트에서 사용하는 Google OAuth 웹 클라이언트 ID를 `GOOGLE_CLIENT_ID` 환경변수에 설정합니다. `abc`처럼 형식이 잘못된 토큰을 거절하는 테스트는 이 설정 없이 실행할 수 있습니다. `backend/`의 PowerShell에서 아래처럼 서버를 실행할 수 있습니다.

```powershell
$env:GOOGLE_CLIENT_ID = '여기에 Google OAuth 웹 클라이언트 ID 입력'
.\gradlew.bat bootRun
```

### Google 로그인 회원 조회 확인

- [로그인용 Firestore 회원 문서](docs/firestore-users.md)에서 컬렉션, 필드 타입, 테스트 데이터 예시를 확인할 수 있습니다.
- 로컬 Firestore를 쓸 때는 `FIRESTORE_EMULATOR_HOST`에 에뮬레이터 주소(예: `localhost:8180`)를, `GOOGLE_CLOUD_PROJECT`에 에뮬레이터의 프로젝트 ID를 설정합니다.
- `AUTH_USERS_COLLECTION`, `AUTH_GOOGLE_SUB_FIELD`, `AUTH_USER_ACTIVE_FIELD`는 회원 컬렉션, Google 계정 ID(`sub`) 필드, 활성 여부 필드 이름입니다. 활성 여부 필드는 Firestore의 Boolean 값(`true` 또는 `false`)이어야 합니다.
- 실제 Google 토큰과 Firestore 없이 회원 조회 분기를 확인하려면 `backend/`의 PowerShell에서 `./gradlew.bat test --tests "*AuthMemberLookupTest"`를 실행합니다.

### Google 로그인 세션 발급 확인

- 활성 회원 문서에는 `googleSub`와 `isActive: true` 외에 `name`과 `role` (`GENERAL` 또는 `ADMIN`)이 필요합니다. `userId`는 Firestore 문서 ID를 사용합니다. 발급된 세션은 `authSessions`에 저장합니다.
- `AUTH_ACCESS_TOKEN_SECRET`에는 무작위 32바이트 이상을 Base64로 인코딩한 값을 설정합니다. Git Bash에서 `openssl rand -base64 32`로 생성할 수 있습니다. VS Code로 실행한다면 로컬 `.env`에 키를 두고 실행 설정에 `"envFile": "${workspaceFolder}/.env"`를 지정합니다. 배포 환경에서는 환경별 비밀값을 사용합니다.
- 브라우저 출처는 local에서 `http://localhost:5173`과 `http://127.0.0.1:5173`, dev와 prod에서 각 홈페이지 주소를 허용합니다. 필요하면 `AUTH_ALLOWED_ORIGINS`에 쉼표로 구분한 주소를 설정합니다. refresh 쿠키는 local에서 HTTP 테스트를 지원하고, dev와 prod에서는 `Secure`가 적용됩니다.

### 필요한 것

- **Java 17 이상**이 PC에 하나 설치되어 있어야 합니다. `./gradlew` 자체를 실행하는 데 씁니다.
- 빌드에 쓰는 **JDK 25는 설치하지 않아도 됩니다.** PC에 없으면 처음 실행할 때 Gradle이 자동으로 내려받습니다. 이미 JDK 25가 설치되어 있으면 그것을 쓰고 받지 않습니다.
- **디스크 여유 공간 약 1GB.** 처음 실행할 때 JDK 25(약 430MB), Gradle 본체, 라이브러리를 사용자 폴더의 `.gradle` 아래(Windows: `C:\Users\<이름>\.gradle`)에 내려받습니다. 처음 한 번은 몇 분 걸립니다.

### 내려받기가 실패할 때

| 증상 | 조치 |
|---|---|
| 디스크 공간 부족으로 JDK · Gradle을 받다가 실패 | 공간을 확보하거나, 환경변수 `GRADLE_USER_HOME`을 여유 있는 드라이브의 폴더로 지정합니다. `.gradle` 폴더 전체가 그 위치를 쓰게 됩니다. 같은 PC의 다른 Gradle 프로젝트(Android Studio 등)도 새 위치를 쓰게 됩니다. |
| 한 번 실패한 뒤 다시 실행해도 JDK 관련 오류가 남 | 받다 만 파일이 남은 경우입니다. `.gradle/jdks` 폴더를 지우고 다시 실행합니다. |
| 회사 · 학교 네트워크에서 내려받기가 막힘 | JDK 25(Eclipse Temurin 등)를 직접 설치합니다. 설치되어 있으면 자동 내려받기를 하지 않습니다. |

## 지킬 것

- Firestore와 Cloud Storage에 쓰는 일은 backend만 합니다.
- 프론트엔드가 전달한 Google ID 토큰을 Spring Boot에서 직접 검증합니다. 검증한 Google 계정에 연결된 활성 회원을 확인한 뒤 서비스 로그인 세션을 발급합니다.
- 모든 엔드포인트에서 권한(비회원 / 회원 / 운영진)을 검사합니다. 운영진은 역할이 Lead 또는 Core인 사용자이고, 둘의 권한은 같습니다.
- 개인정보를 로그, 응답, 에러 메시지에 싣지 않습니다.
- ai 서비스는 backend만 호출합니다.
- API 키, 서비스 계정 키, 실제 지원자·회원 정보를 코드에 넣지 않습니다.

## 코드 작성 규칙

- controller는 URL 연결, 요청 받기, 형식 검사(`@Valid`), service 호출, 응답·상태 코드 반환만 합니다.
- 업무 규칙 판단, 계산, DB 접근(repository 호출)은 service에 둡니다. controller가 repository를 직접 부르지 않습니다.
- 호출 방향은 controller → service → repository 하나뿐입니다. 층을 건너뛰지 않습니다.
- service는 `HttpServletRequest` 같은 웹 프레임워크 객체를 받지 않습니다.
- 409, 400 같은 실패 응답은 controller의 if문이 아니라, service가 던진 예외를 `@RestControllerAdvice`가 상태 코드로 바꿉니다.
- 데이터 하나에 딸린 규칙은 엔티티의 메서드로 둘 수 있습니다(예: `Recruit.isClosed()`).

```java
@GetMapping("/teams/posts")
ApiResponse<TeamPostPage> list(@RequestParam int page, @RequestParam int size) {
    return ApiResponse.ok(teamPostService.list(page, size));
}
```

코드 구조 확인 항목: [작업 규칙 › 4-5. backend · ai 코드 구조 확인](../RULEBOOKS/contributing.md#4-5-backend--ai-코드-구조-확인)

## 관련 문서

- [작업 규칙](../RULEBOOKS/contributing.md)
- [머지 규칙](../RULEBOOKS/merge-rules.md)
- [실행 · 배포](../RULEBOOKS/local-and-deploy.md)
