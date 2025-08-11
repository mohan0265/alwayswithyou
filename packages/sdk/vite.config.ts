import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'AWYSDK',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => {
        switch (format) {
          case 'es':
            return 'index.js';
          case 'cjs':
            return 'index.cjs';
          case 'umd':
            return 'index.umd.js';
          default:
            return 'index.js';
        }
      },
    },
    rollupOptions: {
      external: ['@awy/schema', '@awy/utils'],
      output: {
        globals: {
          '@awy/schema': 'AWYSchema',
          '@awy/utils': 'AWYUtils',
        },
      },
    },
    sourcemap: true,
    minify: 'terser',
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
});

