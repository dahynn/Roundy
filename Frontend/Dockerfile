FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html

RUN rm -rf /usr/share/nginx/html/*

COPY dist /usr/share/nginx/html
# SPA 라우팅을 위한 설정 파일 복사
COPY default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]