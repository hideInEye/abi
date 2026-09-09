import { beforeEach, describe, expect, it, vi } from 'vitest'

const { completeLocalLogout, fetchLogout } = vi.hoisted(() => ({
  completeLocalLogout: vi.fn(),
  fetchLogout: vi.fn(),
}))

vi.mock('../utils/auth', () => ({ completeLocalLogout }))
vi.mock('./api/auth', () => ({ fetchLogout }))

import { logoutNow, requestLogout } from './logout'

describe('ABI logout flow', () => {
  beforeEach(() => {
    completeLocalLogout.mockReset()
    fetchLogout.mockReset()
  })

  it('waits for the API success before completing the local logout', async () => {
    let resolveRequest: ((value: unknown) => void) | undefined
    fetchLogout.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve
      }),
    )

    const logoutPromise = logoutNow('/workbench')

    expect(completeLocalLogout).not.toHaveBeenCalled()

    resolveRequest?.({ data: true, error: null, response: {} })
    await logoutPromise

    expect(completeLocalLogout).toHaveBeenCalledWith('/workbench')
  })

  it('blocks local logout when the API returns a fulfilled failure', async () => {
    const requestError = new Error('logout failed')
    fetchLogout.mockResolvedValue({ data: null, error: requestError, response: {} })

    await expect(logoutNow()).rejects.toBe(requestError)
    expect(completeLocalLogout).not.toHaveBeenCalled()
  })

  it('blocks local logout when the API request rejects', async () => {
    const requestError = new Error('network failed')
    fetchLogout.mockRejectedValue(requestError)

    await expect(requestLogout()).rejects.toBe(requestError)
    expect(completeLocalLogout).not.toHaveBeenCalled()
  })
})
