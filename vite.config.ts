import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const src = (path: string) => fileURLToPath(new URL(`./src/${path}`, import.meta.url));

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      // The copied AVA Platform frontend imports these; here they are answered locally (no Laravel, no network).
      { find: '@inertiajs/react', replacement: src('shim/inertia.jsx') },
      { find: /^axios$/, replacement: src('shim/axios.js') },
      { find: /^@\//, replacement: `${src('ava')}/` },
    ],
  },
});
