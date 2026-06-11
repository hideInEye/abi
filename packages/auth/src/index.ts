export interface AuthRedirectContext {
  preserveRedirect: boolean;
  redirectPath?: string;
  reason: 'logout' | 'unauthorized';
}

export interface AuthNoticeContext {
  message: string;
  redirectDelay: number;
  title: string;
}

export interface AuthUnauthorizedOptions {
  message?: string;
  preserveRedirect?: boolean;
  redirectDelay?: number;
  redirectPath?: string;
  showNotice?: boolean;
  title?: string;
}

export interface AuthLogoutOptions {
  preserveRedirect?: boolean;
  redirectPath?: string;
}

export interface AuthManagerOptions {
  clearAuth: () => Promise<void> | void;
  defaultNoticeMessage?: string;
  defaultNoticeTitle?: string;
  defaultRedirectDelay?: number;
  getCurrentPath?: () => string;
  getToken: () => unknown;
  notify?: (context: AuthNoticeContext) => Promise<void> | void;
  redirectToLogin: (context: AuthRedirectContext) => Promise<void> | void;
  stateKey?: string;
}

interface AuthState {
  handling: boolean;
  redirecting: boolean;
  timer?: ReturnType<typeof setTimeout>;
}

const DEFAULT_NOTICE_MESSAGE = '登录状态已过期，请重新登录，即将跳转到登录页。';
const DEFAULT_NOTICE_TITLE = '登录提醒';
const DEFAULT_REDIRECT_DELAY = 1800;
const DEFAULT_STATE_KEY = '__SA_AUTH_UNAUTHORIZED_STATE__';
const INVALID_TOKEN_VALUES = new Set(['', 'null', 'undefined']);

const memoryStates = new Map<string, AuthState>();

function isObjectValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function tryReadTokenFromObject(tokenLike: Record<string, unknown>) {
  const tokenKeys = ['token', 'access_token', 'accessToken'];

  for (const tokenKey of tokenKeys) {
    const tokenValue = tokenLike[tokenKey];
    const normalizedToken = normalizeToken(tokenValue);

    if (normalizedToken) {
      return normalizedToken;
    }
  }

  return '';
}

function getGlobalAuthState(stateKey: string): AuthState {
  const globalScope = globalThis as typeof globalThis & Record<string, AuthState | undefined>;
  const globalState = globalScope[stateKey];

  if (globalState) {
    return globalState;
  }

  const initialState: AuthState = {
    handling: false,
    redirecting: false
  };

  try {
    globalScope[stateKey] = initialState;
    return initialState;
  } catch {
    memoryStates.set(stateKey, initialState);
    return initialState;
  }
}

function getAuthState(stateKey: string): AuthState {
  const memoryState = memoryStates.get(stateKey);

  if (memoryState) {
    return memoryState;
  }

  return getGlobalAuthState(stateKey);
}

function clearAuthTimer(state: AuthState) {
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = undefined;
  }
}

export function normalizeToken(tokenLike: unknown): string {
  if (typeof tokenLike === 'string') {
    const trimmedToken = tokenLike.trim();

    if (INVALID_TOKEN_VALUES.has(trimmedToken)) {
      return '';
    }

    try {
      const parsedToken = JSON.parse(trimmedToken) as unknown;

      if (parsedToken !== tokenLike) {
        return normalizeToken(parsedToken);
      }
    } catch {}

    return trimmedToken;
  }

  if (typeof tokenLike === 'number' || typeof tokenLike === 'bigint') {
    return String(tokenLike);
  }

  if (isObjectValue(tokenLike)) {
    return tryReadTokenFromObject(tokenLike);
  }

  return '';
}

export function createAuthorizationHeader(tokenLike: unknown): string | null {
  const token = normalizeToken(tokenLike);

  return token ? `Bearer ${token}` : null;
}

export function createAuthManager(options: AuthManagerOptions) {
  const stateKey = options.stateKey || DEFAULT_STATE_KEY;
  const defaultRedirectDelay = options.defaultRedirectDelay ?? DEFAULT_REDIRECT_DELAY;

  const getCurrentPath = () => {
    try {
      return options.getCurrentPath?.() || '';
    } catch {
      return '';
    }
  };

  const runRedirect = async (state: AuthState, context: AuthRedirectContext, clearAuth = false) => {
    if (state.redirecting) return;

    state.redirecting = true;
    clearAuthTimer(state);

    if (clearAuth) {
      try {
        await options.clearAuth();
      } catch {
        // Auth cleanup should not block redirecting to login.
      }
    }

    await options.redirectToLogin(context);
  };

  const handleUnauthorized = async (unauthorizedOptions: AuthUnauthorizedOptions = {}) => {
    const state = getAuthState(stateKey);

    if (state.handling) return false;

    state.handling = true;
    clearAuthTimer(state);

    const redirectDelay = unauthorizedOptions.redirectDelay ?? defaultRedirectDelay;
    const preserveRedirect = unauthorizedOptions.preserveRedirect ?? true;
    const redirectPath = unauthorizedOptions.redirectPath || getCurrentPath();

    if (unauthorizedOptions.showNotice ?? true) {
      try {
        await options.notify?.({
          message: unauthorizedOptions.message || options.defaultNoticeMessage || DEFAULT_NOTICE_MESSAGE,
          redirectDelay,
          title: unauthorizedOptions.title || options.defaultNoticeTitle || DEFAULT_NOTICE_TITLE
        });
      } catch {
        // Notification failure should not block redirecting to login.
      }
    }

    const redirectContext: AuthRedirectContext = {
      preserveRedirect,
      redirectPath: preserveRedirect ? redirectPath : undefined,
      reason: 'unauthorized'
    };

    if (redirectDelay <= 0) {
      await runRedirect(state, redirectContext, true);
    } else {
      state.timer = setTimeout(() => {
        void runRedirect(state, redirectContext, true);
      }, redirectDelay);
    }

    return true;
  };

  const logout = async (logoutOptions: AuthLogoutOptions = {}) => {
    const state = getAuthState(stateKey);
    const preserveRedirect = logoutOptions.preserveRedirect ?? false;
    const redirectPath = logoutOptions.redirectPath || getCurrentPath();

    state.handling = true;
    clearAuthTimer(state);

    await runRedirect(state, {
      preserveRedirect,
      redirectPath: preserveRedirect ? redirectPath : undefined,
      reason: 'logout'
    }, true);
  };

  const getAuthorization = () => createAuthorizationHeader(options.getToken());

  const getAuthorizationHeader = (headerName = 'Authorization') => {
    const authorization = getAuthorization();

    return authorization ? { [headerName]: authorization } : {};
  };

  const hasToken = () => Boolean(normalizeToken(options.getToken()));

  const resetUnauthorizedState = () => {
    const state = getAuthState(stateKey);

    clearAuthTimer(state);
    state.handling = false;
    state.redirecting = false;
  };

  return {
    getAuthorization,
    getAuthorizationHeader,
    handleUnauthorized,
    hasToken,
    logout,
    resetUnauthorizedState
  };
}
