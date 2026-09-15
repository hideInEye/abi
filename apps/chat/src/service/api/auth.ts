import request from '../request'

export function fetchLogout() {
  return request({
    method: 'post',
    url: '/api/auth/logout',
  })
}
