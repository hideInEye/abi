import type { CustomRoute, ElegantConstRoute, LastLevelRouteKey, RouteKey } from '@elegant-router/types';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from '@reduxjs/toolkit';

import { SUB_APP_TOP_LEVEL_WHITE_ROUTE_NAMES } from '@/constants/sub-app';
import { router } from '@/router';
import { getRoutePath } from '@/router/elegant/transform';
import { createStaticRoutes } from '@/router/routes';
import { ROOT_ROUTE } from '@/router/routes/builtin';
import { getAllSpaceMenuApi, getUserSystemMenuApi } from '@/service/api';
import { isStaticSuper, selectUserInfo } from '@/store/slice/auth';
import { initHomeTab } from '@/store/slice/tab';
import { convertRuoYiToSoybean } from '@/utils/router';

import type { AppThunk } from '../..';
import { createAppSlice } from '../../createAppSlice';

import { filterAuthRoutesByRoles, getCacheRouteNames, sortRoutesByOrder } from './shared';

/** 移除 workbench/component 的 index route（自动生成的重定向） */
const NO_REDIRECT_ROUTE_NAMES = ['workbench', 'component'];
function cleanIndexRedirectRoutes(routes: any[]) {
  routes.forEach((r: any) => {
    if (NO_REDIRECT_ROUTE_NAMES.includes(r.id) && Array.isArray(r.children)) {
      r.children = r.children.filter((c: any) => !c.index);
    }
    if (Array.isArray(r.children)) {
      cleanIndexRedirectRoutes(r.children);
    }
  });
}

interface InitialStateType {
  authRoutes: ElegantConstRoute[];
  cacheRoutes: RouteKey[];
  constantRoutes: ElegantConstRoute[];
  isInitAuthRoute: boolean;
  isInitConstantRoute: boolean;
  removeCacheKey: RouteKey | null;
  routeHome: string;
  sortRoutes: ElegantConstRoute[];
}

const initialState: InitialStateType = {
  /** auth routes */
  authRoutes: [],
  cacheRoutes: [],
  constantRoutes: [],
  isInitAuthRoute: false,
  isInitConstantRoute: false,
  removeCacheKey: null,
  /** Home route key */
  routeHome: import.meta.env.VITE_ROUTE_HOME,
  sortRoutes: []
};

export const routeSlice = createAppSlice({
  initialState,
  name: 'route',
  reducers: create => ({
    addCacheRoutes: create.reducer((state, { payload }: PayloadAction<RouteKey>) => {
      state.cacheRoutes.push(payload);
    }),

    /** Get global menus */
    addSortRoutes: create.reducer((state, { payload }: PayloadAction<ElegantConstRoute[]>) => {
      state.sortRoutes.push(...payload);
    }),
    removeCacheRoutes: create.reducer((state, { payload }: PayloadAction<RouteKey>) => {
      state.cacheRoutes = state.cacheRoutes.filter(route => route !== payload);
    }),

    resetRoute: create.reducer(() => initialState),

    /** auth routes */
    setAuthRoutes: create.reducer((state, { payload }: PayloadAction<ElegantConstRoute[]>) => {
      const authRoutesMap = new Map<string, ElegantConstRoute>([]);
      payload.forEach(route => {
        authRoutesMap.set(route.name, route);
      });
      state.authRoutes = Array.from(authRoutesMap.values());
    }),

    setCacheRoutes: create.reducer((state, { payload }: PayloadAction<RouteKey[]>) => {
      state.cacheRoutes = payload;
    }),

    /** add constant routes */
    setConstantRoutes: create.reducer((state, { payload }: PayloadAction<ElegantConstRoute[]>) => {
      const constantRoutesSet = new Set<ElegantConstRoute>(payload);
      state.constantRoutes = Array.from(constantRoutesSet);
    }),

    setIsInitAuthRoute: create.reducer((state, { payload }: PayloadAction<boolean>) => {
      state.isInitAuthRoute = payload;
    }),
    setIsInitConstantRoute: create.reducer((state, { payload }: PayloadAction<boolean>) => {
      state.isInitConstantRoute = payload;
    }),
    setRemoveCacheKey: create.reducer((state, { payload }: PayloadAction<RouteKey | null>) => {
      state.removeCacheKey = payload;
    }),

    /** Set route home */
    setRouteHome: create.reducer((state, { payload }: PayloadAction<LastLevelRouteKey>) => {
      state.routeHome = payload;
    }),

    setSortRoutes: create.reducer((state, { payload }: PayloadAction<ElegantConstRoute[]>) => {
      state.sortRoutes = payload;
    })
  }),
  selectors: {
    getAllRoutes: createSelector(
      [(state: InitialStateType) => state.constantRoutes, (state: InitialStateType) => state.authRoutes],
      (constantRoutes, authRoutes) => [...constantRoutes, ...authRoutes]
    ),
    getAuthRoutes: route => route.authRoutes,
    getConstantRoutes: route => route.constantRoutes,
    getIsInitConstantRoute: route => route.isInitConstantRoute,
    getRemoveCacheKey: state => state.removeCacheKey,
    getRouteHome: route => route.routeHome,
    getSortRoutes: route => route.sortRoutes,
    selectCacheRoutes: state => state.cacheRoutes
  }
});

