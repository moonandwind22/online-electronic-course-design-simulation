import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'esnext',
    assetsInlineLimit: 0,
  },
  assetsInclude: ['**/*.wasm'],
  optimizeDeps: {
    exclude: ['brownout', 'stm32f1-emu'],
  },
});
