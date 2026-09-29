import type { RouteKey, RoutePath } from '@elegant-router/types';
import type {
  AfterEach,
  BeforeEach,
  Init,
  LocationQuery,
  NavigationGuardNext,
  RouteLocationNormalizedLoaded
} from '@sa/simple-router';
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';

import { $t } from '@/locales';
import { getRouteName, getRoutePath } from '@/router/elegant/transform';
import { store } from '@/store';
import { hidePageLoading, showPageLoading } from '@/store/slice/app/loadingSlice';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { isStaticSuper, selectUserInfo } from '@/store/slice/auth';
import { getRouteHome, initAuthRoute, initConstantRoute } from '@/store/slice/route';
import { localStg } from '@/utils/storage';

import { checkAuthStatus } from './authGuard';
import { isJwtExpired } from './jwt';

/**
 * 检查 JWT token 是否已过期。
 * 仅对标准三段 JWT 有效（含 exp claim）；非 JWT 或无法解码时返回 false（保守放行）。
 */
export const init: Init = async currentFullPath => {
  await store.dispatch(initConstantRoute());

  // 分享页（大屏/助手分享）支持匿名访问，不跳登录
  const isSharePage = currentFullPath.includes('/dashboard_share_page/') || currentFullPath.includes('/dashboard-share-page/');

  const isOnLoginPage = currentFullPath.includes('login');
  const isLogin = checkAuthStatus();

  // login 页无条件不调菜单接口，避免过期 token 触发 401 弹出"登录已过期"
  // 登录成功后的路由初始化由 useLogin hook 中的 dispatch(initAuthRoute()) 负责
  if (isOnLoginPage) {
    return null;
  }

  // token 不存在或 JWT 已过期 → 不调菜单接口，重定向到 login
  // 避免过期 token 发起菜单请求后触发 401 弹出"未授权访问"
  if (!isLogin || isJwtExpired(localStg.get('token'))) {
    if (isSharePage) {
      return null; // 分享页允许匿名访问
    }
    const loginRoute: RouteKey = 'login';
    const routeHome = getRouteHome(store.getState());
    const query = getRouteQueryOfLoginRoute(currentFullPath, routeHome as RouteKey);
    return { name: loginRoute, query };
  }

  // 非 login 页且 token 有效 → 初始化动态路由（调菜单接口）
  await store.dispatch(initAuthRoute());

  return null;
};

/**
 * create route guard
 *
 * @param router router instance 路由守卫
 */
export const createRouteGuard: BeforeEach = (to, _, blockerOrJump) => {
  // 第一步：白名单检查
  const whiteList: any[] = ['login', 'not-found', '403'];

  if (whiteList.includes(to.name)) {
    return blockerOrJump();
  }

  // 第三步
  window.NProgress?.start?.();
  store.dispatch(showPageLoading());

  const notFoundRoute: RouteKey = 'not-found';

  const isNotFoundRoute = to.name === notFoundRoute;

  const checkRouteExistence = (routeName: RouteKey) => {
    return routeName && getIsAuthRouteExist(routeName);
  };

  // it is captured by the "not-found" route, then check whether the route exists
  if (isNotFoundRoute) {
    if (!to.name || !checkRouteExistence(to.name as RouteKey)) {
      return blockerOrJump();
    }
    const noPermissionRoute: RouteKey = '403';
    // If the route exists but no permission, redirect to 403
    return blockerOrJump({ name: noPermissionRoute });
  }

  const rootRoute: RouteKey = 'root';
  const noAuthorizationRoute: RouteKey = '403';

  const needLogin = qiankunWindow.__POWERED_BY_QIANKUN__ ? false : !to.meta.constant;
  const routeRoles = to.meta.roles || [];

  const hasRole = selectUserInfo(store.getState()).roles.some(role => routeRoles.includes(role));

  const hasAuth = qiankunWindow.__POWERED_BY_QIANKUN__
    ? true
    : store.dispatch(isStaticSuper()) || !routeRoles.length || hasRole;

  const routeSwitches: CommonType.StrategicPattern[] = [
    // if it is login route when logged in, then switch to the root page
    {
      callback: () => {
        return blockerOrJump({ name: rootRoute });
      },
      condition: Boolean(localStg.get('token')) && to.path.includes('login')
    },
    // if it is constant route, then it is allowed to access directly
    {
      callback: () => {
        return handleRouteSwitch(to, blockerOrJump);
      },
      condition: !needLogin
    },
    // if the user is logged in and has authorization, then it is allowed to access
    {
      callback: () => {
        return handleRouteSwitch(to, blockerOrJump);
      },
      condition: needLogin && hasAuth
    },
    // if the user is logged in but does not have authorization, then switch to the 403 page
    {
      callback: () => {
        return blockerOrJump({ name: noAuthorizationRoute });
      },
      condition: needLogin && !hasAuth
    }
  ];

  // Find the first matching condition and execute its action

  const executeRouteSwitch = routeSwitches.find(({ condition }) => condition)?.callback || blockerOrJump;

  return executeRouteSwitch();
};

function handleRouteSwitch(to: RouteLocationNormalizedLoaded, NavigationGuardNext: NavigationGuardNext) {
  // route with href
  if (to.meta.href) {
    window.open(to.meta.href, '_blank');

    return NavigationGuardNext(true);
  }

  return NavigationGuardNext();
}

export const afterEach: AfterEach = to => {
  const { i18nKey, title } = to.meta;

  const documentTitle = i18nKey ? $t(i18nKey) : title;
  document.title = documentTitle ?? 'React-Soybean';
  window.NProgress?.done?.();
  store.dispatch(hidePageLoading());
};

function getRouteQueryOfLoginRoute(fullPath: string, routeHome: RouteKey) {
  const [redirectPath, redirectQuery] = fullPath.split('?');
  const redirectName = getRouteName(redirectPath as RoutePath);

  const isRedirectHome = routeHome === redirectName;

  const query: LocationQuery = !isRedirectHome ? { redirect: fullPath } : {};

  if (isRedirectHome && redirectQuery) {
    query.redirect = `/?${redirectQuery}`;
  }

  return query;
}

/**
 * Get is auth route exist
 *
 * @param routePath Route path
 */
function getIsAuthRouteExist(key: RouteKey) {
  const routeName = getRoutePath(key);
  if (!routeName) {
    return false;
  }
  return true;
}
