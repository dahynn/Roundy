FROM ubuntu:22.04

# 기본 도구 및 Java 21 설치
RUN apt-get update && apt-get install -y \
    curl git unzip wget \
    openjdk-21-jdk \
    && rm -rf /var/lib/apt/lists/*

# 환경 변수 설정
ENV JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
ENV PATH=$PATH:$JAVA_HOME/bin

WORKDIR /app
# 빌드 속도 향상을 위해 로컬의 .gradle을 볼륨으로 마운트하여 사용할 예정입니다.