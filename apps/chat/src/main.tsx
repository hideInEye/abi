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
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import 'virtual:svg-icons-register'
import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import { message } from 'antd';
// redux Provider已注释
// import { Provider } from 'react-redux';
// import { store } from './store/redux'; // 只导入store，移除persistor
// 移除PersistGate导入

const configPath = import.meta.env.MODE==='development' ? 'http://localhost:5173/config.json': '/chat-ui/config.json'
let root: ReturnType<typeof createRoot> | null = null
let mountedContainer: Element | null = null
let configAbortController: AbortController | null = null

function mountApp(props: any) {
  const { container, basename, onTokenExpired, spaceId } = props ?? {}

  // 将主应用传递的 token 过期处理函数挂载到 window 对象（卸载时清理）
  window.onTokenExpired = onTokenExpired

  const containerEl = container ? container.querySelector('#root') : document.getElementById('root')
  if (!containerEl) return

  // qiankun 多次 mount 时，避免重复 createRoot
  if (root && mountedContainer && mountedContainer !== containerEl) {
    root.unmount()
    root = null
    mountedContainer = null
  }

  if (!root) {
    root = createRoot(containerEl)
    mountedContainer = containerEl
  }

  const routerBase = (qiankunWindow as any)?.__POWERED_BY_QIANKUN__ ? (basename || '/') : '/'

  root.render(
    <StrictMode>
      {/* redux Provider已注释 */}
      {/* <Provider store={store}> */}
      {/* 移除PersistGate包装器，直接使用BrowserRouter */}
      <BrowserRouter basename={routerBase}>
        <Routes>
          <Route path="/" element={<App spaceId={spaceId} />} />
        </Routes>
      </BrowserRouter>
      {/* </Provider> */}
    </StrictMode>,
  )
}

function render(props: any) {
  // 取消上一轮（防止快速 mount/unmount 或重复 mount 时泄漏/竞态）
  configAbortController?.abort()
  configAbortController = new AbortController()

  fetch(configPath, { signal: configAbortController.signal })
    .then((res) => res.json())
    .then((config) => {
      window.APP_CONFIG = config
      mountApp(props)
    })
    .catch((err) => {
      if (err?.name === 'AbortError') return
      message.error('获取配置文件失败')
    })
}

const initQianKun = () => {
  renderWithQiankun(({
    mount(props: any) {
      console.log('mount',props);
      render(props);
    },
    bootstrap() {
      console.log('bootstrap');
    },
    unmount(_props: any) {
      console.log('unmount');
      localStorage.removeItem('chatId')

      // 取消 pending 的 config 拉取，避免卸载后仍 set 全局变量/渲染
      configAbortController?.abort()
      configAbortController = null

      // 卸载 React root，释放事件/订阅/DOM
      root?.unmount()
      root = null
      mountedContainer = null

      // 清理主应用注入的回调引用，避免跨次挂载复用旧函数
      try {
        delete window.onTokenExpired
      } catch {
        window.onTokenExpired = undefined
      }
    },
  }) as any);
}

if (qiankunWindow.__POWERED_BY_QIANKUN__) {
  initQianKun()
} else {
  render({});
}
