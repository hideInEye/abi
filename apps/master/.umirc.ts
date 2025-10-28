import { defineConfig } from '@umijs/max'
import { routes } from './src/routes/index'

export default defineConfig({
  define: {
    'process.env': {
      NODE_ENV: 'development',
      BASE_URL: '/api',
    },
  },
  antd: {},
  // access: {},
  dva: {},
  model: {},
  // initialState: {},
  request: {},
  tailwindcss: {},
  // layout: {
  //   title: '@umijs/max',
  // },
  routes: routes,
  qiankun: {
    master: {
      apps: [
        {
          name: 'app1',
          entry: '//localhost:5173',
        },
      ],
    },
  },
  npmClient: 'pnpm',
  proxy: {
    '/api': {
      target: 'https://192.168.1.195',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '',
      },
    },
  },
})
