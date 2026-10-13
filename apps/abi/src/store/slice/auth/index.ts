import type { PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from '@reduxjs/toolkit';

import { fetchGetUserInfo, fetchLogin } from '@/service/api/platform';
import { localStg, loadLocalforage } from '@/utils/storage';

import type { AppThunk } from '../..';
import { createAppSlice } from '../../createAppSlice';
import { resetRouteStore } from '../route';
import { clearTabs } from '../tab';
import { resetTheme } from '../theme';

import { clearAuthStorage, getToken, getUserInfo } from './shared';
import { message } from 'antd';
import { setSpaceHidden } from '../app';

// perform thorough cleanup of storages (localStg/localStorage/sessionStorage/localforage)
async function performLogoutCleanup() {
  const prefix = import.meta.env.VITE_STORAGE_PREFIX || '';
  const debugRemoved: string[] = [];
  await removeWellKnownKeys(prefix, debugRemoved);
  await cleanupWebStorage(prefix, debugRemoved);
  await cleanupLocalforageKeys(prefix, debugRemoved);

  // try {
  //   // eslint-disable-next-line no-console
  //   console.info('performLogoutCleanup removed keys:', Array.from(new Set(debugRemoved)));
  // } catch {}
}

async function removeWellKnownKeys(prefix: string, debugRemoved: string[]) {
  const wellKnown = ['globalTabs', 'token', 'refreshToken', 'userInfo', 'spaceId', 'spaceName', 'userId'];
  for (const k of wellKnown) {
    try {
      localStg.remove(k as any);
      debugRemoved.push(`${prefix}${k}`);
    } catch {}
    try {
      window.localStorage.removeItem(k);
    } catch {}
    try {
      window.sessionStorage.removeItem(k);
    } catch {}
  }
}

async function cleanupWebStorage(prefix: string, debugRemoved: string[]) {
  try {
    for (let i = window.localStorage.length - 1; i >= 0; ) {
      const key = window.localStorage.key(i) || '';
      if (/globalTabs|token|userInfo|refreshToken|spaceId|spaceName|userId/i.test(key) || (prefix && key.startsWith(prefix))) {
        window.localStorage.removeItem(key);
        debugRemoved.push(key);
      } else {
        i -= 1;
      }
    }
  } catch {}

  try {
    for (let i = window.sessionStorage.length - 1; i >= 0; ) {
      const key = window.sessionStorage.key(i) || '';
      if (/globalTabs|token|userInfo|refreshToken|spaceId|spaceName|userId/i.test(key) || (prefix && key.startsWith(prefix))) {
        window.sessionStorage.removeItem(key);
        debugRemoved.push(key);
      } else {
        i -= 1;
      }
    }
  } catch {}
}

async function cleanupLocalforageKeys(prefix: string, debugRemoved: string[]) {
  try {
    const localforage = await loadLocalforage();
    const keys = await localforage.keys();
    await Promise.all(
      keys.map(k => {
        const s = String(k);
        if (/globalTabs|token|userInfo|refreshToken|spaceId|spaceName|userId/i.test(s) || (prefix && s.startsWith(prefix))) {
          debugRemoved.push(s);
          return localforage.removeItem(k as any);
        }
        return Promise.resolve();
      })
    );
  } catch {}
}

const initialState = {
  token: getToken(),
  userInfo: getUserInfo()
};

type AuthState = typeof initialState;

export const authSlice = createAppSlice({
  initialState,
  name: 'auth',
  reducers: create => ({
    login: create.asyncThunk(
      async ({ password, username, code, uuid }: { password: string; username: string; code?: string; uuid?: string }, { dispatch }) => {
        try {
          const { encrypt } = await import('@/utils/jsencrypt');
          const psd = encrypt(password) as string;
          const { data, error } = await fetchLogin(username, psd, code, uuid);

          if (error) {
            clearAuthStorage();
            return false;
          }

          const loginToken = {
            ...data,
            refreshToken: data?.refresh_token || '',
            token: data?.access_token || '',
            userId: data?.userId || ''
          };

          // 1. stored in the localStorage, the later requests need it in headers
          localStg.set('token', loginToken.token);
          localStg.set('refreshToken', loginToken.refreshToken);
          localStg.set('userId', loginToken.userId);

          const { error: userInfoError, response } = await fetchGetUserInfo();
          if (userInfoError) {
            clearAuthStorage();
            return false;
          }

          const user = (response?.data as any)?.user;
          const roles = Array.isArray(user?.roles) ? user.roles : [];
          const hasEnabledRole = roles.some((item: any) => String(item?.status) === '0');

          if (!hasEnabledRole) {
            clearAuthStorage();
            message.error('未分配角色无法登陆您当前账号未分配任何角色，无法登录系统。请联系系统管理员为您分配相应角色后再试。');
            return false;
          }

          // 2. store user info
          localStg.set('userInfo', user);
          dispatch(resetTheme());
          return {
            token: loginToken.token,
            userInfo: user
          };
        } catch {
          clearAuthStorage();
          return false;
        }
      },

      {
        fulfilled: (state, { payload }) => {
          if (payload) {
            state.token = payload.token;
            state.userInfo = payload.userInfo;
          } else {
            state.token = '';
            state.userInfo = {
              buttons: [],
              roles: [],
              userId: '',
              userName: ''
            };
          }
        }
      }
    ),
    // resetAuth: create.reducer(() => initialState),
    resetAuth: create.reducer(() => {
      return {
        token: '',
        userInfo: {
          buttons: [],
          roles: [],
          userId: '',
          userName: ''
        }
      };
    }),
    setAuthState: create.reducer((state, { payload }: PayloadAction<AuthState>) => {
      state.token = payload.token;
      state.userInfo = payload.userInfo;
    })
  }),
  selectors: {
    selectToken: auth => auth.token,
    selectUserInfo: auth => auth.userInfo
  }
});
export const { selectToken, selectUserInfo } = authSlice.selectors;
const { setAuthState } = authSlice.actions;
export const { login, resetAuth } = authSlice.actions;

export const syncAuthFromStorage = (): AppThunk => dispatch => {
  const token = getToken();
  dispatch(
    setAuthState({
      token,
      userInfo: getUserInfo()
    })
  );
  if (token) dispatch(resetTheme());
};
// We can also write thunks by hand, which may contain both sync and async logic.
// Here's an example of conditionally dispatching actions based on current state.
export const getUerName = (): AppThunk<string> => (_, getState) => {
  const pass = selectToken(getState());

  return pass ? selectUserInfo(getState()).userName : '';
};

/** is super role in static route */

export const isStaticSuper = (): AppThunk<boolean> => (_, getState) => {
  const { roles } = selectUserInfo(getState());

  const { VITE_AUTH_ROUTE_MODE, VITE_STATIC_SUPER_ROLE } = import.meta.env;
  return VITE_AUTH_ROUTE_MODE === 'static' && roles.includes(VITE_STATIC_SUPER_ROLE);
};

/** Reset auth store */
export const resetStore = (): AppThunk => async dispatch => {
  // Clear simple auth storage first
  clearAuthStorage();

  // Prevent beforeunload handlers from persisting stale data during logout navigation
  try {
    (window as any).__SKIP_CACHE_ON_UNLOAD = true;
  } catch {}
  try {
    await performLogoutCleanup();
  } catch {}

  // Reset in-memory auth
  dispatch(resetAuth());

  dispatch(setSpaceHidden(false))

  // Reset route and tabs
  await dispatch(resetRouteStore());
  // dispatch(cacheTabs());
  await dispatch(clearTabs());

  // call getUerName (sync) for logging/debug if needed
  try {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    Promise.resolve(dispatch(getUerName()));
  } catch {}

  // Navigation is handled by the caller, so token cleanup has a single responsibility.
};

/** Is login */
export const getIsLogin = createSelector([selectToken], token => Boolean(token));
