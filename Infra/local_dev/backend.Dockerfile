# backend/Dockerfile.dev
FROM eclipse-temurin:21-jdk-alpine
WORKDIR /app
# 빌드 도구 캐싱을 위해 설정 파일 먼저 복사
COPY Backend/gradlew .
COPY Backend/gradle gradle
COPY Backend/build.gradle Backend/settings.gradle ./

RUN chmod +x gradlew
RUN ./gradlew --version  # Gradle 미리 내려받기

COPY . .
# 개발 모드로 실행 (Spring Boot 3.x)
CMD ["./gradlew", "bootRun"]