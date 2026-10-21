import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { ErrorBoundary } from 'react-error-boundary'
import type { FallbackProps } from 'react-error-boundary'
import { Provider } from 'react-redux'

import App from '@/App'
import { setupI18n } from '@/locales'
import { setupDayjs } from '@/plugins/dayjs'
import { setupLoading } from '@/plugins/loading'
import { setupNProgress } from '@/plugins/nprogress'
import '@/plugins/assets'
import { preloadInitialRoute, setupRouter } from '@/router'
import { fetchLoginChatbiByOnenet } from '@/service/api/auth'
import { store } from '@/store'
import { syncAuthFromStorage } from '@/store/slice/auth'
import { resetLoginExpiredState } from '@/utils/auth'
import { localStg } from '@/utils/storage'
import { hasActiveLoginSession } from '@/pages/login/loginSessionSync'

import { initializeSessionSpace } from './sessionSpace'
import { startAbiSessionSync } from './sessionSync'
import { startAbiSpaceSync } from './spaceSync'

let root: Root | null = null
let stopSessionSync: (() => void) | undefined
let stopSpaceSync: (() => void) | undefined

async function setupOptionalIconify() {
  if (!import.meta.env.VITE_ICONIFY_URL) return

  const { setupIconifyOffline } = await import('@/plugins/iconify')
  setupIconifyOffline()
}

function RootErrorFallback({ error }: FallbackProps) {
  return (
    <div
      role="alert"
      style={{
        alignItems: 'center',
        background: '#f4f6fb',
        color: '#1f2937',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        height: '100%',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <strong style={{ fontSize: 20 }}>页面加载失败</strong>
      {import.meta.env.DEV ? <code style={{ maxWidth: 720 }}>{error.message}</code> : null}
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{ border: 0, borderRadius: 8, background: '#3366ff', color: '#fff', cursor: 'pointer', padding: '10px 22px' }}
      >
        重新加载
      </button>
    </div>
  )
}

export async function mountFullAbiApp(props: any, poweredByQiankun = false) {
  await setupI18n()
  setupLoading()

  const { basename, container, store: qiankunStore } = props
  void basename
  if (poweredByQiankun) {
    try {
      window.qiankunStore = qiankunStore
      qiankunStore.commit('setShowMenu', false)
      qiankunStore.commit('setShowHeader', false)
      const response = await fetchLoginChatbiByOnenet()
      localStg.set('token', response.data?.access_token)
      resetLoginExpiredState()
    } catch (error) {
      console.error('[abi] qiankun login bootstrap failed', error)
    }
  }

  setupNProgress()
  await setupOptionalIconify()
  if (!poweredByQiankun) {
    stopSessionSync?.()
    stopSessionSync = startAbiSessionSync()
    const token = localStg.get('token')
    if (!window.location.pathname.startsWith('/login') && hasActiveLoginSession(Boolean(token), token, localStg.get('userInfo'))) {
      await initializeSessionSpace({ restoreCachedSpace: true })
      store.dispatch(syncAuthFromStorage())
    }
  }
  if (!poweredByQiankun) preloadInitialRoute(window.location.pathname)
  stopSpaceSync?.()
  stopSpaceSync = startAbiSpaceSync()
  setupRouter()
  setupDayjs()

  const containerElement = container ? container.querySelector('#root') : document.getElementById('root')
  if (!containerElement) throw new Error('ABI root container is missing')
  root ??= createRoot(containerElement)
  root.render(
    <ErrorBoundary FallbackComponent={RootErrorFallback}>
      <Provider store={store}>
        <App />
      </Provider>
    </ErrorBoundary>,
  )
}

export function unmountFullAbiApp() {
  stopSpaceSync?.()
  stopSpaceSync = undefined
  stopSessionSync?.()
  stopSessionSync = undefined
  root?.unmount()
  root = null
  window.qiankunStore = null
}
