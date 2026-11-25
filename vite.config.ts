import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'esnext',
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
