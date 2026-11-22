import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // 第三个参数为空串：同时读取非 VITE_ 前缀变量（仅在 Node 侧使用，不会打包进前端）
  const env = loadEnv(mode, '.', '');
  const target = env.VITE_PROXY_TARGET;

  return {
    plugins: [react()],
    server: {
      port: 5173,
      open: true,
      // 开发代理：浏览器请求 /api/* → 目标网关；密钥只在代理侧注入，前端代码中不出现
      proxy: target
        ? {
            '/api': {
              target,
              changeOrigin: true,
              rewrite: (p: string) => p.replace(/^\/api/, ''),
              headers: env.PROXY_API_KEY ? { Authorization: `Bearer ${env.PROXY_API_KEY}` } : undefined,
            },
          }
        : undefined,
    },
    build: {
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks: {
            three: ['three', '@react-three/fiber', '@react-three/drei'],
          },
        },
      },
    },
  };
});
