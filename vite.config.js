import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.', // Raíz del proyecto
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        solutions: resolve(__dirname, 'solutions.html'),
        software: resolve(__dirname, 'software.html'),
        app: resolve(__dirname, 'app.html'),
        media: resolve(__dirname, 'media.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        blog: resolve(__dirname, 'blog.html'),
        casosExito: resolve(__dirname, 'casos-exito.html'),
        equipo: resolve(__dirname, 'equipo.html'),
      },
    },
    outDir: 'dist',
  },
  server: {
    port: 3000,
    open: true,
  },
});
