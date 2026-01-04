import { createSelector } from '@reduxjs/toolkit';

import { fetchGetUserInfo, fetchLogin } from '@/service/api/platform';
import { encrypt } from '@/utils/jsencrypt';
import { localStg, localforage } from '@/utils/storage';

import type { AppThunk } from '../..';
import { createAppSlice } from '../../createAppSlice';
import { resetRouteStore } from '../route';
import { clearTabs } from '../tab';

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

  try {
    // eslint-disable-next-line no-console
    console.info('performLogoutCleanup removed keys:', Array.from(new Set(debugRemoved)));
  } catch {}
}

async function removeWellKnownKeys(prefix: string, debugRemoved: string[]) {
  const wellKnown = ['globalTabs', 'token', 'refreshToken', 'userInfo', 'spaceId', 'userId'];
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
      if (/globalTabs|token|userInfo|refreshToken|spaceId|userId/i.test(key) || (prefix && key.startsWith(prefix))) {
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
      if (/globalTabs|token|userInfo|refreshToken|spaceId|userId/i.test(key) || (prefix && key.startsWith(prefix))) {
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
    const keys = await localforage.keys();
    await Promise.all(
      keys.map(k => {
        const s = String(k);
        if (/globalTabs|token|userInfo|refreshToken|spaceId|userId/i.test(s) || (prefix && s.startsWith(prefix))) {
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

export const authSlice = createAppSlice({
  initialState,
  name: 'auth',
  reducers: create => ({
    login: create.asyncThunk(
      async ({ password, userName, code, uuid }: { password: string; userName: string; code?: string; uuid?: string }) => {
        const psd = encrypt(password) as string;
        const { data, error } = await fetchLogin(userName, psd, code, uuid);
        const loginToken = {
          ...data,
          refreshToken: data?.refresh_token || '',
          token: data?.access_token || '',
          userId: data?.userId || ''
        };

        // 1. stored in the localStorage, the later requests need it in headers
        if (!error) {
          localStg.set('token', loginToken.token);
          localStg.set('refreshToken', loginToken.refreshToken);
          localStg.set('userId', loginToken.userId);

          const { error: userInfoError, response } = await fetchGetUserInfo();
          const { user } = response.data as any;
          if (!userInfoError) {
            const { roles } = user
            const isRole = roles.some(item => item.status =='0')
            if(!isRole){
              message.error('未分配角色无法登陆您当前账号未分配任何角色，无法登录系统。请联系系统管理员为您分配相应角色后再试。')
              return false
            }
            // 2. store user info
            localStg.set('userInfo', user);
            return {
              token: loginToken.token,
              userInfo: user
            };
          }
        }

        return false;
      },

      {
        fulfilled: (state, { payload }) => {
          if (payload) {
            state.token = payload.token;
            state.userInfo = payload.userInfo;
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
    })
  }),
  selectors: {
    selectToken: auth => auth.token,
    selectUserInfo: auth => auth.userInfo
  }
});
export const { selectToken, selectUserInfo } = authSlice.selectors;
export const { login, resetAuth } = authSlice.actions;
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

  // Navigate to login (prefer SPA navigation; dynamic import to avoid cycles)
  try {
    const { router } = await import('@/router');
    try {
      await router.push({ name: 'login' });
    } catch (err) {
      // fallback to full redirect
      // eslint-disable-next-line no-console
      console.warn('router.push login failed, falling back to full redirect', err);
      try {
        window.location.assign('/login');
      } catch {
        window.location.replace('/login');
      }
    }
  } catch {
    // if dynamic import fails, do a naive redirect
    try {
      window.location.assign('/login');
    } catch {
      window.location.replace('/login');
    }
  }
};

/** Is login */
export const getIsLogin = createSelector([selectToken], token => Boolean(token));
