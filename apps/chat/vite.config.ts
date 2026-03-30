import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { URL, fileURLToPath } from 'node:url'
import reactRefresh from '@vitejs/plugin-react-refresh'
import tailwindcss from 'tailwindcss'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import path from 'path'
import qiankun from 'vite-plugin-qiankun'
const localIconPath = path.join(process.cwd(), 'src/assets/svg-icon')

// 是否为开发模式，用于qiankun热更新
const useDevMode = process.env.NODE_ENV === 'development'
const baseUrl = process.env.NODE_ENV === 'development' ? '/' : '/chat-ui/'
// https://vite.dev/config/
export default defineConfig((configEnv) => ({
  // 这里的 'myMicroAppName' 是子应用名，主应用注册时AppName需保持一致
  // plugins: [qiankun('myMicroAppName')],
  // 生产环境需要指定运行域名作为base
  // base: 'http://xxx.com/'
  base: baseUrl, // 关键配置：设置基础路径
  plugins: [
    ...(useDevMode ? [] : [reactRefresh()]),
    qiankun('ai-bot', { useDevMode }),
    // react(),
    createSvgIconsPlugin({
      customDomId: '__SVG_ICON_LOCAL__',
      iconDirs: [localIconPath],
      inject: 'body-last',
      symbolId: `icon-[dir]-[name]`,
    }),
  ],
  // base: '/micro-app-react',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port:5173,
    fs: {
      strict: true,
    },
    proxy: {
      '/api': {
        target: 'https://192.168.1.252/',
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
        target: 'https://192.168.1.252/',
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
        target: 'http://192.168.1.252/',
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
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  css: {
    postcss: {
      plugins: [tailwindcss],
    },
  },
}))
