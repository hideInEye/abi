import { defineConfig } from 'vite'
import { URL, fileURLToPath } from 'node:url'
import reactRefresh from '@vitejs/plugin-react-refresh'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from 'tailwindcss'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import path from 'path'
const localIconPath = path.join(process.cwd(), 'src/assets/svg-icon')

const useDevMode = process.env.NODE_ENV === 'development'
const baseUrl = '/chat-ui/'
// https://vite.dev/config/
export default defineConfig({
  base: baseUrl,
  plugins: [
    tanstackRouter({
      target: 'react',
      routesDirectory: './src/pages',
      generatedRouteTree: './src/routeTree.gen.ts',
      quoteStyle: 'single',
    }),
    ...(useDevMode ? [] : [reactRefresh()]),
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
      '@sa/axios': fileURLToPath(new URL('../../packages/axios/src/index.ts', import.meta.url)),
      '@sa/auth': fileURLToPath(new URL('../../packages/auth/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 5173,
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
})
