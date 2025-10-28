import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';

import { store } from '@/store';
import { resetStore } from '@/store/slice/auth';
import { localStg } from '@/utils/storage';

import { fetchLoginChatbiByOnenet, fetchRefreshToken } from '../api';

import type { RequestInstanceState } from './type';

export function getAuthorization() {
  const token = localStg.get('token');
  const Authorization = token ? `Bearer ${token}` : null;

  return Authorization;
}

export function getUserId() {
  return localStg.get('userId');
}

/**
 * refresh token
 *
 * @param axiosConfig - request config when the token is expired
 */
export async function handleRefreshToken() {
  if (qiankunWindow.__POWERED_BY_QIANKUN__) {
    const res = await fetchLoginChatbiByOnenet();
    localStg.set('token', res.data.access_token);
  } else {
    const refreshToken = localStg.get('refreshToken') || '';
    const { data, error } = await fetchRefreshToken(refreshToken);
    if (!error) {
      localStg.set('token', data.token);
      localStg.set('refreshToken', data.refreshToken);
      return true;
    }
  }
  store.dispatch(resetStore());

  return false;
}

export async function handleExpiredRequest(state: RequestInstanceState) {
  if (!state.refreshTokenFn) {
    state.refreshTokenFn = handleRefreshToken();
  }

  const success = await state.refreshTokenFn;

  setTimeout(() => {
    state.refreshTokenFn = null;
  }, 1000);

  return success;
}

export function showErrorMsg(state: RequestInstanceState, message: string) {
  if (!state.errMsgStack?.length) {
    state.errMsgStack = [];
  }

  const isExist = state.errMsgStack.includes(message);

  if (!isExist) {
    state.errMsgStack.push(message);

    window.$message?.error({
      content: message,
      onClose: () => {
        state.errMsgStack = state.errMsgStack.filter(msg => msg !== message);

        setTimeout(() => {
          state.errMsgStack = [];
        }, 5000);
      }
    });
  }
}
