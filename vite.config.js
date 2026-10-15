import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // served from https://ralf-meca.github.io/albanian-freelance-rates-calculator/
  base: '/albanian-freelance-rates-calculator/',
  plugins: [vue()],
})
