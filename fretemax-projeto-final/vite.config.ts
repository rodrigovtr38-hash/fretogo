import {
  defineConfig,
  splitVendorChunkPlugin,
} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// 🔥 CTO FIX: Importando o construtor do PWA
import { VitePWA } from 'vite-plugin-pwa';

/* =========================================================
   VITE CONFIG
========================================================= */

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
    tailwindcss(),
    splitVendorChunkPlugin(),
    
    // 🔥 CTO FIX: Ativando a compilação do PWA para o botão de instalar aparecer
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 4000000 // Aumentado para 4MB para suportar mapas pesados
      },
      manifest: {
        name: "FRETOGO — Ecossistema Logístico Realtime",
        short_name: "FRETOGO",
        description: "Infraestrutura logística inteligente em tempo real. Da moto ao Bi-trem em segundos.",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait",
        start_url: "/motorista",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      }
    })
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
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
      'react',
      'react-dom',
      'react-router-dom',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/storage',
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
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          maps: ['@react-google-maps/api', 'geofire-common'],
          ui: ['lucide-react', 'motion', 'clsx', 'tailwind-merge'],
        },
        chunkFileNames: 'assets/chunks/[name]-[hash].js',
        entryFileNames: 'assets/entry/[name]-[hash].js',
        assetFileNames: 'assets/static/[name]-[hash].[ext]',
      },
    },
  },

  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['debugger'] : [],
  },
});
