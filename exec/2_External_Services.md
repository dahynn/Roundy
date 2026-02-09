# External Services Information

This document lists the external services used in the Roudy project for authentication, media streaming, storage, and other features.

## 1. Social Authentication
### Kakao Login
- **Purpose**: User authentication and login.
- **Service**: [Kakao Developers](https://developers.kakao.com/)
- **Required Keys**:
  - `KAKAO_CLIENT_ID` (REST API Key)
  - `KAKAO_SECRET_KEY` (Client Secret)
  - `KAKAO_ADMIN_KEY` (For admin actions)
- **Configuration**:
  - Redirect URI must be set to `{SERVER_DOMAIN}/api/auth/kakao/callback`.

## 2. Real-time Communication
### OpenVidu
- **Purpose**: WebRTC-based video and audio calls (1:1 matching, rotation).
- **Service**: [OpenVidu](https://openvidu.io/) (Self-hosted or Cloud)
- **Required Configuration**:
  - `OPENVIDU_URL`: Address of the OpenVidu deployment.
  - `OPENVIDU_SECRET`: Secret for securing API communication.
- **Port Usage**: Standard OpenVidu ports (4443, 8888, etc. depending on deployment).

## 3. Object Storage
### MinIO
- **Purpose**: Storing user profile images and other assets. S3-compatible storage.
- **Service**: [MinIO](https://min.io/) (Self-hosted)
- **Required Configuration**:
  - `MINIO_URL`: Internal URL for backend access.
  - `MINIO_EXTERNAL_URL`: Public URL for client access.
  - `MINIO_ACCESS_KEY` & `MINIO_SECRET_KEY`.

## 4. AI Service
### Custom AI Server
- **Purpose**: Face verification and potentially other AI features.
- **Configuration**:
  - `AI_SERVER_URL`: Endpoint for the Python/AI service.
  - `VERIFICATION_AI_SERVER_IPS`: IP whitelist for AI server communication.

## 5. Development Tools
### CI/CD & Infrastructure
- **Jenkins**: For continuous integration and deployment pipelines.
- **ArgoCD**: For GitOps-based Kubernetes deployment.
- **Docker Hub / Harbor**: Container registry (implied by K8s usage).

## 6. Accounts & Access
*(Note: Sensitive actual passwords/keys are not listed here for security. Refer to the secret management system or `application.properties` placeholders.)*
