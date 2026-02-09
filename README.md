# Roudy

Roudy is a comprehensive web application featuring a Spring Boot backend and a React frontend, designed with modern technologies for real-time communication and robust data management.

## Tech Stack

### Backend
- **Framework**: Spring Boot 3.5.9
- **Language**: Java 21
- **Database**:
  - **MySQL**: Primary relational database
  - **Redis**: Caching and session management
  - **H2**: In-memory database for testing
- **Security**:
  - Spring Security
  - JWT (JSON Web Tokens)
- **API Documentation**: Swagger (OpenAPI 3)
- **Real-time Communication**: WebSocket
- **Storage**: MinIO (Object Storage)
- **Image Processing**: Scrimage (WebP conversion)
- **Monitoring**: Spring Boot Actuator

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite 7.2.4
- **Language**: TypeScript
- **Styling**:
  - TailwindCSS 4.1.18
  - Radix UI (Headless UI components)
  - Lucide React (Icons)
- **Routing**: React Router DOM 7.13.0
- **Real-time Communication**: OpenVidu Browser (WebRTC)
- **HTTP Client**: Axios

### Infrastructure
- **DevOps**: Kubernetes (ArgoCD based on file structure)
- **Containerization**: Docker
- **CI/CD**: Jenkins

## Getting Started

### Prerequisites
- **Java**: JDK 21
- **Node.js**: LTS version
- **Docker**: For running infrastructure services (MinIO, Redis, MySQL)

### Backend Setup
1. Navigate to the `Backend` directory:
   ```bash
   cd Backend
   ```
2. Build and run the application:
   ```bash
   ./gradlew bootRun
   ```

### Frontend Setup
1. Navigate to the `Frontend` directory:
   ```bash
   cd Frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Directory Structure
- `Backend/`: Spring Boot application source code
- `Frontend/`: React application source code
- `Infra/`: Infrastructure configuration files (Certificates, DevOps, Local Dev environment)

## Features
- **Real-time Video/Audio**: Integrated with OpenVidu for WebRTC capabilities.
- **Secure Authentication**: JWT-based authentication system.
- **Microservices-ready**: Designed with modularity and scalability in mind using Docker and Kubernetes.
- **Optimized Media**: Automatic image optimization using WebP.