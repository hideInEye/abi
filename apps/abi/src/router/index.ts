import type { ElegantConstRoute } from '@ohh-889/react-auto-route';
import { createRouter } from '@sa/simple-router';
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';

import { layouts, pages } from './elegant/imports';
import { transformElegantRouteToReactRoute } from './elegant/transform';
import { afterEach, createRouteGuard, init } from './guard';
import { builtinRoutes } from './routes/builtin';

const { VITE_BASE_URL, VITE_ROUTER_HISTORY_MODE = 'history' } = import.meta.env;

/**
 * Get auth react routes
 *
 * @param routes Elegant routes
 */
function getReactRoutes(route: ElegantConstRoute) {
  return transformElegantRouteToReactRoute(route, layouts, pages);
}

export const router = createRouter({
  getReactRoutes,
  init,
  initRoutes: builtinRoutes,
  mode: VITE_ROUTER_HISTORY_MODE,
  opt: {
    basename: (qiankunWindow as any)?.__POWERED_BY_QIANKUN__ ? '/studio/chatbi' : VITE_BASE_URL
  }
});

export async function setupRouter() {
  router.beforeEach(createRouteGuard);
  router.afterEach(afterEach);
  await router.initReady();
}

export function preloadInitialRoute(pathname: string) {
  const path = pathname.replace(/\/+$/, '') || '/';
  const loaders: Array<() => Promise<unknown>> = [];

  if (path.endsWith('/workbench/screen-manage/abi-dashboard')) {
    loaders.push(layouts.base, pages['workbench_screen-manage_abi-dashboard']);
  } else if (path === '/home' || path.endsWith('/home')) {
    loaders.push(layouts.base, pages.home);
  } else if (path === '/login' || path.endsWith('/login')) {
    loaders.push(layouts.blank, pages.login);
  }

  if (loaders.length > 0) {
    void Promise.all(loaders.map(loader => loader())).catch(() => {});
  }
}
