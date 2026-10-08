let assistantSdkPromise: Promise<void> | null = null

// bundle 文件名无内容 hash，浏览器会强缓存旧版：dev 带时间戳永远拉新，生产带版本号（发新产物后 bump）
const WIDGET_VERSION = import.meta.env.DEV ? String(Date.now()) : '20261008-1740'

function loadAssistantSdk(): Promise<void> {
  if (assistantSdkPromise) return assistantSdkPromise

  const stylesheet = document.createElement('link')
  stylesheet.id = 'abi-assistant-widget-styles'
  stylesheet.rel = 'stylesheet'
  stylesheet.href = `/chat-ui/abi-assistant-widget.css?v=${WIDGET_VERSION}`
  const script = document.createElement('script')
  script.src = `/chat-ui/abi-assistant-widget.js?v=${WIDGET_VERSION}`
  script.async = true

  const load = (element: HTMLLinkElement | HTMLScriptElement) => new Promise<void>((resolve, reject) => {
    element.onload = () => resolve()
    element.onerror = () => reject(new Error('助手分享资源加载失败，请重试'))
    document.head.appendChild(element)
  })

  assistantSdkPromise = Promise.all([load(stylesheet), load(script)]).then(() => {
    if (!customElements.get('abi-assistant')) throw new Error('助手分享组件初始化失败，请重试')
  }).catch(error => {
    stylesheet.remove()
    script.remove()
    assistantSdkPromise = null
    throw error
  })
  return assistantSdkPromise
}

export async function mountAssistantShare(shareCode: string): Promise<void> {
  const container = document.getElementById('root')
  if (!container) throw new Error('ABI root container is missing')
  await loadAssistantSdk()
  const assistant = document.createElement('abi-assistant')
  assistant.setAttribute('share-code', shareCode)
  assistant.setAttribute('base', '/api')
  assistant.setAttribute('theme-switch', '')
  assistant.addEventListener('close', () => assistant.remove())
  container.replaceChildren(assistant)
}

export function mountShareBridge(targetUrl: string) {
  const container = document.getElementById('root')
  if (!container) throw new Error('ABI root container is missing')

  const iframe = document.createElement('iframe')
  iframe.src = targetUrl
  iframe.title = '分享页面'
  iframe.setAttribute('aria-label', '分享页面')
  iframe.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;border:0;background:#f4f6fb;'
  container.replaceChildren(iframe)
}
