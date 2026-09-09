import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiRequest, request } = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  request: vi.fn(),
}))

vi.mock('../request', () => ({ apiRequest, request }))

import { fetchCaptchaImage, fetchCustomBackendError, fetchLogin as fetchAuthLogin, fetchLogout } from './auth'
import { fetchLogin as fetchPlatformLogin } from './platform'

describe('auth API routes', () => {
  beforeEach(() => {
    apiRequest.mockReset()
    request.mockReset()
  })

  it('uses the flattened captcha route', () => {
    fetchCaptchaImage()

    expect(apiRequest).toHaveBeenCalledWith({ method: 'get', url: '/api/captchaImage' })
  })

  it('uses the flattened login route in both auth API modules', () => {
    fetchAuthLogin('admin', 'secret')
    fetchPlatformLogin('admin', 'secret', '1234', 'captcha-id')

    expect(apiRequest).toHaveBeenNthCalledWith(1, {
      data: { password: 'secret', username: 'admin' },
      method: 'post',
      url: '/api/login',
    })
    expect(apiRequest).toHaveBeenNthCalledWith(2, {
      data: { code: '1234', password: 'secret', username: 'admin', uuid: 'captcha-id' },
      method: 'post',
      url: '/api/login',
    })
  })

  it('uses the flattened custom error route', () => {
    fetchCustomBackendError('500', 'failed')

    expect(request).toHaveBeenCalledWith({ params: { code: '500', msg: 'failed' }, url: '/api/error' })
  })

  it('posts to the logout endpoint', () => {
    fetchLogout()

    expect(apiRequest).toHaveBeenCalledWith({ method: 'post', url: '/api/logout' })
  })
})
