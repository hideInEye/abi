import { resolveAbiBootstrapBranch } from './bootstrap/branch'
import { isPoweredByQiankun, registerQiankunLifecycle } from './bootstrap/qiankunRuntime'

let appModulePromise: Promise<typeof import('./bootstrap/app')> | null = null

function loadFullApp() {
  appModulePromise ??= import('./bootstrap/app')
  return appModulePromise
}

function renderBootstrapError(error: unknown) {
  const shell = document.getElementById('abi-startup-shell')
  const title = document.getElementById('abi-startup-title')
  const detail = document.getElementById('abi-startup-detail')
  const retry = document.getElementById('abi-startup-retry')

  shell?.setAttribute('data-state', 'error')
  if (title) title.textContent = '应用加载失败'
  if (detail) detail.textContent = error instanceof Error ? error.message : '请检查网络后重试'
  retry?.removeAttribute('hidden')
}

async function startCurrentBranch(poweredByQiankun: boolean) {
  const branch = resolveAbiBootstrapBranch(window.location.href, poweredByQiankun)

  // 过渡兼容：旧哈希路径 dashboard_share_page 直接替换成 share_url（地址栏保持新路径，后端切换完成后删除）
  if (branch.kind === 'chat-share' && window.location.hash.includes('dashboard_share_page')) {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${window.location.hash.replace('dashboard_share_page', 'share_url')}`)
  }

  if (branch.kind === 'app') {
    const { mountFullAbiApp } = await loadFullApp()
    await mountFullAbiApp({}, false)
    return
  }

  const { mountAssistantShare, mountShareBridge } = await import('./bootstrap/shareBridge')
  if (branch.kind === 'chat-share') {
    await mountAssistantShare(branch.shareCode)
  } else {
    mountShareBridge(branch.targetUrl)
  }
}

document.getElementById('abi-startup-retry')?.addEventListener('click', () => window.location.reload())

if (isPoweredByQiankun()) {
  registerQiankunLifecycle({
    bootstrap() {},
    async mount(props: any) {
      const { mountFullAbiApp } = await loadFullApp()
      await mountFullAbiApp(props, true)
    },
    async unmount() {
      if (!appModulePromise) return
      const { unmountFullAbiApp } = await appModulePromise
      unmountFullAbiApp()
    },
  })
} else {
  void startCurrentBranch(false).catch(error => {
    console.error('[abi] bootstrap failed', error)
    renderBootstrapError(error)
  })
}
