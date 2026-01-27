# 1단계: 빌드 환경 (JDK 21 + Gradle)
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

# Gradle 래퍼와 설정 파일만 먼저 복사하여 의존성 캐싱
COPY gradlew .
COPY gradle gradle
COPY build.gradle settings.gradle ./

# 의존성 내려받기 (소스 변경 전 캐싱 단계)
RUN chmod +x gradlew
RUN ./gradlew dependencies --no-daemon

# 전체 소스 복사 및 JAR 파일 빌드
COPY . .
RUN ./gradlew clean build -x test --no-daemon

# 2단계: 실행 환경 (JRE만 포함하여 용량 최적화)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# 빌드 단계에서 생성된 jar만 복사
COPY --from=builder /app/build/libs/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]