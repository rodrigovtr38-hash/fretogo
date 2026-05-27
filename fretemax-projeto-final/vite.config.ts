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
    react({
      /*
       * IMPORTANTE:
       * Mantém compatibilidade segura
       * com React 18 + StrictMode.
       */
      jsxRuntime: 'automatic',
    }),

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

  define: {
    __APP_VERSION__: JSON.stringify(
      process.env.npm_package_version,
    ),
  },

  server: {
    host: '0.0.0.0',

    port: 5173,

    strictPort: true,

    open: false,
  },

  preview: {
    host: '0.0.0.0',

    port: 4173,

    strictPort: true,
  },

  optimizeDeps: {
    include: [
      /* ===================================================
         REACT
      =================================================== */

      'react',

      'react-dom',

      'react-router-dom',

      /* ===================================================
         FIREBASE
      =================================================== */

      'firebase/app',

      'firebase/auth',

      'firebase/firestore',

      'firebase/storage',

      /* ===================================================
         MAPS
      =================================================== */

      '@react-google-maps/api',

      'geofire-common',
    ],

    esbuildOptions: {
      target: 'es2020',
    },
  },

  build: {
    target: 'es2020',

    outDir: 'dist',

    assetsDir: 'assets',

    sourcemap: false,

    minify: 'esbuild',

    cssMinify: true,

    reportCompressedSize: true,

    chunkSizeWarningLimit: 1200,

    assetsInlineLimit: 4096,

    modulePreload: {
      polyfill: true,
    },

    rollupOptions: {
      output: {
        /*
         * IMPORTANTE:
         * Isolamento de chunks críticos
         * para evitar cascata runtime.
         */

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
             FIREBASE CORE
          =================================================== */

          firebase: [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/storage',
          ],

          /* ===================================================
             MAPS / GEO
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
    /*
     * IMPORTANTE:
     * NÃO remover console em DEV.
     * Realtime/logística precisa de rastreabilidade.
     */

    drop:
      process.env.NODE_ENV ===
      'production'
        ? ['debugger']
        : [],
  },
});