export const {
  addCacheRoutes,
  addSortRoutes,
  removeCacheRoutes,
  resetRoute,
  setAuthRoutes,
  setCacheRoutes,
  setConstantRoutes,
  setIsInitAuthRoute,
  setIsInitConstantRoute,
  setRemoveCacheKey,
  setRouteHome,
  setSortRoutes
} = routeSlice.actions;

export const {
  getAllRoutes,
  getAuthRoutes,
  getConstantRoutes,
  getIsInitConstantRoute,
  getRemoveCacheKey,
  getRouteHome,
  getSortRoutes,
  selectCacheRoutes
} = routeSlice.selectors;

const authRouteMode = import.meta.env.VITE_AUTH_ROUTE_MODE;
const constantRouteMode = import.meta.env.VITE_CONSTANT_ROUTE_MODE;

function filterBuiltinDashboardRoutes(routes: any[]): any[] {
  return routes
    .filter(route => route?.name !== 'designer' && route?.name !== 'view' && route?.path !== '/designer' && route?.path !== '/view')
    .map(route => {
      if (route?.children?.length) {
        return {
          ...route,
          children: filterBuiltinDashboardRoutes(route.children)
        };
      }
      return route;
    });
}

function isRouteExistByName(routes: ElegantConstRoute[], routeName: string): boolean {
  return routes.some(route => {
    if (route.name === routeName) return true;
    if (route.children?.length) return isRouteExistByName(route.children as ElegantConstRoute[], routeName);
    return false;
  });
}

function appendSubAppWhiteRoutes(routes: ElegantConstRoute[]): ElegantConstRoute[] {
  const { authRoutes: staticAuthRoutes } = createStaticRoutes();
  const missingRoutes = staticAuthRoutes.filter(route => {
    return (
      SUB_APP_TOP_LEVEL_WHITE_ROUTE_NAMES.includes(route.name as (typeof SUB_APP_TOP_LEVEL_WHITE_ROUTE_NAMES)[number]) &&
      !isRouteExistByName(routes, String(route.name))
    );
  });

  if (!missingRoutes.length) return routes;

  return [...routes, ...missingRoutes];
}

/**
 * Get cache routes
 *
 * @param routes Vue routes
 */
export const getCacheRoutes =
  (routes: ElegantConstRoute[]): AppThunk =>
    dispatch => {
      const alls = getCacheRouteNames(routes);

      dispatch(setCacheRoutes(alls));
    };

const handleConstantOrAuthRoutes =
  (mode: 'auth' | 'constant'): AppThunk =>
    (dispatch, getState) => {
      let routes: ElegantConstRoute[];
      if (mode === 'constant') {
        routes = getConstantRoutes(getState());
      } else {
        routes = getAuthRoutes(getState());
        const constantRoutes = getConstantRoutes(getState());
        dispatch(setSortRoutes(constantRoutes));
      }

      const sortRoutes = sortRoutesByOrder(routes);

      router.addReactRoutes(sortRoutes);

      // 移除 workbench/component 自动生成的 index route 重定向
      cleanIndexRedirectRoutes((router.reactRouter as any).routes);

      dispatch(addSortRoutes(sortRoutes));

      dispatch(getCacheRoutes(sortRoutes));
    };

