import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig(() => {
  const analyze = process.env.ANALYZE === 'true'

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vue-vendor': ['vue', 'vue-router', 'pinia'],
            'vue-flow': ['@vue-flow/core', '@vue-flow/background'],
            'element-plus': ['element-plus'],
          },
        },
        plugins: analyze
          ? [
              visualizer({
                filename: 'dist/stats.html',
                open: true,
                gzipSize: true,
                brotliSize: true,
              }),
            ]
          : [],
      },
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  }
})
