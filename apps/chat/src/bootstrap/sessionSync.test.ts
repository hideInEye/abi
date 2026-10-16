import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ token: 'a', version: '1', userName: 'account-a', reset: vi.fn() }))
vi.mock('../utils/auth', () => ({ readAuthToken: () => mocks.token, authManager: { resetUnauthorizedState: mocks.reset } }))
import { getCurrentUserName, subscribeCurrentUser } from '../utils/identity'
import { isChatBusinessPage, startChatSessionSync } from './sessionSync'

let stop: () => void
beforeEach(() => {
  mocks.token = 'a'
  mocks.version = '1'
  mocks.userName = 'account-a'
  mocks.reset.mockClear()
  vi.stubGlobal('localStorage', { getItem: (key: string) => key === 'SOY-REACT_userInfo' ? JSON.stringify({ userName: mocks.userName }) : mocks.version })
  vi.stubGlobal('window', Object.assign(new EventTarget(), {
    location: { pathname: '/chat-ui/', hash: '#/chat/conversation/old?spaceId=99', reload: vi.fn(), replace: vi.fn() },
    history: { replaceState: vi.fn() },
  }))
  vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'visible' }))
  stop = startChatSessionSync()
})
afterEach(() => { stop(); vi.unstubAllGlobals() })

describe('Chat cross-tab session integration', () => {
  it('notifies user subscribers after ABI login without changing the conversation URL', () => {
    const onChange = vi.fn(() => getCurrentUserName())
    const unsubscribe = subscribeCurrentUser(onChange)
    mocks.token = 'b'
    mocks.version = '2'
    mocks.userName = 'account-b'
    window.dispatchEvent(Object.assign(new Event('storage'), { key: 'SOY-REACT_authSessionVersion' }))
    expect(onChange).toHaveReturnedWith('account-b')
    expect(mocks.reset).toHaveBeenCalledOnce()
    expect(window.history.replaceState).not.toHaveBeenCalled()
    expect(window.location.reload).not.toHaveBeenCalled()
    expect(window.location.replace).not.toHaveBeenCalled()
    expect(mocks.token).toBe('b')
    unsubscribe()
  })
  it('does not notify or reset state on remote logout and still syncs the next login', () => {
    const onChange = vi.fn(() => getCurrentUserName())
    const unsubscribe = subscribeCurrentUser(onChange)
    mocks.token = ''
    window.dispatchEvent(Object.assign(new Event('storage'), { key: 'SOY-REACT_token' }))
    window.dispatchEvent(Object.assign(new Event('storage'), { key: null }))
    window.dispatchEvent(new Event('focus'))
    document.dispatchEvent(new Event('visibilitychange'))
    expect(onChange).not.toHaveBeenCalled()
    expect(mocks.reset).not.toHaveBeenCalled()
    expect(window.location.replace).not.toHaveBeenCalled()
    expect(window.location.reload).not.toHaveBeenCalled()
    expect(window.history.replaceState).not.toHaveBeenCalled()
    mocks.token = 'b'
    mocks.version = '2'
    mocks.userName = 'account-b'
    window.dispatchEvent(new Event('focus'))
    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveReturnedWith('account-b')
    unsubscribe()
    mocks.version = '3'
    window.dispatchEvent(new Event('focus'))
    expect(onChange).toHaveBeenCalledOnce()
  })
  it.each(['#/share_url/code', '#/dashboard_share_page/code', '#/assistant-share-page/code'])('does not redirect public share page %s', hash => {
    window.location.hash = hash
    mocks.token = ''
    window.dispatchEvent(new Event('focus'))
    expect(isChatBusinessPage()).toBe(false)
    expect(window.location.replace).not.toHaveBeenCalled()
    expect(mocks.reset).not.toHaveBeenCalled()
  })
})
