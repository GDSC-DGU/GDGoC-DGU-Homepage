# syntax=docker/dockerfile:1
FROM eclipse-temurin:26.0.2.1_1-jdk-noble AS builder
WORKDIR /app
# 이미지의 JDK 25를 그대로 쓴다. toolchain 자동 다운로드(foojay)는 끈다
ENV GRADLE_OPTS="-Dorg.gradle.java.installations.auto-download=false"
# 의존성 층을 먼저 만들어 소스만 바뀔 때 캐시를 재사용한다
COPY gradlew settings.gradle build.gradle ./
COPY gradle/ gradle/
RUN --mount=type=cache,target=/root/.gradle \
    chmod +x gradlew && ./gradlew dependencies --no-daemon --console=plain > /dev/null
COPY src/ src/
# 테스트는 Firestore 에뮬레이터가 필요해 CI에서 따로 돌린다
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew bootJar -x test --no-daemon --console=plain \
    && java -Djarmode=tools -jar build/libs/backend-*-SNAPSHOT.jar extract --layers --launcher --destination /app/layers

FROM eclipse-temurin:26.0.2.1_1-jre-noble
RUN useradd --system --no-create-home app
WORKDIR /app
# 자주 바뀌는 층일수록 아래에 둔다
COPY --from=builder /app/layers/dependencies/ ./
COPY --from=builder /app/layers/spring-boot-loader/ ./
COPY --from=builder /app/layers/snapshot-dependencies/ ./
COPY --from=builder /app/layers/application/ ./
# 컨테이너 메모리 한도의 75%를 힙으로 쓰고, OOM이면 바로 종료해 Cloud Run이 재시작하게 한다
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"
USER app
EXPOSE 8080
# Cloud Run은 PORT 환경변수로 포트를 지정한다 (application.yml 의 server.port 가 읽는다)
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
