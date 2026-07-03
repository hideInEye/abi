import type { ElegantConstRoute, RouteKey } from '@elegant-router/types';
import { useRoute, useRouter } from '@sa/simple-router';
import type { RouteLocationNamedRaw } from '@sa/simple-router';

import { getRouteName, getRoutePath } from '@/router/elegant/transform';
import { store } from '@/store';
import { getAuthRoutes, getConstantRoutes, getRouteHome } from '@/store/slice/route';
import { getChatStandaloneUrl } from '@/utils/chatWindow';
import { localStg } from '@/utils/storage';

interface RouterPushOptions {
  params?: Record<string, string>;
  query?: Record<string, string>;
}

type AppRouter = ReturnType<typeof useRouter>;

type LoginRedirectTarget =
  | { path: string; type: 'chat' | 'internal' }
  | { type: 'fallback' };

const BLOCKED_LOGIN_REDIRECT_NAMES = new Set(['login', 'logout', '403', 'not-found']);
const BLOCKED_LOGIN_REDIRECT_PATHS = ['/login', '/logout', '/403', '/404'];
const LEGACY_CHAT_ROUTE_NAME = 'ai-assistant_conversational-analysis' as RouteKey;
const LEGACY_CHAT_ROUTE_PATH = '/ai-assistant/conversational-analysis';

function isNormalRole(roles: any[]): boolean {
  if (!Array.isArray(roles) || !roles.length) {
    return true;
  }

  return !roles.some((role) => {
    const roleText = String(
      role?.roleKey ||
        role?.key ||
        role?.roleName ||
        role?.name ||
        role
    ).toLowerCase();

    return (
      roleText.includes('admin') ||
      roleText.includes('super') ||
      roleText.includes('creator') ||
      roleText.includes('管理员') ||
      roleText.includes('超级')
    );
  });
}

function getRedirectUrl(redirect: string) {
  try {
    return new URL(redirect, window.location.origin);
  } catch {
    return null;
  }
}

function hasPathSegment(pathname: string, segment: string) {
  return pathname.split('/').filter(Boolean).includes(segment);
}

function isAiAssistantConversationPath(pathname: string) {
  return pathname === LEGACY_CHAT_ROUTE_PATH || pathname.endsWith(LEGACY_CHAT_ROUTE_PATH);
}

function isChatRedirect(redirect: string): boolean {
  if (!redirect) {
    return false;
  }

  if (redirect.startsWith('#/chat/')) return true;

  const redirectUrl = getRedirectUrl(redirect);
  if (!redirectUrl) return false;

  return (
    hasPathSegment(redirectUrl.pathname, 'chat-ui') ||
    redirectUrl.hash.startsWith('#/chat/') ||
    isAiAssistantConversationPath(redirectUrl.pathname)
  );
}

function getSafeLoginRedirectPath(redirect?: string | null) {
  if (!redirect) return '';

  const trimmedRedirect = redirect.trim();
  if (!trimmedRedirect || trimmedRedirect.startsWith('//')) return '';

  if (trimmedRedirect.startsWith('#/')) {
    return isChatRedirect(trimmedRedirect) ? trimmedRedirect : '';
  }

  let normalizedPath = trimmedRedirect;

  try {
    const redirectUrl = new URL(trimmedRedirect, window.location.origin);
    if (redirectUrl.origin !== window.location.origin) return '';
    normalizedPath = `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;
  } catch {
    return '';
  }

  if (!normalizedPath.startsWith('/')) return '';

  const pathname = getRedirectPathname(normalizedPath);
  if (isBlockedLoginRedirectPath(pathname)) return '';

  return normalizedPath;
}

function isBlockedLoginRedirectPath(pathname: string) {
  return BLOCKED_LOGIN_REDIRECT_PATHS.some(blockedPath => {
    return pathname === blockedPath || pathname.startsWith(`${blockedPath}/`);
  });
}

function getRedirectPathname(redirect: string) {
  if (!redirect || redirect.startsWith('#/')) return '';

  try {
    return new URL(redirect, window.location.origin).pathname;
  } catch {
    return '';
  }
}

function parseChatRedirectSpaceId(redirect: string): string | undefined {
  if (!redirect) {
    return undefined;
  }

  const fromHashMatch = redirect.match(/[?#&]spaceId=([^&#]+)/);
  if (fromHashMatch?.[1]) {
    return decodeURIComponent(fromHashMatch[1]);
  }

  return undefined;
}

function getStoredSpaceId(): string | undefined {
  try {
    const spaceId = localStorage.getItem('spaceId');
    return spaceId && spaceId !== '0' ? spaceId : undefined;
  } catch {
    return undefined;
  }
}

function buildChatStandaloneRedirectUrl(redirect: string): string {
  const spaceId = parseChatRedirectSpaceId(redirect) || getStoredSpaceId();
  const fallbackUrl = getChatStandaloneUrl({
    spaceId: spaceId && spaceId !== '0' ? spaceId : undefined
  });

  const redirectUrl = getRedirectUrl(redirect);
  if (redirectUrl && hasPathSegment(redirectUrl.pathname, 'chat-ui')) {
    return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;
  }

  const hash = redirect.startsWith('#') ? redirect.slice(1) : redirect.split('#')[1];
  if (hash?.startsWith('/chat/')) {
    const chatHostUrl = fallbackUrl.split('#')[0];
    return `${chatHostUrl}#${hash}`;
  }

  return fallbackUrl;
}

function replaceStandaloneChatByRedirect(redirect: string) {
  const chatUrl = buildChatStandaloneRedirectUrl(redirect);
  window.location.replace(chatUrl);
}

