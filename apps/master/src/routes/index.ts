export const routes = [
  {
    path: '/',
    component: './login',
  },
  {
    // 带上 * 通配符意味着将 /app1/project 下所有子路由都关联给微应用 app1
    path: '/app1/*',
    microApp: 'app1',
  },
];
