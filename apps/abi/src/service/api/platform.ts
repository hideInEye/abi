import { apiRequest } from '../request';

/**
 * Login
 *
 * @param userName User name
 * @param password Password
 * @param code 验证码
 * @param uuid 验证码唯一标识
 */
export function fetchLogin(userName: string, password: string, code?: string, uuid?: string) {
  return apiRequest<Api.Auth.LoginToken>({
    data: {
      password,
      username: userName,
      code,
      uuid
    },
    method: 'post',
    url: '/api/auth/login'
  });
}

/** Get user info */
export function fetchGetUserInfo() {
  return apiRequest<Api.Auth.UserInfo>({ url: '/api/system/user/getInfo' });
}
