import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,      // 사용할 포트 번호
    strictPort: true, // 5173이 이미 사용 중일 때 다른 포트로 바꾸지 않고 에러 발생
    host: true,       // 외부(네트워크) 접속 허용 (0.0.0.0)
  },
});