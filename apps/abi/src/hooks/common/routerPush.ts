import type { RouteKey } from '@elegant-router/types';
import { useRoute, useRouter } from '@sa/simple-router';
import type { RouteLocationNamedRaw } from '@sa/simple-router';

import { getChatStandaloneUrl } from '@/utils/chatWindow';
import { localStg } from '@/utils/storage';

interface RouterPushOptions {
  params?: Record<string, string>;
  query?: Record<string, string>;
}

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

function isChatRedirect(redirect: string): boolean {
  if (!redirect) {
    return false;
  }

  return (
    redirect.includes('/chat-ui') ||
    redirect.includes('#/chat/') ||
    redirect.includes('/ai-assistant/conversational-analysis')
  );
}

function buildChatStandaloneRedirectUrl(redirect: string): string {
  const spaceId = parseChatRedirectSpaceId(redirect);
  const fallbackUrl = getChatStandaloneUrl({
    spaceId: spaceId && spaceId !== '0' ? spaceId : undefined
  });

  if (redirect.includes('/chat-ui')) {
    return redirect;
  }

  const hash = redirect.split('#')[1];
  if (hash?.startsWith('/chat/')) {
    const chatHostUrl = fallbackUrl.split('#')[0];
    return `${chatHostUrl}#${hash}`;
  }

  return fallbackUrl;
}

function openStandaloneChatByRedirect(redirect: string) {
  const chatUrl = buildChatStandaloneRedirectUrl(redirect);
  const win = window.open(chatUrl, '_blank', 'noopener,noreferrer');

  if (!win) {
    window.location.replace(chatUrl);
  }
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
    return routerPush('/');
  }

  /**
   * Navigate to login page
   *
   * @param redirectUrl The redirect url, if not specified, it will be the current route fullPath
   */
  async function toLogin(redirectUrl?: string) {
    const options: RouterPushOptions = {};

    const redirect = redirectUrl || route.fullPath;

    options.query = {
      redirect
    };

    return routerPushByKey('login', options);
  }

  /**
   * Redirect from login
   *
   * @param [needRedirect=true] Whether to redirect after login. Default is `true`
   */
  async function redirectFromLogin(needRedirect = true) {
    const redirect = searchParams.get('redirect');

    if (needRedirect && redirect) {
      if (isChatRedirect(redirect)) {
        openStandaloneChatByRedirect(redirect);
        return toHome();
      }

      return routerPush(redirect);
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
