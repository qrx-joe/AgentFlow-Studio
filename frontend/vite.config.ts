import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import AutoImport from 'unplugin-auto-import/vite';

// https://vitejs.dev/config/
export default defineConfig(() => {
  const analyze = process.env.ANALYZE === 'true';

  return {
    plugins: [
      vue(),
      // Element Plus 按需导入
      Components({
        resolvers: [
          ElementPlusResolver({
            importStyle: 'css',
          }),
        ],
      }),
      // Element Plus API 自动导入
      AutoImport({
        resolvers: [ElementPlusResolver()],
      }),
    ],
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
          // SSE 流式传输支持：禁用代理缓冲
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes, _req) => {
              // 检测 SSE 响应，确保不缓冲
              if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
                proxyRes.headers['cache-control'] = 'no-cache';
                proxyRes.headers['x-accel-buffering'] = 'no';
              }
            });
          },
        },
      },
    },
  };
});
