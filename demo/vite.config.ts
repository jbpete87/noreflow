import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      noreflow: path.resolve(__dirname, '../src'),
      nopointer: path.resolve(__dirname, '../packages/nopointer/src'),
      '@noreflow/stream-ui': path.resolve(__dirname, '../packages/stream-ui/src'),
      tela: path.resolve(__dirname, '../packages/tela/src'),
    },
  },
  optimizeDeps: {
    include: ['react-reconciler'],
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        'stream-test': path.resolve(__dirname, 'stream-test.html'),
        'tela-demo': path.resolve(__dirname, 'tela-demo.html'),
      },
    },
  },
});
