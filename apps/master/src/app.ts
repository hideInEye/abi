import type { AxiosRequestConfig, RequestConfig } from '@umijs/max'
import type { AxiosResponse } from '@umijs/max'
import { message } from 'antd'

import { localStg } from '@/utils/storage'
import { nanoid } from '@sa/utils'

type BackendResponse = AxiosResponse<App.Service.Response<any>>

interface RequestState {
  errMsgStack: string[]
}

const REQUEST_ID_KEY = 'X-Request-Id'
const DEFAULT_TIMEOUT = 30 * 1000

const requestState: RequestState = {
  errMsgStack: [],
}

function getAuthorization() {
  const token = localStg.get('token')
  return token ? `Bearer ${token}` : ''
}

function getUserId() {
  return localStg.get('userId')
}

function notifyError(messageText: string) {
  if (!messageText || requestState.errMsgStack.includes(messageText)) return

  requestState.errMsgStack.push(messageText)
  message.error({
    content: messageText,
    onClose: () => {
      requestState.errMsgStack = requestState.errMsgStack.filter((msg) => msg !== messageText)
    },
  })
}

function isBackendSuccess(response: BackendResponse) {
  const payload = response.data || {}
  const responseCode = payload.code !== undefined ? payload.code : ''

  if (responseCode === 200) {
    return true
  }

  return payload.data === true || payload.success === true
}

function transformBackendResponse(response: BackendResponse) {
  const payload = response.data || {}
  return payload.data || payload.rows || payload
}

export const request: RequestConfig = {
  baseURL: 'https://192.168.1.195',
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
  requestInterceptors: [
    (config: AxiosRequestConfig) => {
      const headers = {
        ...(config.headers || {}),
      }

      headers[REQUEST_ID_KEY] = nanoid()

      const Authorization = getAuthorization()

      if (Authorization) {
        headers.Authorization = Authorization
      }
      const userId = getUserId()
      if (userId) {
        headers.userId = userId
      }

      return {
        ...config,
        headers,
      }
    },
  ],
  responseInterceptors: [
    async (response: AxiosResponse) => {
      const { data = {} } = response
      const { code, msg } = data
      if (code > 200) {
        notifyError(msg)
      }
      if (code == 401) {
        console.log('登录失效')
      }
      return response
    },
    (response: AxiosResponse) => {
      if (isBackendSuccess(response)) {
        return {
          ...response,
          data: {
            ...transformBackendResponse(response),
            code: response.data.code,
          },
        }
      }
      return response
    },
  ],
}
