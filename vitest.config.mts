import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/**/*.ts', 'tests/**/*.test.ts'],
    globals: true,
    pool: 'threads',
    maxWorkers: 1,
    restoreMocks: true,
    clearMocks: true,
  },
});
