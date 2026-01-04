import { apiRequest, request } from '../request';

/** 获取验证码图片 */
export function fetchCaptchaImage() {
  return apiRequest<Api.Auth.CaptchaImage>({
    method: 'get',
    url: '/auth/captchaImage'
  });
}

/**
 * Login
 *
 * @param userName User name
 * @param password Password
 */
export function fetchLogin(userName: string, password: string) {
  return request<Api.Auth.LoginToken>({
    data: {
      password,
      username: userName
    },
    method: 'post',
    url: '/auth/login'
  });
}

/** Get user info */
export function fetchGetUserInfo() {
  return request<Api.Auth.UserInfo>({ url: '/system/user/getInfo' });
}

/**
 * Refresh token
 *
 * @param refreshToken Refresh token
 */
export function fetchRefreshToken(refreshToken: string) {
  return request<Api.Auth.LoginToken>({
    data: {
      refreshToken
    },
    method: 'post',
    url: '/auth/refreshToken'
  });
}

/**
 * return custom backend error
 *
 * @param code error code
 * @param msg error message
 */
export function fetchCustomBackendError(code: string, msg: string) {
  return request({ params: { code, msg }, url: '/auth/error' });
}

/** 嵌入onenet时获取登录token接口 */
export function fetchLoginChatbiByOnenet() {
  return apiRequest({
    method: 'post',
    url: '/abi-system/onenet/api/loginChatbi'
  });
}
