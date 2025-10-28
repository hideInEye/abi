import type { RouteKey, RoutePath } from '@elegant-router/types';
import type {
  AfterEach,
  BeforeEach,
  Init,
  LocationQuery,
  NavigationGuardNext,
  RouteLocationNamedRaw,
  RouteLocationNormalizedLoaded
} from '@sa/simple-router';
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';

import { $t } from '@/locales';
import { getRouteName, getRoutePath } from '@/router/elegant/transform';
import { store } from '@/store';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { isStaticSuper, selectUserInfo } from '@/store/slice/auth';
import { getRouteHome, initAuthRoute, initConstantRoute } from '@/store/slice/route';
import { localStg } from '@/utils/storage';
import { checkAuthStatus } from './authGuard';

export const init: Init = async currentFullPath => {
  await store.dispatch(initConstantRoute());

  const isLogin = checkAuthStatus();

  if (!isLogin) {
    const loginRoute: RouteKey = 'login';
    const routeHome = getRouteHome(store.getState());

    const query = getRouteQueryOfLoginRoute(currentFullPath, routeHome as RouteKey);

    const location: RouteLocationNamedRaw = {
      name: loginRoute,
      query
    };

    return location;
  }

  await store.dispatch(initAuthRoute());

  if (currentFullPath.includes('login')) {
    return { name: 'root', replace: true };
  }

  return null;
};

/**
 * create route guard
 *
 * @param router router instance 路由守卫
 */
export const createRouteGuard: BeforeEach = (to, _, blockerOrJump) => {
  // 第一步：白名单检查
  const whiteList: any[] = ['login', 'pwd-login', 'code-login', 'register', 'reset-pwd', 'not-found', '403'];

  if (whiteList.includes(to.name)) {
    return blockerOrJump();
  }

  // 第三步
  window.NProgress?.start?.();
  import('@/store').then(({ store }) => {
    import('@/store/slice/app/loadingSlice').then(({ showPageLoading }) => {
      store.dispatch(showPageLoading());
    });
  });

  const notFoundRoute: RouteKey = 'not-found';

  const isNotFoundRoute = to.name === notFoundRoute;

  const checkRouteExistence = (routeName: RouteKey) => {
    return routeName && getIsAuthRouteExist(routeName);
  };

  const loginStatus = Boolean(localStg.get('token'));
  if (!loginStatus && to.name !== 'login') {
    return blockerOrJump({
      name: 'login',
      query: {
        redirect: to.fullPath
      }
    });
  }

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
  const loginRoute: RouteKey = 'login';
  const noAuthorizationRoute: RouteKey = '403';

  const isLogin = checkAuthStatus();
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
      condition: isLogin && to.path.includes('login')
    },
    // if it is constant route, then it is allowed to access directly
    {
      callback: () => {
        return handleRouteSwitch(to, blockerOrJump);
      },
      condition: !needLogin
    },
    // if the route need login but the user is not logged in, then switch to the login page
    {
      callback: () => {
        return blockerOrJump({ name: loginRoute, query: { redirect: to.fullPath } });
      },
      condition: !isLogin && needLogin
    },
    // if the user is logged in and has authorization, then it is allowed to access
    {
      callback: () => {
        return handleRouteSwitch(to, blockerOrJump);
      },
      condition: isLogin && needLogin && hasAuth
    },
    // if the user is logged in but does not have authorization, then switch to the 403 page
    {
      callback: () => {
        return blockerOrJump({ name: noAuthorizationRoute });
      },
      condition: isLogin && needLogin && !hasAuth
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
  import('@/store').then(({ store }) => {
    import('@/store/slice/app/loadingSlice').then(({ hidePageLoading }) => {
      store.dispatch(hidePageLoading());
    });
  });
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
