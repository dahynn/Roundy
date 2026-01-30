# 🌍 환경별 설정 가이드

## 📋 목차

1. [환경 구분](#환경-구분)
2. [환경별 실행 방법](#환경별-실행-방법)
3. [CORS 설정](#cors-설정)
4. [환경 변수 설정](#환경-변수-설정)
5. [배포 가이드](#배포-가이드)

---

## 환경 구분

### 🏠 Local (로컬 개발 환경)

**용도**: 개발자 개인 PC에서 개발 및 테스트

**특징**:
- 가장 관대한 CORS 설정
- 상세한 로그 출력
- 자동 재시작 활성화
- SQL 로그 출력
- 테스트 컨트롤러 활성화

**활성화 프로파일**: `local`

---

### 🔧 Dev (개발 서버 환경)

**용도**: 팀 공유 개발 서버, 통합 테스트

**특징**:
- 개발팀이 공유하는 서버
- 상세한 로그 출력
- 테스트 컨트롤러 활성화
- 프론트엔드 개발 서버와 연동

**활성화 프로파일**: `dev`

---

### 🚀 Prod (운영 환경)

**용도**: 실제 서비스 운영

**특징**:
- 엄격한 CORS 설정 (실제 도메인만 허용)
- 최소한의 로그 출력
- 테스트 컨트롤러 비활성화
- 보안 강화
- 성능 최적화

**활성화 프로파일**: `prod`

---

## 환경별 실행 방법

### 🏠 Local 환경 실행

#### 방법 1: Gradle 명령어

```bash
# Windows
gradlew bootRun --args='--spring.profiles.active=local'

# Mac/Linux
./gradlew bootRun --args='--spring.profiles.active=local'
```

#### 방법 2: JAR 실행

```bash
java -jar -Dspring.profiles.active=local roundy-0.0.1-SNAPSHOT.jar
```

#### 방법 3: IDE 설정 (IntelliJ IDEA)

1. Run/Debug Configurations 열기
2. Active profiles에 `local` 입력
3. 실행

#### 방법 4: 환경 변수 설정

```bash
# Windows
set SPRING_PROFILES_ACTIVE=local
gradlew bootRun

# Mac/Linux
export SPRING_PROFILES_ACTIVE=local
./gradlew bootRun
```

---

### 🔧 Dev 환경 실행

```bash
# Gradle
./gradlew bootRun --args='--spring.profiles.active=dev'

# JAR
java -jar -Dspring.profiles.active=dev roundy-0.0.1-SNAPSHOT.jar
```

---

### 🚀 Prod 환경 실행

```bash
# JAR (운영 환경)
java -jar -Dspring.profiles.active=prod roundy-0.0.1-SNAPSHOT.jar
```

**⚠️ 주의사항**:
- 운영 환경에서는 반드시 `.env` 파일의 민감 정보를 환경 변수로 설정
- 테스트 컨트롤러가 자동으로 비활성화됨
- CORS 설정을 실제 도메인으로 변경 필요

---

## CORS 설정

### 환경별 CORS 허용 Origin

#### 🏠 Local 환경

```properties
# application-local.properties
cors.allowed-origins=http://localhost:5713,\
  http://localhost:5714,\
  http://localhost:8000,\
  http://localhost:3000,\
  http://127.0.0.1:5713,\
  http://127.0.0.1:5714,\
  http://127.0.0.1:8000,\
  http://127.0.0.1:3000
```

**허용 대상**:
- 프론트엔드 개발 서버 (5713, 5714, 3000)
- 로컬 테스트 서버 (8000)
- localhost와 127.0.0.1 모두 허용

---

#### 🔧 Dev 환경

```properties
# application-dev.properties
cors.allowed-origins=http://localhost:5713,\
  http://localhost:5714,\
  http://localhost:8000,\
  http://127.0.0.1:5713,\
  http://127.0.0.1:5714,\
  http://127.0.0.1:8000
```

**허용 대상**:
- 개발 서버의 프론트엔드
- 테스트용 포트

---

#### 🚀 Prod 환경

```properties
# application-prod.properties
cors.allowed-origins=https://your-production-domain.com,\
  https://www.your-production-domain.com
```

**허용 대상**:
- 실제 운영 도메인만 허용
- HTTPS만 허용

**⚠️ 배포 전 필수 작업**:
```properties
# 실제 도메인으로 변경
cors.allowed-origins=https://roundy.com,\
  https://www.roundy.com
```

---

## 환경 변수 설정

### .env 파일 구조

```bash
# ========================================
# 공통 설정
# ========================================

# MySQL
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/roundydb
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key-minimum-32-bytes

# ========================================
# 환경별 설정
# ========================================

# Local/Dev: 로컬 개발 환경
CORS_ALLOWED_ORIGINS=http://localhost:5713,http://localhost:5714,http://localhost:8000

# Prod: 운영 환경 (실제 도메인으로 변경)
# CORS_ALLOWED_ORIGINS=https://roundy.com,https://www.roundy.com
```

---

### 운영 환경 환경 변수 설정

운영 환경에서는 `.env` 파일 대신 시스템 환경 변수 사용 권장:

```bash
# Linux/Mac
export SPRING_PROFILES_ACTIVE=prod
export SPRING_DATASOURCE_URL=jdbc:mysql://prod-db:3306/roundydb
export SPRING_DATASOURCE_USERNAME=prod_user
export SPRING_DATASOURCE_PASSWORD=secure_password
export REDIS_HOST=prod-redis
export JWT_SECRET=production-secret-key
export CORS_ALLOWED_ORIGINS=https://roundy.com,https://www.roundy.com
```

---

## 배포 가이드

### 1. 빌드

```bash
# Gradle 빌드
./gradlew clean build

# 빌드 결과물 확인
ls -la build/libs/
# roundy-0.0.1-SNAPSHOT.jar
```

---

### 2. Docker 배포 (예시)

#### Dockerfile

```dockerfile
FROM openjdk:17-jdk-slim

WORKDIR /app

COPY build/libs/roundy-0.0.1-SNAPSHOT.jar app.jar

# 환경 변수 설정
ENV SPRING_PROFILES_ACTIVE=prod

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=prod
      - SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/roundydb
      - SPRING_DATASOURCE_USERNAME=root
      - SPRING_DATASOURCE_PASSWORD=${DB_PASSWORD}
      - REDIS_HOST=redis
      - JWT_SECRET=${JWT_SECRET}
      - CORS_ALLOWED_ORIGINS=https://roundy.com,https://www.roundy.com
    depends_on:
      - mysql
      - redis

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: roundydb
    volumes:
      - mysql-data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data

volumes:
  mysql-data:
  redis-data:
```

---

### 3. 배포 체크리스트

#### 🔒 보안 체크

- [ ] JWT Secret 변경 (최소 32바이트)
- [ ] 데이터베이스 비밀번호 변경
- [ ] CORS 설정을 실제 도메인으로 변경
- [ ] 민감 정보를 환경 변수로 관리
- [ ] `.env` 파일을 `.gitignore`에 추가

#### ⚙️ 설정 체크

- [ ] `spring.profiles.active=prod` 설정
- [ ] 로그 레벨 확인 (INFO 이상)
- [ ] SQL 로그 비활성화 확인
- [ ] 에러 스택트레이스 비활성화 확인

#### 🧪 테스트 체크

- [ ] 운영 환경에서 테스트 컨트롤러 비활성화 확인
- [ ] CORS 정책 테스트
- [ ] 데이터베이스 연결 테스트
- [ ] Redis 연결 테스트

---

## 환경별 로그 레벨

### Local

```properties
logging.level.com.ssafya701.roundy=DEBUG
logging.level.org.springframework.web=DEBUG
logging.level.org.hibernate.SQL=DEBUG
```

**출력 예시**:
```
2026-01-28 14:30:25 [http-nio-8080-exec-1] DEBUG c.s.r.w.c.WebSocketTestController - JWT 토큰 발급 요청: userId=1
Hibernate: select user0_.id from users user0_ where user0_.id=?
```

---

### Dev

```properties
logging.level.com.ssafya701.roundy=DEBUG
logging.level.org.springframework.web=DEBUG
```

**출력 예시**:
```
2026-01-28 14:30:25 [http-nio-8080-exec-1] DEBUG c.s.r.w.c.WebSocketTestController - JWT 토큰 발급 요청: userId=1
```

---

### Prod

```properties
logging.level.com.ssafya701.roundy=INFO
logging.level.org.springframework.web=WARN
```

**출력 예시**:
```
2026-01-28 14:30:25 [http-nio-8080-exec-1] INFO  c.s.r.w.c.WebSocketTestController - JWT 토큰 발급 완료: userId=1
```

---

## 문제 해결

### Q1: CORS 에러가 발생합니다

**확인사항**:
1. 현재 활성화된 프로파일 확인
2. 해당 프로파일의 CORS 설정 확인
3. 프론트엔드 URL이 허용 목록에 있는지 확인

**로그 확인**:
```
🔧 [개발 환경] CORS 설정 활성화
허용된 Origins: http://localhost:5713,http://localhost:5714,...
```

---

### Q2: 테스트 컨트롤러가 404 에러

**원인**: 운영 환경(`prod`)에서는 테스트 컨트롤러가 비활성화됩니다.

**해결**:
```bash
# local 또는 dev 프로파일로 실행
./gradlew bootRun --args='--spring.profiles.active=local'
```

---

### Q3: 현재 활성화된 프로파일 확인

**방법 1: 로그 확인**
```
The following profiles are active: local
```

**방법 2: Actuator 사용**
```bash
curl http://localhost:8080/actuator/env | grep spring.profiles.active
```

---

## 참고 자료

- [Spring Boot Profiles 공식 문서](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.profiles)
- [Spring Boot CORS 설정](https://spring.io/guides/gs/rest-service-cors/)

---

**작성일**: 2026-01-28  
**버전**: 1.0.0  
**작성자**: Roundy Development Team
