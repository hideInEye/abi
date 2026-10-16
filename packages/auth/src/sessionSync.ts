interface AuthSessionSnapshot {
  token: string
  version: string | number | null
}

interface AuthSessionWatcherOptions {
  target: EventTarget
  document: EventTarget & { visibilityState: string }
  readSession: () => AuthSessionSnapshot
  storageKeys: readonly string[]
  isEnabled?: () => boolean
  onChange: () => void
}

export function watchAuthSession(options: AuthSessionWatcherOptions): () => void {
  let previous = options.readSession()

  const check = () => {
    // 事件可能延迟到达，读取当前存储，避免把旧事件携带的账号信息恢复到页面。
    const current = options.readSession()
    if (options.isEnabled && !options.isEnabled()) {
      previous = current
      return
    }

    // token 先于用户和空间初始化写入，必须等登录完成标记变化后再同步。
    // 凭据或标记被清除不联动另一端退出；实际鉴权失败仍由原有 401 流程处理。
    if (!current.token || current.version == null || current.version === previous.version) return
    previous = current
    options.onChange()
  }
  const onStorage = (event: Event) => {
    const { key } = event as StorageEvent
    if (key === null || options.storageKeys.includes(key)) check()
  }
  const onVisibility = () => {
    if (options.document.visibilityState === 'visible') check()
  }
  // storage 不通知写入页面，本页完成登录后需更新基线，避免下次聚焦重复同步。
  const onLocalSessionReady = () => { previous = options.readSession() }
  options.target.addEventListener('storage', onStorage)
  // 后台页面可能延迟接收事件，恢复焦点或可见时补查是否有新的登录完成标记。
  options.target.addEventListener('focus', check)
  options.target.addEventListener('auth-session-ready', onLocalSessionReady)
  options.document.addEventListener('visibilitychange', onVisibility)
  return () => {
    options.target.removeEventListener('storage', onStorage)
    options.target.removeEventListener('focus', check)
    options.target.removeEventListener('auth-session-ready', onLocalSessionReady)
    options.document.removeEventListener('visibilitychange', onVisibility)
  }
}
