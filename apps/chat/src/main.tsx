declare global {
  interface Window {
    APP_CONFIG: any;
    onTokenExpired?: () => Promise<void>;
  }
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import 'virtual:svg-icons-register'
import { message } from 'antd';
import { syncBootParamsFromUrl } from './router/syncBootParams';
// redux Provider已注释
// import { Provider } from 'react-redux';
// import { store } from './store/redux'; // 只导入store，移除persistor
// 移除PersistGate导入

const configPath = `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}config.json`
let root: ReturnType<typeof createRoot> | null = null
let configAbortController: AbortController | null = null

function mountApp() {
  syncBootParamsFromUrl()

  const spaceId = Number(localStorage.getItem('spaceId')) || undefined

  const containerEl = document.getElementById('root')
  if (!containerEl) return

  if (!root) {
    root = createRoot(containerEl)
  }

  root.render(
    <StrictMode>
      <App spaceId={spaceId} />
    </StrictMode>,
  )
}

function render() {
  // 取消上一轮（防止快速 mount/unmount 或重复 mount 时泄漏/竞态）
  configAbortController?.abort()
  configAbortController = new AbortController()

  fetch(configPath, { signal: configAbortController.signal })
    .then((res) => res.json())
    .then((config) => {
      window.APP_CONFIG = config
      mountApp()
    })
    .catch((err) => {
      if (err?.name === 'AbortError') return
      message.error('获取配置文件失败')
    })
}

render()
