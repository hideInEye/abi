import { AbiAssistantElement, TAG_NAME } from './element'

const STYLE_ID = 'abi-assistant-widget-styles'
const CSS_FILE = 'abi-assistant-widget.css'

/** 按脚本自身地址加载同目录的 CSS；宿主已手动 <link> 时不重复加载 */
function loadStyles(): void {
  if (document.getElementById(STYLE_ID)) return
  const script = document.currentScript as HTMLScriptElement | null
  if (!script?.src) return

  const href = new URL(CSS_FILE, script.src).href
  if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) return

  const link = document.createElement('link')
  link.id = STYLE_ID
  link.rel = 'stylesheet'
  link.href = href
  document.head.appendChild(link)
}

if (typeof window !== 'undefined' && 'customElements' in window) {
  loadStyles()
  if (!customElements.get(TAG_NAME)) {
    customElements.define(TAG_NAME, AbiAssistantElement)
  }
}
