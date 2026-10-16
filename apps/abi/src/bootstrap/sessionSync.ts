import { watchAuthSession } from '@sa/auth'

import { store } from '../store'
import { syncAuthFromStorage } from '../store/slice/auth'
import { resetLoginExpiredState } from '../utils/auth'
import { localStg } from '../utils/storage'

export function startAbiSessionSync(): () => void {
  const prefix = import.meta.env.VITE_STORAGE_PREFIX || ''
  return watchAuthSession({
    target: window,
    document,
    storageKeys: [`${prefix}authSessionVersion`],
    readSession: () => ({ token: localStg.get('token') || '', version: localStg.get('authSessionVersion') }),
    // 登录页自行恢复空间、权限路由和跳转，避免两套同步流程同时初始化。
    isEnabled: () => !window.location.pathname.startsWith('/login'),
    onChange: () => {
      // 新登录已完成，取消旧会话的失效处理；此处不清理共享凭据或触发跳转。
      resetLoginExpiredState()
      store.dispatch(syncAuthFromStorage({ resetTheme: false }))
    },
  })
}
