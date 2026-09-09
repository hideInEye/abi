import { apiRequest, request } from '../request';

/** 获取验证码图片 */
export function fetchCaptchaImage() {
  return apiRequest<Api.Auth.CaptchaImage>({
    method: 'get',
    url: '/api/captchaImage'
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
    url: '/api/login'
  });
}

export function fetchLogout() {
  return apiRequest({
    method: 'post',
    url: '/api/logout'
  });
}

/** Get user info */
export function fetchGetUserInfo() {
  return request<Api.Auth.UserInfo>({ url: '/api/system/user/getInfo' });
}

/**
 * return custom backend error
 *
 * @param code error code
 * @param msg error message
 */
export function fetchCustomBackendError(code: string, msg: string) {
  return request({ params: { code, msg }, url: '/api/error' });
}

/** 嵌入onenet时获取登录token接口 */
export function fetchLoginChatbiByOnenet() {
  return apiRequest({
    method: 'post',
    url: '/api/abi-system/onenet/api/loginChatbi'
  });
}
