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

export interface BrowserAuthEnvironment {
  localStorage: Pick<Storage, 'getItem' | 'removeItem'>;
  location: Pick<Location, 'hash' | 'pathname' | 'search'> & { href: string };
  onTokenExpired?: () => Promise<void> | void;
}

export interface BrowserAuthAdapterOptions {
  authStorageKeys?: readonly string[];
  getEnvironment: () => BrowserAuthEnvironment;
  notify?: (context: AuthNoticeContext) => Promise<void> | void;
  stateKey: string;
  tokenStorageKeys?: readonly string[];
}

interface AuthState {
  handling: boolean;
  redirecting: boolean;
  timer?: ReturnType<typeof setTimeout>;
}

const DEFAULT_NOTICE_MESSAGE = '登录已过期，即将前往登录页 …';
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

export function createBrowserAuthAdapter(options: BrowserAuthAdapterOptions) {
  const tokenStorageKeys = options.tokenStorageKeys || ['SOY-REACT_token', 'token'];
  const authStorageKeys = options.authStorageKeys || [
    'SOY-REACT_token', 'token', 'SOY-REACT_refreshToken', 'refreshToken', 'SOY-REACT_userInfo', 'userInfo'
  ];

  const readAuthToken = () => {
    for (const key of tokenStorageKeys) {
      try {
        const token = normalizeToken(options.getEnvironment().localStorage.getItem(key));
        if (token) return token;
      } catch {}
    }
    return '';
  };

  const manager = createAuthManager({
    clearAuth: () => {
      for (const key of authStorageKeys) {
        try {
          options.getEnvironment().localStorage.removeItem(key);
        } catch {}
      }
    },
    defaultNoticeMessage: DEFAULT_NOTICE_MESSAGE,
    defaultNoticeTitle: DEFAULT_NOTICE_TITLE,
    getCurrentPath: () => {
      const {location} = options.getEnvironment();
      return `${location.pathname}${location.search}${location.hash}`;
    },
    getToken: readAuthToken,
    notify: options.notify,
    redirectToLogin: async ({preserveRedirect, redirectPath}) => {
      const environment = options.getEnvironment();
      if (typeof environment.onTokenExpired === 'function') {
        await environment.onTokenExpired();
        return;
      }
      environment.location.href = preserveRedirect && redirectPath
        ? `/login?redirect=${encodeURIComponent(redirectPath)}`
        : '/login';
    },
    stateKey: options.stateKey
  });

  return {
    authManager: manager,
    getAuthorization: () => createAuthorizationHeader(readAuthToken()),
    handleLoginExpired: (noticeMessage = DEFAULT_NOTICE_MESSAGE) => {
      const hasHostHandler = typeof options.getEnvironment().onTokenExpired === 'function';
      return manager.handleUnauthorized({
        message: noticeMessage,
        redirectDelay: hasHostHandler ? 0 : undefined,
        showNotice: !hasHostHandler
      });
    },
    readAuthToken
  };
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

    try {
      await options.redirectToLogin(context);
    } catch (error) {
      state.handling = false;
      state.redirecting = false;
      throw error;
    }
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
        void runRedirect(state, redirectContext, true).catch(() => {
          // A later unauthorized response may retry after the state is released.
        });
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

export { watchAuthSession } from './sessionSync';
