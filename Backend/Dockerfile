FROM eclipse-temurin:21-jdk-alpine AS build

WORKDIR /workspace

COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle
RUN chmod +x gradlew

COPY src ./src
RUN ./gradlew --no-daemon clean bootJar

FROM eclipse-temurin:21-jre-alpine

RUN addgroup -S roundy && adduser -S roundy -G roundy
WORKDIR /app

COPY --from=build /workspace/build/libs/*.jar app.jar

USER roundy
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
