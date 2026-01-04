import process from 'node:process'
import { URL, fileURLToPath } from 'node:url'

import reactRefresh from '@vitejs/plugin-react-refresh'
import { defineConfig, loadEnv } from 'vite'
import qiankun from 'vite-plugin-qiankun'

import { createViteProxy, getBuildTime } from './build/config'
import { include } from './build/optimize'
import { setupVitePlugins } from './build/plugins'

// https://vitejs.dev/config/
export default defineConfig(configEnv => {
  // 是否为开发模式，用于qiankun热更新
  const useDevMode = false;

  const viteEnv = loadEnv(configEnv.mode, process.cwd()) as unknown as Env.ImportMeta;

  const buildTime = getBuildTime();

  const enableProxy = configEnv.command === 'serve' && !configEnv.isPreview;
  return {
    base: viteEnv.VITE_BASE_URL,
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
    module: {
      rule: {
        test: /\.svg$/,
        use: [
          {
            loader: 'url-loader',
            options: {},
          },
        ],
      },
    },
    optimizeDeps: { include },
    plugins: [...setupVitePlugins(viteEnv, buildTime), ...(useDevMode ? [] : [reactRefresh()]), qiankun('chatbi', { useDevMode })],
    preview: {
      port: 9725,
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '~': fileURLToPath(new URL('./', import.meta.url)),
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
