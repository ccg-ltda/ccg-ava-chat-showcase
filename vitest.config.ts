import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

const src = (path: string) => fileURLToPath(new URL(`./src/${path}`, import.meta.url));

export default defineConfig({
  resolve: { alias: [{ find: /^@\//, replacement: `${src('ava')}/` }] },
  test: { environment: 'node', include: ['src/test/**/*.test.js'], setupFiles: ['src/test/setup.js'] },
});
