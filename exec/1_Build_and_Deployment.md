# Build and Deployment Guide

## 1. Environment Specifications

### Backend
- **Language**: Java 21
- **Framework**: Spring Boot 3.5.9
- **Build Tool**: Gradle (Wrapper provided)
- **Web Server / WAS**: 
  - **Review**: Embedded Tomcat (Spring Boot default)
  - **Production Reverse Proxy**: Nginx (managed via Kubernetes Ingress)
- **Database**: 
  - MySQL 8.0+
  - Redis (for caching & session)

### Frontend
- **Language**: TypeScript
- **Framework**: React 19
- **Build Tool**: Vite 7.2.4
- **Node.js**: LTS Version (Recommended v20+)
- **Package Manager**: npm

## 2. Build Environment Variables

### Backend (`application.properties` / Environment Variables)
When building or running the Docker container, the following environment variables must be provided:

| Variable Name | Description | Example |
|---|---|---|
| `SPRING_DATASOURCE_URL` | MySQL Connection URL | `jdbc:mysql://mysql:3306/roundy` |
| `SPRING_DATASOURCE_USERNAME` | Database Username | `root` |
| `SPRING_DATASOURCE_PASSWORD` | Database Password | `password` |
| `REDIS_HOST` | Redis Host | `redis` |
| `REDIS_PORT` | Redis Port | `6379` |
| `APP_FRONTEND_URL` | Frontend URL for CORS | `https://your-domain.com` |
| `KAKAO_CLIENT_ID` | Kakao REST API Key | `your_kakao_key` |
| `KAKAO_REDIRECT_URI` | Kakao Redirect URI | `https://your-domain.com/api/auth/kakao/callback` |
| `KAKAO_SECRET_KEY` | Kakao Client Secret | `your_secret` |
| `KAKAO_ADMIN_KEY` | Kakao Admin Key | `your_admin_key` |
| `JWT_SECRET` | JWT Signing Secret (32+ bytes) | `your_very_long_secret_key` |
| `OPENVIDU_URL` | OpenVidu Server URL | `https://openvidu.your-domain.com` |
| `OPENVIDU_SECRET` | OpenVidu Secret | `openvidu_secret` |
| `MINIO_URL` | MinIO Internal URL | `http://minio:9000` |
| `MINIO_EXTERNAL_URL` | MinIO External URL | `https://minio.your-domain.com` |
| `MINIO_ACCESS_KEY` | MinIO Access Key | `minioadmin` |
| `MINIO_SECRET_KEY` | MinIO Secret Key | `minioadmin` |
| `AI_SERVER_URL` | External AI Server URL | `http://ai-server:5000` |

### Frontend (`.env`)
Create a `.env` file in the `Frontend` directory for build-time configuration:

| Variable Name | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend API Base URL | `https://api.your-domain.com` |
| `VITE_WS_URL` | WebSocket URL | `wss://api.your-domain.com/ws/webrtc` |

## 3. Deployment Specifics

### Docker Builds
- **Backend**:
  ```bash
  cd Backend
  docker build -t roundy-backend .
  ```
- **Frontend**:
  ```bash
  cd Frontend
  docker build -t roundy-frontend .
  ```

### Kubernetes / ArgoCD
- Infrastructure configuration is located in the `Infra/devops` directory.
- **Ingress**: Uses Nginx Ingress Controller to route traffic.
- **CI/CD**: Jenkins is used for building and pushing images (see `Jenkinsfile` in root/Backend/Frontend).

## 4. Key Configuration Files
- **Backend Config**: `Backend/src/main/resources/application.properties`
- **Initial Data**: `Backend/src/main/resources/data.sql`
- **Frontend Config**: `Frontend/.env` (Gitignored, needs creation), `Frontend/vite.config.ts`
- **Infrastructure**: `Infra/devops/argocd/` (K8s manifests)
