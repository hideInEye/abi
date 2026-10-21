import { watchAuthSession } from '@sa/auth'

import { authManager, readAuthToken } from '../utils/auth'
import { notifyCurrentUserChanged } from '../utils/identity'

export function isChatBusinessPage(): boolean {
  const path = window.location.hash.slice(1).split('?')[0]
  return !path || path === '/' || path === '/chat' || path.startsWith('/chat/')
}

export function startChatSessionSync(): () => void {
  return watchAuthSession({
    target: window,
    document,
    storageKeys: ['SOY-REACT_authSessionVersion'],
    readSession: () => ({ token: readAuthToken(), version: localStorage.getItem('SOY-REACT_authSessionVersion') }),
    // 仅业务页面跟随登录账号更新，公开分享等入口不参与账号同步。
    isEnabled: isChatBusinessPage,
    onChange: () => {
      // 新会话不能被旧会话待执行的失效跳转打断。
      authManager.resetUnauthorizedState()
      // 通知已挂载的用户信息和资源订阅者，保留当前页面，不通过整页刷新同步。
      notifyCurrentUserChanged()
    },
  })
}
