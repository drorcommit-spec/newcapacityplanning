import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
  },
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().split('T')[0]),
    __GIT_COMMIT__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'local'),
  },
})
