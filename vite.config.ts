import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const { CODESPACE_NAME, GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN } = process.env

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: CODESPACE_NAME && GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
      ? [`${CODESPACE_NAME}-5173.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`]
      : [],
    proxy: {
      '/api': 'http://127.0.0.1:3000',
    },
  },
})