export const initConstantRoute = (): AppThunk => async dispatch => {
  const staticRoute = createStaticRoutes();

  if (constantRouteMode === 'static') {
    dispatch(setConstantRoutes(staticRoute.constantRoutes));
  } else {
    // 先初始化常量路由：在页面中通常是固定死的 此处改为取本地资源文件 不从接口获取
    dispatch(setConstantRoutes(staticRoute.constantRoutes));
    // const { data, error } = await fetchGetConstantRoutes();
    // if (!error) {
    //   dispatch(setConstantRoutes(data));
    // } else {
    //   dispatch(setConstantRoutes(staticRoute.constantRoutes));
    // }
  }

  dispatch(handleConstantOrAuthRoutes('constant'));

  dispatch(setIsInitConstantRoute(true));
};

const initStaticAuthRoute = (): AppThunk => (dispatch, getState) => {
  const { authRoutes: staticAuthRoutes } = createStaticRoutes();

  if (dispatch(isStaticSuper())) {
    dispatch(setAuthRoutes(staticAuthRoutes));
  } else {
    const userInfo = selectUserInfo(getState());
    const filteredAuthRoutes = filterAuthRoutesByRoles(staticAuthRoutes, userInfo.roles);
    dispatch(setAuthRoutes(filteredAuthRoutes));
  }

  dispatch(handleConstantOrAuthRoutes('auth'));
  dispatch(setIsInitAuthRoute(true));
};

export const resetRouteStore = (): AppThunk => async dispatch => {
  router.resetRoute();
  dispatch(resetRoute());

  // Ensure constant routes are initialized before returning so callers can
  // safely navigate relying on the constant route table being present.
  await dispatch(initConstantRoute());
};

/** Init dynamic auth route */
const initDynamicAuthRoute = (): AppThunk => async dispatch => {
  // const { data, error } = await fetchGetUserRoutes();
  // 1：获取当前用户下的菜单列表：
  const { data, error } = await getUserSystemMenuApi();
  // 2：获取当前用户下所有的空间列表：
  const { data: spaceData, error: spaceError } = await getAllSpaceMenuApi();
  if (!error) {
    // 路由处理格式修改：若依=>Elegant Router
    let soybeanRoutes = [];
    if (!spaceError) {
      soybeanRoutes = convertRuoYiToSoybean([...data, ...spaceData]);
    } else {
      soybeanRoutes = convertRuoYiToSoybean(data);
    }

    soybeanRoutes = filterBuiltinDashboardRoutes(soybeanRoutes);
    soybeanRoutes = appendSubAppWhiteRoutes(soybeanRoutes);

    dispatch(setAuthRoutes(soybeanRoutes));

    dispatch(handleConstantOrAuthRoutes('auth'));

    // eslint-disable-next-line
    const home = (Array.isArray(soybeanRoutes[0].children) && soybeanRoutes[0].children[0]) ? soybeanRoutes[0].children[0].name : soybeanRoutes[0].name;
    dispatch(setRouteHome(home));

    handleUpdateRootRouteRedirect(home);

    dispatch(setIsInitAuthRoute(true));
  } else {
    // if fetch user routes failed, reset store
    dispatch(resetRouteStore());
  }
};

// 初始化授权路由：
export const initAuthRoute = (): AppThunk => async (dispatch, getState) => {
  if (authRouteMode === 'static') {
    dispatch(initStaticAuthRoute());
  } else {
    await dispatch(initDynamicAuthRoute());
  }
  const routeHomeName = getRouteHome(getState());

  const homeRoute = router.getRouteByName(routeHomeName);

  if (homeRoute) dispatch(initHomeTab({ homeRouteName: routeHomeName as LastLevelRouteKey, route: homeRoute }));
};

/**
 * Update root route redirect when auth route mode is dynamic
 *
 * @param redirectKey Redirect route key
 */
function handleUpdateRootRouteRedirect(redirectKey: LastLevelRouteKey) {
  const redirect = redirectKey === 'share-manage_my-share' ? 'share-manage/my-share' : getRoutePath(redirectKey);

  if (redirect) {
    const rootRoute: CustomRoute = { ...ROOT_ROUTE, redirect };

    router.removeRoute(rootRoute.name);

    router.addReactRoutes([rootRoute]);
  }
}

/**
 * Is cached route
 *
 * @param routeKey
 */
export const isCachedRoute =
  (routeKey: RouteKey): AppThunk<boolean> =>
    (_, getState) => {
      return selectCacheRoutes(getState()).includes(routeKey);
    };
