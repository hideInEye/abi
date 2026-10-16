import { describe, expect, it, vi } from 'vitest'

import { watchAuthSession } from './sessionSync'

function setup() {
  const target = new EventTarget()
  const document = Object.assign(new EventTarget(), { visibilityState: 'visible' })
  let session: { token: string; version: string | null } = { token: 'account-a', version: '1' }
  let enabled = true
  const onChange = vi.fn()
  const stop = watchAuthSession({
    target, document, readSession: () => session, isEnabled: () => enabled,
    storageKeys: ['token', 'version'], onChange,
  })
  const storage = (key: string | null) => target.dispatchEvent(Object.assign(new Event('storage'), { key }))
  return { target, document, storage, onChange, stop, set: (value: typeof session) => { session = value }, disable: () => { enabled = false } }
}

describe('cross-application auth session sync', () => {
  it('waits for the completed-login version and only handles it once', () => {
    const sync = setup()
    sync.set({ token: 'account-b', version: '1' })
    sync.storage('token')
    expect(sync.onChange).not.toHaveBeenCalled()
    sync.set({ token: 'account-b', version: '2' })
    sync.storage('version')
    sync.target.dispatchEvent(new Event('focus'))
    expect(sync.onChange).toHaveBeenCalledOnce()
    expect(sync.onChange).toHaveBeenCalledWith()
  })

  it.each(['token', 'version', null])('ignores remote logout or storage clear (%s), including focus and visibility checks', key => {
    const sync = setup()
    sync.set({ token: '', version: null })
    sync.storage(key)
    sync.target.dispatchEvent(new Event('focus'))
    sync.document.dispatchEvent(new Event('visibilitychange'))
    expect(sync.onChange).not.toHaveBeenCalled()
  })

  it('ignores repeated logouts but continues syncing each completed login once', () => {
    const sync = setup()
    sync.set({ token: '', version: '1' })
    sync.storage('token')
    sync.target.dispatchEvent(new Event('focus'))
    sync.set({ token: 'account-b', version: '1' })
    sync.storage('token')
    expect(sync.onChange).not.toHaveBeenCalled()
    sync.set({ token: 'account-b', version: '2' })
    sync.storage('version')
    sync.set({ token: '', version: '2' })
    sync.storage('token')
    sync.set({ token: 'account-c', version: '3' })
    sync.storage('version')
    sync.target.dispatchEvent(new Event('focus'))
    expect(sync.onChange.mock.calls).toEqual([[], []])
  })

  it('does not treat removal of the login marker as a new login', () => {
    const sync = setup()
    sync.set({ token: 'account-a', version: null })
    sync.storage('version')
    sync.target.dispatchEvent(new Event('focus'))
    expect(sync.onChange).not.toHaveBeenCalled()
  })

  it('uses the latest storage snapshot, not an old queued logout event', () => {
    const sync = setup()
    sync.set({ token: 'account-b', version: '2' })
    sync.storage('token')
    expect(sync.onChange).toHaveBeenCalledWith()
  })

  it('detects a new session when an inactive tab becomes visible', () => {
    const sync = setup()
    sync.set({ token: 'account-b', version: '2' })
    sync.document.dispatchEvent(new Event('visibilitychange'))
    expect(sync.onChange).toHaveBeenCalledWith()
  })

  it('ignores unrelated updates, same-session focus and disabled login/share pages', () => {
    const sync = setup()
    sync.target.dispatchEvent(new Event('focus'))
    sync.set({ token: 'account-b', version: '2' })
    sync.storage('spaceId')
    expect(sync.onChange).not.toHaveBeenCalled()
    sync.disable()
    sync.storage('version')
    expect(sync.onChange).not.toHaveBeenCalled()
  })

  it('removes all listeners when disposed', () => {
    const sync = setup()
    sync.stop()
    sync.set({ token: 'account-b', version: '2' })
    sync.storage('version')
    sync.target.dispatchEvent(new Event('focus'))
    sync.document.dispatchEvent(new Event('visibilitychange'))
    expect(sync.onChange).not.toHaveBeenCalled()
  })

  it('accepts a local login without reloading and still detects the next remote login', () => {
    const sync = setup()
    sync.set({ token: 'account-b', version: '2' })
    sync.target.dispatchEvent(new Event('auth-session-ready'))
    sync.target.dispatchEvent(new Event('focus'))
    expect(sync.onChange).not.toHaveBeenCalled()
    sync.set({ token: 'account-c', version: '3' })
    sync.storage('version')
    expect(sync.onChange).toHaveBeenCalledWith()
  })
})