function isRouteNameInRoutes(routeName: string, routes: ElegantConstRoute[]): boolean {
  return routes.some(route => {
    if (route.name === routeName) return true;
    if (route.children?.length) return isRouteNameInRoutes(routeName, route.children as ElegantConstRoute[]);
    return false;
  });
}

function getRouteNameByRedirect(router: AppRouter, redirect: string) {
  const pathname = getRedirectPathname(redirect);
  if (!pathname) return '';

  try {
    const redirectUrl = new URL(redirect, window.location.origin);
    const resolvedRoute = router.resolve({
      hash: redirectUrl.hash,
      key: 'login-redirect',
      pathname: redirectUrl.pathname,
      search: redirectUrl.search,
      state: null
    });

    if (resolvedRoute.name && resolvedRoute.name !== 'not-found') {
      return String(resolvedRoute.name);
    }
  } catch {}

  return String(getRouteName(pathname as any) || '');
}

function canAccessRoute(router: AppRouter, redirect: string) {
  const pathname = getRedirectPathname(redirect);
  const routeName = getRouteNameByRedirect(router, redirect);

  if (!routeName) return false;
  if (BLOCKED_LOGIN_REDIRECT_NAMES.has(routeName)) return false;
  if (isBlockedLoginRedirectPath(pathname)) return false;
  if (!router.getRouteByName(routeName)) return false;

  const state = store.getState();
  return (
    isRouteNameInRoutes(routeName, getAuthRoutes(state)) ||
    isRouteNameInRoutes(routeName, getConstantRoutes(state))
  );
}

function canAccessChatRedirect(router: AppRouter, _redirect: string) {
  return canAccessRoute(router, LEGACY_CHAT_ROUTE_PATH);
}

function resolveLoginRedirectTarget(router: AppRouter, redirect?: string | null): LoginRedirectTarget {
  const safeRedirect = getSafeLoginRedirectPath(redirect);
  if (!safeRedirect) return { type: 'fallback' };

  if (isChatRedirect(safeRedirect)) {
    return canAccessChatRedirect(router, safeRedirect)
      ? { path: safeRedirect, type: 'chat' }
      : { type: 'fallback' };
  }

  return canAccessRoute(router, safeRedirect)
    ? { path: safeRedirect, type: 'internal' }
    : { type: 'fallback' };
}

/**
 * Router push
 *
 * Jump to the specified route, it can replace function router.push
 */
export function useRouterPush() {
  const router = useRouter();

  const route = useRoute();

  const [searchParams] = useSearchParams();

  const routerPush = router.push;

  const routerBack = router.back;

  function getLoginFallbackRouteName() {
    return getRouteHome(store.getState()) as RouteKey;
  }

  function getLoginFallbackPath(routeHome = getLoginFallbackRouteName()) {
    const homeRoute = routeHome ? router.getRouteByName(routeHome) : undefined;
    const homePath = homeRoute?.path || getRoutePath(routeHome) || '/';

    return homePath.startsWith('/') ? homePath : `/${homePath}`;
  }

  async function routerPushByKey(key: RouteKey, options?: RouterPushOptions) {
    const { params, query } = options || {};

    const routeLocation: RouteLocationNamedRaw = {
      name: key
    };

    if (Object.keys(query || {}).length) {
      routeLocation.query = query;
    }

    if (Object.keys(params || {}).length) {
      routeLocation.params = params;
    }

    return routerPush(routeLocation);
  }

  /**
   * Get route query of meta by key
   *
   * @param key
   */
  const getRouteQueryOfMetaByKey = (key: string) => {
    const meta = router.getRouteMetaByKey(key);

    const query: Record<string, any> = {};

    meta?.query?.forEach((item: { key: string | number; value: any }) => {
      query[item.key] = item.value;
    });

    return query;
  };

  function routerPushByKeyWithMetaQuery(key: string) {
    const query = getRouteQueryOfMetaByKey(key);

    return routerPushByKey(key as RouteKey, { query });
  }

  async function toHome() {
    const fallbackRouteName = getLoginFallbackRouteName();
    const fallbackPath = getLoginFallbackPath(fallbackRouteName);

    if (fallbackRouteName === LEGACY_CHAT_ROUTE_NAME || isChatRedirect(fallbackPath)) {
      const chatRedirect = fallbackRouteName === LEGACY_CHAT_ROUTE_NAME ? LEGACY_CHAT_ROUTE_PATH : fallbackPath;
      replaceStandaloneChatByRedirect(chatRedirect);
      return true;
    }

    return routerPush(fallbackPath);
  }

  /**
   * Navigate to login page
   *
   * @param redirectUrl The redirect url, if not specified, it will be the current route fullPath
   */
  async function toLogin(redirectUrl?: string) {
    const options: RouterPushOptions = {};

    const redirect = getSafeLoginRedirectPath(redirectUrl || route.fullPath);

    if (redirect) {
      options.query = {
        redirect
      };
    }

    return routerPushByKey('login', options);
  }

  /**
   * Redirect from login
   *
   * @param [needRedirect=true] Whether to redirect after login. Default is `true`
   */
  async function redirectFromLogin(needRedirect = true) {
    const redirect = searchParams.get('redirect');
    const target: LoginRedirectTarget = needRedirect ? resolveLoginRedirectTarget(router, redirect) : { type: 'fallback' };

    if (target.type === 'chat') {
      replaceStandaloneChatByRedirect(target.path);
      return true;
    }

    if (target.type === 'internal') {
      return routerPush(target.path);
    }

    const userInfo: any = localStg.get('userInfo') || {};
    const roles = Array.isArray(userInfo?.roles) ? userInfo.roles : [];

    if (isNormalRole(roles)) {
      return toHome();
    }

    return toHome();
  }

  return {
    redirectFromLogin,
    routerBack,
    routerPush,
    routerPushByKey,
    routerPushByKeyWithMetaQuery,
    toLogin
  };
}
