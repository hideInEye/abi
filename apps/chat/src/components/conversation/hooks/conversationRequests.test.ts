import { describe, expect, it, vi } from 'vitest'

import { isApiSuccess, parseStoredUserInfo, runApiSuccessFlow } from './conversationRequests'

describe('conversation request helpers', () => {
  it('does not throw for malformed stored user data', () => {
    expect(parseStoredUserInfo('{broken')).toEqual({})
    expect(parseStoredUserInfo('{"userName":"admin"}')).toEqual({ userName: 'admin' })
  })

  it('gates follow-up actions on an explicit business success', () => {
    expect(isApiSuccess({ code: 200 })).toBe(true)
    expect(isApiSuccess({ success: true })).toBe(true)
    expect(isApiSuccess({ code: 500, success: false })).toBe(false)
    expect(isApiSuccess(undefined)).toBe(false)
  })

  it('runs the success callback only after a successful response', async () => {
    const onSuccess = vi.fn()

    expect(await runApiSuccessFlow(async () => ({ code: 500, msg: 'failed' }), onSuccess))
      .toEqual({ success: false, message: 'failed' })
    expect(await runApiSuccessFlow(async () => { throw new Error('offline') }, onSuccess))
      .toEqual({ success: false, message: 'offline' })
    expect(onSuccess).not.toHaveBeenCalled()

    expect(await runApiSuccessFlow(async () => ({ code: 200 }), onSuccess))
      .toEqual({ success: true })
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })
})
