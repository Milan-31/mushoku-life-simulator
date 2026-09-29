import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 使用相对路径，使打包后的 Electron（file://）与静态部署都能正确加载资源
  base: './',
})