import { describe, expect, it } from 'vitest'

import { shouldHandleLoginExpiredForRequest } from './auth-policy'

describe('ABI auth failure policy', () => {
  it.each(['/api/logout', '/api/logout?source=menu', 'https://example.com/api/logout'])('preserves local auth when logout fails at %s', (url) => {
    expect(shouldHandleLoginExpiredForRequest(url)).toBe(false)
  })

  it.each(['/api/system/user/getInfo', '/api/login', undefined])('keeps the existing unauthorized flow for %s', (url) => {
    expect(shouldHandleLoginExpiredForRequest(url)).toBe(true)
  })
})
