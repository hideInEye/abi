type QiankunLifecycle = {
  bootstrap: () => void | Promise<void>
  mount: (props: any) => void | Promise<void>
  unmount: (props?: any) => void | Promise<void>
}

type QiankunRuntimeWindow = Window & {
  __POWERED_BY_QIANKUN__?: boolean
  moudleQiankunAppLifeCycles?: Record<string, QiankunLifecycle>
  proxy?: QiankunRuntimeWindow
  qiankunName?: string
}

function getRuntimeWindow() {
  const hostWindow = window as QiankunRuntimeWindow
  return hostWindow.proxy || hostWindow
}

export function isPoweredByQiankun() {
  return Boolean(getRuntimeWindow().__POWERED_BY_QIANKUN__)
}

export function registerQiankunLifecycle(lifecycle: QiankunLifecycle) {
  const runtimeWindow = getRuntimeWindow()
  if (!runtimeWindow.__POWERED_BY_QIANKUN__ || !runtimeWindow.qiankunName) return

  const hostWindow = window as QiankunRuntimeWindow
  hostWindow.moudleQiankunAppLifeCycles ??= {}
  hostWindow.moudleQiankunAppLifeCycles[runtimeWindow.qiankunName] = lifecycle
}
