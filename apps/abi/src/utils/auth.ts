import { createAuthManager } from '@sa/auth';
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';

import { localStg } from './storage';

interface LoginExpiredOptions {
  noticeMessage?: string;
  noticeTitle?: string;
  preserveRedirect?: boolean;
  redirectDelay?: number;
  showNotice?: boolean;
}

const LOGIN_EXPIRED_MESSAGE_KEY = 'login-expired';
const LOGIN_EXPIRED_FLOW_KEY = '__ABI_LOGIN_EXPIRED_FLOW_STATE__';

interface LoginExpiredFlowState {
  handling: boolean;
}

function getLoginExpiredFlowState(): LoginExpiredFlowState {
  const globalScope = globalThis as typeof globalThis & Record<string, LoginExpiredFlowState | undefined>;
  const existingState = globalScope[LOGIN_EXPIRED_FLOW_KEY];

  if (existingState) {
    return existingState;
  }

  const initialState = { handling: false };
  globalScope[LOGIN_EXPIRED_FLOW_KEY] = initialState;

  return initialState;
}

function clearAuthStorageOnly() {
  localStg.remove('token');
  localStg.remove('refreshToken');
  localStg.remove('userId');
  localStg.remove('userInfo');
}

async function resetAuthState() {
  try {
    const [{ store }, { resetStore }] = await Promise.all([
      import('@/store'),
      import('@/store/slice/auth')
    ]);

    await store.dispatch(resetStore());
  } catch {
    // 如果 store 还没有初始化，至少清掉本地登录态。
    clearAuthStorageOnly();
  }
}

function getCurrentPath() {
  return window.location.pathname + (window.location.search || '') + (window.location.hash || '');
}

const BLOCKED_LOGIN_REDIRECT_PATHS = ['/login', '/logout', '/403', '/404'];

function getSafeLoginRedirectPath(redirectPath?: string) {
  if (!redirectPath) return '';

  const trimmedPath = redirectPath.trim();
  if (!trimmedPath || trimmedPath.startsWith('//')) return '';

  try {
    const redirectUrl = new URL(trimmedPath, window.location.origin);
    if (redirectUrl.origin !== window.location.origin) return '';

    const pathname = redirectUrl.pathname;
    const isBlocked = BLOCKED_LOGIN_REDIRECT_PATHS.some(blockedPath => {
      return pathname === blockedPath || pathname.startsWith(`${blockedPath}/`);
    });

    if (isBlocked) return '';

    return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;
  } catch {
    return '';
  }
}

function notifyAuthExpired({
  message,
  redirectDelay
}: {
  message: string;
  redirectDelay: number;
  title: string;
}) {
  window.$message?.warning({
    content: message,
    duration: Math.max(redirectDelay / 1000, 1.5),
    key: LOGIN_EXPIRED_MESSAGE_KEY
  });
}

async function redirectToLogin({
  preserveRedirect,
  redirectPath
}: {
  preserveRedirect: boolean;
  redirectPath?: string;
}) {
  const safeRedirectPath = preserveRedirect ? getSafeLoginRedirectPath(redirectPath) : '';

  if (qiankunWindow.__POWERED_BY_QIANKUN__) {
    const loginUrl = safeRedirectPath ? `/login?redirect=${encodeURIComponent(safeRedirectPath)}` : '/login';
    window.location.href = loginUrl;
    return;
  }

  try {
    const { router } = await import('@/router');
    await router.push(
      safeRedirectPath
        ? {
            name: 'login',
            query: { redirect: safeRedirectPath }
          }
        : { name: 'login' }
    );
  } catch {
    const loginUrl = safeRedirectPath ? `/login?redirect=${encodeURIComponent(safeRedirectPath)}` : '/login';
    window.location.assign(loginUrl);
  }
}

export const authManager = createAuthManager({
  clearAuth: clearAuthStorageOnly,
  defaultNoticeMessage: '登录已过期，即将前往登录页 …',
  defaultNoticeTitle: '登录提醒',
  getCurrentPath,
  getToken: () => localStg.get('token'),
  notify: notifyAuthExpired,
  redirectToLogin,
  stateKey: '__ABI_AUTH_UNAUTHORIZED_STATE__'
});

/**
 * 处理登录状态过期后的跳转
 * @param redirectPath 可选的重定向路径，如果不提供则使用当前页面路径
 */
export async function handleLoginExpired(redirectPath?: string, options: LoginExpiredOptions = {}) {
  const flowState = getLoginExpiredFlowState();

  if (flowState.handling) return false;

  flowState.handling = true;

  return authManager.handleUnauthorized({
    message: options.noticeMessage,
    preserveRedirect: options.preserveRedirect,
    redirectDelay: options.redirectDelay,
    redirectPath,
    showNotice: options.showNotice,
    title: options.noticeTitle
  });
}

export function resetLoginExpiredState() {
  getLoginExpiredFlowState().handling = false;
  authManager.resetUnauthorizedState();
}

export async function logoutNow(redirectPath?: string) {
  await resetAuthState();

  return authManager.logout({
    preserveRedirect: false,
    redirectPath
  });
}

export function hasLoginToken(): boolean {
  return authManager.hasToken();
}
