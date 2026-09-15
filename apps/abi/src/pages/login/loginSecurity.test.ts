import { describe, expect, it, vi } from 'vitest'

import { clearLegacyRememberedCredentials } from './loginSecurity'

describe('login credential persistence', () => {
  it('removes credentials stored by old remember-password versions', () => {
    const storage = {
      getItem: vi.fn(() => '{"userName":"admin","passWord":"secret"}'),
      removeItem: vi.fn(),
    }
    clearLegacyRememberedCredentials(storage)
    expect(storage.removeItem).toHaveBeenCalledWith('loginInfo')
  })

  it('does not create or rewrite login credential storage', () => {
    const storage = { getItem: vi.fn(() => null), removeItem: vi.fn() }
    clearLegacyRememberedCredentials(storage)
    expect(storage.removeItem).not.toHaveBeenCalled()
  })
})
