import process from 'node:process'
import { URL, fileURLToPath } from 'node:url'

import { defineConfig, loadEnv } from 'vite'

import { createViteProxy, getBuildTime } from './build/config'
import { abiCandidateManualChunks } from './build/manualChunks'
import { include } from './build/optimize'
import { setupVitePlugins } from './build/plugins'

// https://vitejs.dev/config/
export default defineConfig(configEnv => {

  const viteEnv = loadEnv(configEnv.mode, process.cwd()) as unknown as Env.ImportMeta;

  const buildTime = getBuildTime();

  const enableProxy = configEnv.command === 'serve' && !configEnv.isPreview;
  return {
    base: viteEnv.VITE_BASE_URL,
    build: {
      chunkSizeWarningLimit: 1024, // 1MB warning threshold (antd alone is ~1.2MB)
      rollupOptions: {
        output: {
          manualChunks: abiCandidateManualChunks,
          onlyExplicitManualChunks: true,
        }
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@/styles/scss/global.scss" as *;`,
          api: 'modern-compiler'
        }
      }
    },
    define: {
      BUILD_TIME: JSON.stringify(buildTime)
    },
    optimizeDeps: { include },
    plugins: [...setupVitePlugins(viteEnv, buildTime)],
    preview: {
      port: 9725,
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '~': fileURLToPath(new URL('../../', import.meta.url)),
      },
    },
    server: {
      fs: {
        cachedChecks: false,
      },
      host: '0.0.0.0',
      open: true,
      port: 9527,
      proxy: {
        '/api/report-stream': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
        '/chat-ui': {
          target: 'http://localhost:5173',
          changeOrigin: true,
          ws: true,
        },
        // CHAT_SDK_LOCAL=1 时转发本地 preview(4173) 联调最新 SDK 产物，否则转发网关已部署产物
        '/chat-sdk': process.env.CHAT_SDK_LOCAL === '1'
          ? {
              target: 'http://localhost:4173',
              changeOrigin: true,
              rewrite: (path: string) => path.replace(/^\/chat-sdk/, ''),
            }
          : {
              target: 'https://192.168.1.195/',
              changeOrigin: true,
              secure: false,
            },
        ...createViteProxy(viteEnv, enableProxy),
        '/proxy-api': {
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/proxy-chat/, ''),
          target: 'http://192.168.1.195:8080',
        },
        '/api': {
          target: 'https://192.168.1.195/',
          // target: 'http://123.181.192.131:81/',
          changeOrigin: true,
          secure: false,
          // rewrite: (path) => path.replace(/^\/api-proxy/, '/api'),
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // console.log('proxyReq', proxyReq, req, res)
            })
          },
        },
        '/chat-proxy': {
          target: 'https://192.168.1.195/',
          // target: 'http://123.181.192.131:81/',
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // console.log('proxyReq', proxyReq, req, res)
            })
          },
        }, 
        '/abi-chat-proxy': {
          target: 'http://192.168.1.195/',
          // target: 'http://123.181.192.131:81/',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/abi-chat-proxy/, '/abi-chat'),
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // console.log('proxyReq', proxyReq, req, res)
            })
          },
        },
      },
      warmup: {
        clientFiles: ['./index.html', './src/{pages,components}/*'],
      },
    },
  }
})
