import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Relativne putanje za deployment
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});

