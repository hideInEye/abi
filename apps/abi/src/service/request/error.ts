import type { FlatRequestInstance } from '@sa/axios';
import { BACKEND_ERROR_CODE } from '@sa/axios';
import { AxiosError } from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';

import { handleLoginExpired } from '@/utils/auth';

import { showErrorMsg } from './shared';
import type { RequestInstanceState } from './type';

function isUnauthorizedResponse(response?: AxiosResponse<App.Service.Response<unknown>, any>) {
  return response?.status === 401 || String(response?.data?.code || '') === '401';
}

/** - 后端错误处理 */
export async function backEndFail(
  response: AxiosResponse<App.Service.Response<unknown>, any>,
  _instance: AxiosInstance,
  _request: FlatRequestInstance<RequestInstanceState, App.Service.Response<unknown>>
) {
  // 测试连接接口不跳转登录页
  // const isTestConnect = response.config?.url?.includes('model/test/connect');
  // if (isTestConnect) {
  //   return null;
  // }
  if (isUnauthorizedResponse(response)) {
    await handleLoginExpired();

    throw new AxiosError<App.Service.Response<unknown>>(
      'the backend request unauthorized',
      BACKEND_ERROR_CODE,
      response.config,
      response.request,
      response
    );
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

  if (error.response?.status === 401 || backendErrorCode === '401') {
    handleLoginExpired();
    return;
  }

  if (message === '用户不存在/密码错误') {
    showErrorMsg(request.state, '用户名或密码错误');
  } else {
    showErrorMsg(request.state, message);
  }
}
