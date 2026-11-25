import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// WASM 资产（stm32f1-emu / brownout）按需加载，构建时保留独立文件。
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  assetsInclude: ['**/*.wasm'],
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 1600,
  },
  optimizeDeps: {
    exclude: ['brownout', 'stm32f1-emu'],
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
