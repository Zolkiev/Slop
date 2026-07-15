import { defineConfig } from 'vite';

// base relative pour fonctionner servi depuis un sous-dossier (/Slop/logres/).
export default defineConfig({
  base: './',
  build: { outDir: 'dist' },
});
