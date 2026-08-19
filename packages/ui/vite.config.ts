import { resolve } from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const rootDir = import.meta.dirname;

export default defineConfig({
  server: {
    open: true,
    port: 5175,
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    dts({
      include: ['src'],
      exclude: ['src/**/__tests__/**'],
      tsconfigPath: './tsconfig.json',
    }),
    // Theme-definition split shipped alongside the JS: lib.css becomes the
    // "./styles.css" export; tokens.css doubles as the overridable default
    // theme ("./theme.css" export). See src/styles/lib.css for the contract.
    viteStaticCopy({
      targets: [
        { src: 'src/styles/lib.css', dest: 'styles', rename: { stripBase: true, name: 'index.css' } },
        { src: 'src/styles/fonts.css', dest: 'styles', rename: { stripBase: true } },
        { src: 'src/styles/tokens.css', dest: 'styles', rename: { stripBase: true } },
        { src: 'src/styles/theme.css', dest: 'styles', rename: { stripBase: true } },
      ],
    }),
  ],
  build: {
    lib: {
      entry: {
        'index': resolve(rootDir, 'src/index.tsx'),
        'cache': resolve(rootDir, 'src/cache/browser.ts'),
        'cache-server': resolve(rootDir, 'src/cache/server.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        /^react($|\/)/,
        /^react-dom($|\/)/,
        /^@radix-ui\//,
        /^@tanstack\/react-query($|\/)/,
        'ioredis',
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
      ],
      output: {
        preserveModules: false,
        entryFileNames: '[name].js',
      },
    },
    sourcemap: true,
    target: 'es2022',
  },
});
