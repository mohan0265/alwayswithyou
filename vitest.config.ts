import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'build/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/test/**',
        '**/__tests__/**',
        '**/*.test.*',
        '**/*.spec.*'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    include: [
      'packages/**/*.{test,spec}.{js,ts,tsx}',
      'apps/**/*.{test,spec}.{js,ts,tsx}'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'build/',
      '**/*.e2e.{test,spec}.{js,ts,tsx}'
    ]
  },
  resolve: {
    alias: {
      '@awy/schema': resolve(__dirname, './packages/schema/src'),
      '@awy/utils': resolve(__dirname, './packages/utils/src'),
      '@awy/ui': resolve(__dirname, './packages/ui/src'),
      '@awy/sdk': resolve(__dirname, './packages/sdk/src'),
    }
  }
});

