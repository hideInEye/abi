import { afterEach, describe, expect, it, vi } from 'vitest'

import { getConversationUserName, isApiSuccess, parseStoredUserInfo, runApiSuccessFlow } from './conversationRequests'

afterEach(() => vi.unstubAllGlobals())

describe('conversation request user identity', () => {
  it('uses the account name rather than the numeric ID or display nickname', () => {
    const getItem = vi.fn(() => JSON.stringify({ userName: 'account_a', userId: 42, nickName: '昵称' }))
    vi.stubGlobal('localStorage', { getItem })

    expect(getConversationUserName()).toBe('account_a')
    expect(getItem).toHaveBeenCalledWith('SOY-REACT_userInfo')
  })

  it.each([null, '{broken', 'null', '{}', '{"userId":42,"nickName":"昵称"}', '{"userName":42}'])
  ('does not send a numeric ID when the account name is unavailable: %s', value => {
    vi.stubGlobal('localStorage', { getItem: () => value })
    expect(getConversationUserName()).toBe('')
  })

  it('reads the latest account at request time without caching it', () => {
    let userName = 'account_a'
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ userName }) })
    expect(getConversationUserName()).toBe('account_a')
    userName = 'account_b'
    expect(getConversationUserName()).toBe('account_b')
  })

  it('keeps storage read failures from throwing during payload creation', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('storage unavailable') } })
    expect(getConversationUserName()).toBe('')
  })
})

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
