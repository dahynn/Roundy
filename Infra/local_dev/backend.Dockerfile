# backend/Dockerfile.dev
FROM eclipse-temurin:21-jdk-alpine
WORKDIR /app

ENV GRADLE_USER_HOME=/home/gradle_cache

# 빌드 도구 캐싱을 위해 설정 파일 먼저 복사
COPY Backend/gradlew .
COPY Backend/gradle gradle
COPY Backend/build.gradle Backend/settings.gradle ./

RUN chmod +x gradlew
# --no-daemon 옵션을 붙여서 컨테이너 안에서 유령 프로세스가 생기지 않게 합니다.
RUN ./gradlew --version --no-daemon

COPY Backend/ .
# 개발 모드로 실행 (데몬 없이 실행하여 로그를 바로 확인)
CMD ["./gradlew", "bootRun", "--no-daemon"]