import { loadChatRuntimeConfig } from './bootstrap/config'
import { preloadInitialChatRoute } from './bootstrap/routePreload'
import { createChatStartupController } from './bootstrap/startup'

const root = document.getElementById('root')

// Start the application shell first so React/router receive network priority on a cold load.
// The exact route is still fetched in parallel and is normally ready before the router mounts it.
const appModulePromise = import('./bootstrap/app')
void preloadInitialChatRoute(window.location.hash).catch(() => {})

function renderLoading() {
  if (!root) return
  root.setAttribute('aria-busy', 'true')
  if (root.dataset.chatStartupRoute === 'task-new') return
  root.innerHTML = `
    <div class="chat-startup-loading" aria-label="加载中">
      <div class="chat-startup-loading__content">
        <div class="chat-startup-loading__spinner" aria-hidden="true">
          <div class="chat-startup-loading__spinner-inner">
            <div class="chat-startup-loading__dot"></div>
            <div class="chat-startup-loading__dot"></div>
            <div class="chat-startup-loading__dot"></div>
            <div class="chat-startup-loading__dot"></div>
          </div>
        </div>
        <h2 class="chat-startup-loading__title">正在准备对话环境...</h2>
      </div>
    </div>
  `
}

function renderError(error: Error, retry: () => void) {
  if (!root) return

  root.setAttribute('aria-busy', 'false')
  root.innerHTML = `
    <div class="chat-startup-loading chat-startup-error" role="alert">
      <div class="chat-startup-loading__content">
        <h2 class="chat-startup-loading__title">对话环境加载失败</h2>
        <p class="chat-startup-error__message"></p>
        <button class="chat-startup-error__retry" type="button">重新加载</button>
      </div>
    </div>
  `
  const message = root.querySelector<HTMLElement>('.chat-startup-error__message')
  if (message) message.textContent = error.message
  root.querySelector<HTMLButtonElement>('.chat-startup-error__retry')?.addEventListener('click', retry, { once: true })
}

const startup = createChatStartupController({
  applyConfig(config) {
    window.APP_CONFIG = config
  },
  loadApp: () => appModulePromise,
  loadConfig: signal => loadChatRuntimeConfig({ signal }),
  onError: renderError,
  onLoading: renderLoading,
  onReady() {
    root?.setAttribute('aria-busy', 'false')
  },
})

void startup.start()
window.addEventListener('beforeunload', startup.dispose, { once: true })
