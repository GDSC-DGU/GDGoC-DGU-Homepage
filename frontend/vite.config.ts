/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    // 미리보기용으로 하위 경로에 올릴 때는 VITE_BASE=./ 로 빌드
    base: env.VITE_BASE ?? '/',
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    // 파일 하나로 묶는 미리보기(아티팩트)용: 페이지별로 나눈 파일을 다시 하나로 합친다
    ...(env.VITE_SINGLE_FILE === '1' ? { build: { rolldownOptions: { output: { codeSplitting: false } } } } : {}),
    server: {
      // npm run dev 에서 /api 요청을 로컬 Spring Boot 로 넘긴다 (CORS 설정 없이 붙여 보기)
      proxy: { '/api': { target: env.API_PROXY_TARGET ?? 'http://localhost:8080', changeOrigin: true } },
    },
    test: {
      include: ['src/**/*.test.ts'],
    },
  }
})
