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
- Firebase ID 토큰을 검증하고 JWT(access token · refresh token)를 HttpOnly 쿠키로 발급합니다.
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
TeamPostPage list(@RequestParam int page, @RequestParam int size) {
    return teamPostService.list(page, size);
}
```

코드 구조 확인 항목: [작업 규칙 › 4-5. backend · ai 코드 구조 확인](../RULEBOOKS/contributing.md#4-5-backend--ai-코드-구조-확인)

## 관련 문서

- [작업 규칙](../RULEBOOKS/contributing.md)
- [머지 규칙](../RULEBOOKS/merge-rules.md)
- [실행 · 배포](../RULEBOOKS/local-and-deploy.md)
