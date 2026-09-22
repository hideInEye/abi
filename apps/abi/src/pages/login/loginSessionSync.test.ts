import { describe, expect, it, vi } from 'vitest'

import {
  createLoginSessionRedirectCheck,
  hasActiveLoginSession,
  isLoginSessionReadyStorageKey,
} from './loginSessionSync'

function createJwt(exp: number) {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replaceAll('=', '').replaceAll('+', '-').replaceAll('/', '_')
  return `${encode({ alg: 'none' })}.${encode({ exp })}.signature`
}

describe('login session sync', () => {
  it('requires a token, a persisted user identity and a non-expired session', () => {
    const futureToken = createJwt(Math.floor(Date.now() / 1000) + 3600)
    const expiredToken = createJwt(Math.floor(Date.now() / 1000) - 3600)

    expect(hasActiveLoginSession(true, futureToken, { userId: '1' })).toBe(true)
    expect(hasActiveLoginSession(true, futureToken, { userName: 'admin' })).toBe(true)
    expect(hasActiveLoginSession(false, futureToken, { userId: '1' })).toBe(false)
    expect(hasActiveLoginSession(true, expiredToken, { userId: '1' })).toBe(false)
    expect(hasActiveLoginSession(true, futureToken, {})).toBe(false)
  })

  it('only reacts to the completed-login marker across storage prefixes', () => {
    expect(isLoginSessionReadyStorageKey('authSessionVersion')).toBe(true)
    expect(isLoginSessionReadyStorageKey('abi-authSessionVersion')).toBe(true)
    expect(isLoginSessionReadyStorageKey('token')).toBe(false)
    expect(isLoginSessionReadyStorageKey(null)).toBe(false)
  })

  it('ignores duplicate checks while restoring and locks after a successful redirect', async () => {
    let finishRestore: ((value: boolean) => void) | undefined
    const restoreSession = vi.fn(
      () =>
        new Promise<boolean>(resolve => {
          finishRestore = resolve
        }),
    )
    const check = createLoginSessionRedirectCheck({
      isSessionActive: () => true,
      restoreSession,
    })

    const firstCheck = check()
    expect(await check()).toBe(false)
    expect(restoreSession).toHaveBeenCalledTimes(1)

    finishRestore?.(true)
    expect(await firstCheck).toBe(true)
    expect(await check()).toBe(false)
    expect(restoreSession).toHaveBeenCalledTimes(1)
  })

  it('allows retry when initialization fails or throws', async () => {
    const restoreSession = vi.fn().mockResolvedValueOnce(false).mockRejectedValueOnce(new Error('failed')).mockResolvedValue(true)
    const check = createLoginSessionRedirectCheck({
      isSessionActive: () => true,
      restoreSession,
    })

    expect(await check()).toBe(false)
    expect(await check()).toBe(false)
    expect(await check()).toBe(true)
    expect(restoreSession).toHaveBeenCalledTimes(3)
  })

  it('does not restore an inactive session', async () => {
    const restoreSession = vi.fn().mockResolvedValue(true)
    const check = createLoginSessionRedirectCheck({
      isSessionActive: () => false,
      restoreSession,
    })

    expect(await check()).toBe(false)
    expect(restoreSession).not.toHaveBeenCalled()
  })
})
