import { describe, expect, it } from 'vitest'

import { isJwtExpired } from './jwt'

function createToken(payload: object) {
  const encoded = btoa(JSON.stringify(payload)).replaceAll('=', '').replaceAll('+', '-').replaceAll('/', '_')
  return `header.${encoded}.signature`
}

describe('isJwtExpired', () => {
  it('decodes Base64URL payloads and applies the clock skew', () => {
    expect(isJwtExpired(createToken({ exp: 100 }), 80_000, 30_000)).toBe(true)
    expect(isJwtExpired(createToken({ exp: 120 }), 80_000, 30_000)).toBe(false)
  })

  it('treats missing tokens as expired and opaque tokens as backend-owned', () => {
    expect(isJwtExpired('')).toBe(true)
    expect(isJwtExpired('opaque-token')).toBe(false)
    expect(isJwtExpired('a.invalid*.c')).toBe(false)
  })
})
