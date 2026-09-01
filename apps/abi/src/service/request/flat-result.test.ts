import { describe, expect, it } from 'vitest'

import { assertFlatRequestSuccess, isFlatRequestSuccess } from './flat-result'

describe('flat request result', () => {
  it('accepts only the explicit success shape returned by createFlatRequest', () => {
    expect(isFlatRequestSuccess({ data: undefined, error: null })).toBe(true)
    expect(isFlatRequestSuccess({ data: true, error: null })).toBe(true)
  })

  it('does not infer success from a response code when the flat request contains an error', () => {
    expect(isFlatRequestSuccess({ error: new Error('backend failed'), response: { data: { code: '0000' } } })).toBe(false)
    expect(isFlatRequestSuccess({ response: { data: { code: 200 } } })).toBe(false)
  })

  it('throws the original request error so async overlays remain open on failure', () => {
    const error = new Error('request failed')

    expect(() => assertFlatRequestSuccess({ error })).toThrow(error)
    expect(() => assertFlatRequestSuccess(undefined)).toThrow('接口请求失败')
  })
})
