/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()], // React 플러그인 추가
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts', // 기존 테스트 설정 파일 경로
    css: true,
  },
})
