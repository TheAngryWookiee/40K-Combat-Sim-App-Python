import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Share the repo-level env files between the backend and frontend.
  envDir: '..',
})
