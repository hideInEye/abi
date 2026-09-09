import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authLogout, fetchLogout } = vi.hoisted(() => ({
  authLogout: vi.fn(),
  fetchLogout: vi.fn(),
}))

vi.mock('../utils/auth', () => ({ authManager: { logout: authLogout } }))
vi.mock('./api/auth', () => ({ fetchLogout }))

import { isLogoutResponseSuccess, logoutNow, requestLogout } from './logout'

describe('Chat logout flow', () => {
  beforeEach(() => {
    authLogout.mockReset()
    fetchLogout.mockReset()
  })

  it.each([{ code: 200 }, { code: '0000' }, { success: true }, { data: true }])('recognizes an explicit successful response: %o', (response) => {
    expect(isLogoutResponseSuccess(response)).toBe(true)
  })

  it.each([undefined, null, {}, { code: 401 }, { code: 500 }, { success: false }, { data: false }])('rejects a response that does not explicitly succeed: %o', (response) => {
    expect(isLogoutResponseSuccess(response)).toBe(false)
  })

  it('waits for the API success before completing the local logout', async () => {
    let resolveRequest: ((value: unknown) => void) | undefined
    fetchLogout.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve
      }),
    )

    const logoutPromise = logoutNow()

    expect(authLogout).not.toHaveBeenCalled()

    resolveRequest?.({ code: 200 })
    await logoutPromise

    expect(authLogout).toHaveBeenCalledWith({ preserveRedirect: false })
  })

  it('blocks local logout when the API reports failure', async () => {
    fetchLogout.mockResolvedValue({ code: 500, msg: 'logout failed' })

    await expect(logoutNow()).rejects.toThrow('logout failed')
    expect(authLogout).not.toHaveBeenCalled()
  })

  it('blocks local logout when the API request rejects', async () => {
    const requestError = new Error('network failed')
    fetchLogout.mockRejectedValue(requestError)

    await expect(requestLogout()).rejects.toBe(requestError)
    expect(authLogout).not.toHaveBeenCalled()
  })
})
