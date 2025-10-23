import { defineConfig } from '@umijs/max';
import { routes } from './src/routes/index';

export default defineConfig({
  antd: {},
  // access: {},
  dva: {
  },
  model: {},
  // initialState: {},
  // request: {},
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
});
