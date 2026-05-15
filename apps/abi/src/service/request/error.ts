import type { FlatRequestInstance } from '@sa/axios';
import { BACKEND_ERROR_CODE, isBackendCodeIn, parseBackendCodeList } from '@sa/axios';
import type { AxiosError, AxiosInstance, AxiosResponse } from 'axios';

import { $t } from '@/locales';
import { store } from '@/store';
import { resetStore } from '@/store/slice/auth';
// import { handleLoginExpired } from '@/utils/auth';

import { getAuthorization, handleExpiredRequest, showErrorMsg } from './shared';
import type { RequestInstanceState } from './type';

const logoutCodes = parseBackendCodeList(import.meta.env.VITE_SERVICE_LOGOUT_CODES);
const modalLogoutCodes = parseBackendCodeList(import.meta.env.VITE_SERVICE_MODAL_LOGOUT_CODES);
const expiredTokenCodes = parseBackendCodeList(import.meta.env.VITE_SERVICE_EXPIRED_TOKEN_CODES);
/** - 后端错误处理 */
export async function backEndFail(
  response: AxiosResponse<App.Service.Response<unknown>, any>,
  instance: AxiosInstance,
  request: FlatRequestInstance<RequestInstanceState, App.Service.Response<unknown>>
) {
  // 测试连接接口不跳转登录页
  // const isTestConnect = response.config?.url?.includes('model/test/connect');
  // if (isTestConnect) {
  //   return null;
  // }
  async function handleLogout() {
    await store.dispatch(resetStore());
    // handleLoginExpired();
  }

  async function logoutAndCleanup() {
    await handleLogout();
    window.removeEventListener('beforeunload', handleLogout);

    request.state.errMsgStack = request.state.errMsgStack.filter(msg => msg !== response.data.msg);
  }

  // when the backend response code is in `logoutCodes`, it means the user will be logged out and redirected to login page
  if (isBackendCodeIn(response.data, logoutCodes)) {
    await handleLogout();
    return null;
  }

  // when the backend response code is in `modalLogoutCodes`, it means the user will be logged out by displaying a modal
  if (isBackendCodeIn(response.data, modalLogoutCodes) && !request.state.errMsgStack?.includes(response.data.msg)) {
    request.state.errMsgStack = [...(request.state.errMsgStack || []), response.data.msg];

    // prevent the user from refreshing the page
    window.addEventListener('beforeunload', handleLogout);

    window.$modal?.error({
      content: response.data.msg,
      keyboard: false,
      maskClosable: false,
      okText: $t('common.confirm'),
      onClose() {
        logoutAndCleanup();
      },
      onOk() {
        logoutAndCleanup();
      },
      title: $t('common.error')
    });

    return null;
  }

  // when the backend response code is in `expiredTokenCodes`, it means the token is expired, and refresh token
  // the api `refreshToken` can not return error code in `expiredTokenCodes`, otherwise it will be a dead loop, should return `logoutCodes` or `modalLogoutCodes`
  // when the backend response code is in `expiredTokenCodes`, it means the token is expired, and refresh token
  // the api `refreshToken` can not return error code in `expiredTokenCodes`, otherwise it will be a dead loop, should return `logoutCodes` or `modalLogoutCodes`
  if (isBackendCodeIn(response.data, expiredTokenCodes)) {
    const success = await handleExpiredRequest(request.state);
    if (success) {
      const Authorization = getAuthorization();
      Object.assign(response.config.headers, { Authorization });

      return instance.request(response.config) as Promise<AxiosResponse>;
    }
    // 刷新失败，登出并使用项目路由跳转到登录页
    await handleLogout();
    return null;
  }

  return null;
}

/** - 网络错误处理 */
export function handleError(
  error: AxiosError<App.Service.Response<unknown>, any>,
  request: FlatRequestInstance<RequestInstanceState, App.Service.Response<unknown>>
) {
  // when the request is fail, you can show error message

  // ai对话，通过sql查询图表数据接口，不提示报错
  if (['/api/v1/chat/db/query', '/api/v1/chat/db/add'].includes(error.config?.url || '')) return;

  // 测试连接接口不跳转登录页
  // const isTestConnect = error.config?.url?.includes('model/test/connect');
  // if (isTestConnect) {
  //   return;
  // }

  let message = error.message;
  let backendErrorCode = '';

  // Network errors (no response) - backend unreachable, cert error, CORS, etc.
  // In this case, show an error and force logout so user returns to login page
  // if (!error.response) {
  //   showErrorMsg(request.state, message || 'Network Error');
  //   // dispatch resetStore to cleanup and redirect to login
  //   // cast to any to avoid TS thunk typing issues here
  //   // store.dispatch(resetStore() as any);
  //   return;
  // }

  // get backend error message and code
  if (error.code === BACKEND_ERROR_CODE) {
    message = error.response?.data?.msg || message;
    backendErrorCode = String(error.response?.data?.code || '');
  }

  // the error message is displayed in the modal
  if (modalLogoutCodes.includes(backendErrorCode)) {
    return;
  }

  // when the token is expired, refresh token and retry request, so no need to show error message
  if (expiredTokenCodes.includes(backendErrorCode)) {
    return;
  }

  if (message === '用户不存在/密码错误') {
    showErrorMsg(request.state, '用户名或密码错误');
  } else {
    showErrorMsg(request.state, message);
  }
}
