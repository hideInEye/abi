import { apiRequest } from '../request';

/**
 * Login
 *
 * @param userName User name
 * @param password Password
 */
export function fetchLogin(userName: string, password: string) {
  return apiRequest<Api.Auth.LoginToken>({
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
  return apiRequest<Api.Auth.UserInfo>({ url: '/system/user/getInfo' });
}
