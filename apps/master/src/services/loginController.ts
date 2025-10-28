import { request } from '@umijs/max'
import { LoginFormValues } from '@/types/login'

export const login = (data: LoginFormValues) => {
  return request('/api/auth/login', {
    data,
    method: 'POST',
  })
}

export const getUserInfo = () => {
  return request('/api/system/user/getInfo', {
    method: 'GET',
  })
}
