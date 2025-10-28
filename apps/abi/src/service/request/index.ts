import { BACKEND_ERROR_CODE, createFlatRequest, createRequest } from '@sa/axios';

import { getCookie } from '@/utils/common';
import { getServiceBaseURL } from '@/utils/service';
import { localStg } from '@/utils/storage';

import { backEndFail, handleError } from './error';
import { getAuthorization, getUserId } from './shared';
import type { RequestInstanceState } from './type';

const isHttpProxy = import.meta.env.DEV && import.meta.env.VITE_HTTP_PROXY === 'Y';
const { apiURL, baseURL, otherBaseURL } = getServiceBaseURL(import.meta.env, isHttpProxy);

export const request = createFlatRequest<App.Service.Response, RequestInstanceState>(
  {
    baseURL,
    headers: {
      apifoxToken: 'XL299LiMEDZ0H5h3A29PxwQXdMJqWyY2'
    }
  },
  {
    isBackendSuccess(response: any) {
      // when the backend response code is "0000"(default), it means the request is success
      // to change this logic by yourself, you can modify the `VITE_SERVICE_SUCCESS_CODE` in `.env` file
      const responseCode = String(response.data.code);
      return (
        responseCode === import.meta.env.VITE_SERVICE_SUCCESS_CODE ||
        responseCode === import.meta.env.VITE_SERVICE_SUCCESS_CODE1 ||
        response.data.data === true ||
        response.data.success === true
      );
    },
    async onBackendFail(response, instance) {
      await backEndFail(response, instance, request);
    },
    onError(error) {
      handleError(error, request);
    },
    async onRequest(config) {
      const Authorization = getAuthorization();
      const userId = getUserId();
      Object.assign(config.headers, { Authorization, userId });

      return config;
    },
    transformBackendResponse(response) {
      return response.data.data || response.data.rows;
    }
  }
);

const customRequests = ['/abi-data/api/v1/source/uploadFile'];

export const apiRequest = createFlatRequest<App.Service.Response, RequestInstanceState>(
  {
    baseURL: apiURL,
    headers: {
      apifoxToken: 'XL299LiMEDZ0H5h3A29PxwQXdMJqWyY2'
    }
  },
  {
    isBackendSuccess(response) {
      // when the backend response code is "0000"(default), it means the request is success
      // to change this logic by yourself, you can modify the `VITE_SERVICE_SUCCESS_CODE` in `.env` file
      const responseCode = String(response.data.code);
      return (
        responseCode === import.meta.env.VITE_SERVICE_SUCCESS_CODE ||
        responseCode === import.meta.env.VITE_SERVICE_SUCCESS_CODE1 ||
        response.data.data === true ||
        response.data.success === true ||
        (customRequests.includes(response.config.url!) && responseCode !== '500')
      );
    },
    async onBackendFail(response, instance) {
      await backEndFail(response, instance, apiRequest);
    },
    onError(error) {
      handleError(error, apiRequest);
    },
    async onRequest(config) {
      // const Authorization = getAuthorization();
      const Authorization =
        config.url === '/abi-system/onenet/api/loginChatbi' ? `Bearer ${getCookie('token')}` : getAuthorization();
      Object.assign(config.headers, { Authorization });

      return config;
    },
    transformBackendResponse(response) {
      return customRequests.includes(response.config.url!) ? response.data : response.data.data || response.data.rows;
    }
  }
);
export const demoRequest = createRequest<App.Service.DemoResponse>(
  {
    baseURL: otherBaseURL.demo
  },
  {
    isBackendSuccess(response) {
      // when the backend response code is "200", it means the request is success
      // you can change this logic by yourself
      return response.data.status === '200';
    },
    async onBackendFail(_response) {
      // when the backend response code is not "200", it means the request is fail
      // for example: the token is expired, refresh token and retry request
    },
    onError(error) {
      // when the request is fail, you can show error message

      let message = error.message;

      // show backend error message
      if (error.code === BACKEND_ERROR_CODE) {
        message = error.response?.data?.message || message;
      }

      window.$message?.error(message);
    },
    async onRequest(config) {
      const { headers } = config;

      // set token
      const token = localStg.get('token');
      const Authorization = token ? `Bearer ${token}` : null;
      Object.assign(headers, { Authorization });

      return config;
    },
    transformBackendResponse(response) {
      return response.data.result;
    }
  }
);
