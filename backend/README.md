# backend

Spring Boot(Java)로 만든 백엔드입니다. Cloud Run에 배포하며, 데이터를 쓰는 서버는 이 backend 하나뿐입니다.

| 항목 | 내용 |
|---|---|
| 담당 팀 | Homepage-BE (`homepage-be`) |
| PR 영역 라벨 | `area:backend` |
| CI | `.github/workflows/ci-backend.yml` (Homepage-BE가 작성 · 관리) |
| 스택 · 도구 | Spring Boot, Java, Gradle |
| 로컬 주소 | http://localhost:8080 (Docker 컨테이너) |

## 지킬 것

- Firestore와 Cloud Storage에 쓰는 일은 backend만 합니다.
- Firebase ID 토큰을 검증하고 HttpOnly 세션 쿠키를 발급합니다.
- 모든 엔드포인트에서 권한(비회원 / General / Core / Lead)을 검사합니다.
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
