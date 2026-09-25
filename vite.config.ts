/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const nestedWorktrees = ['**/heroes-scene/**', '**/heroes-physics/**'];

export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, strictPort: true, watch: { ignored: nestedWorktrees } },
  optimizeDeps: { entries: ['index.html'] },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
});
