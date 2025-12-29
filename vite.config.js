import { defineConfig } from 'vite';

export default defineConfig({
  // Vite serves files from 'public' directory at root URL
  // So public/assets/ will be served at /assets/
  publicDir: 'public',
  build: {
    outDir: 'dist'
  }
});

