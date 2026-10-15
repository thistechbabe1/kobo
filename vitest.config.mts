import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 20000,
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
