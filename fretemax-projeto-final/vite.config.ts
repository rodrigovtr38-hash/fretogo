import {
  defineConfig,
  splitVendorChunkPlugin,
} from 'vite';

import react from '@vitejs/plugin-react';

import tailwindcss from '@tailwindcss/vite';

import path from 'path';

/* =========================================================
   VITE CONFIG
========================================================= */

export default defineConfig({
  plugins: [
    react(),

    tailwindcss(),

    splitVendorChunkPlugin(),
  ],

  resolve: {
    alias: {
      '@': path.resolve(
        __dirname,
        './src',
      ),
    },
  },

  server: {
    host: true,

    port: 5173,

    strictPort: true,
  },

  preview: {
    host: true,

    port: 4173,

    strictPort: true,
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/storage',
      'firebase/messaging',
    ],
  },

  build: {
    target: 'es2020',

    sourcemap: false,

    minify: 'esbuild',

    cssMinify: true,

    chunkSizeWarningLimit: 900,

    reportCompressedSize: true,

    assetsInlineLimit: 4096,

    modulePreload: {
      polyfill: true,
    },

    rollupOptions: {
      output: {
        manualChunks: {
          /* ===================================================
             REACT CORE
          =================================================== */

          react: [
            'react',
            'react-dom',
            'react-router-dom',
          ],

          /* ===================================================
             FIREBASE
          =================================================== */

          firebase: [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/storage',
            'firebase/messaging',
          ],

          /* ===================================================
             MAPS
          =================================================== */

          maps: [
            '@react-google-maps/api',
            'geofire-common',
          ],

          /* ===================================================
             UI
          =================================================== */

          ui: [
            'lucide-react',
            'motion',
            'clsx',
            'tailwind-merge',
          ],
        },

        chunkFileNames:
          'assets/chunks/[name]-[hash].js',

        entryFileNames:
          'assets/entry/[name]-[hash].js',

        assetFileNames:
          'assets/static/[name]-[hash].[ext]',
      },
    },
  },

  esbuild: {
    drop: [
      'console',
      'debugger',
    ],
  },
});
