import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import AbiAssistant from './AbiAssistant'
import { normalizeThemeId } from './theme'

export const TAG_NAME = 'abi-assistant'

/**
 * <abi-assistant> 标签与 React 之间的桥：浏览器要求自定义元素必须是 HTMLElement 子类，
 * 这里只负责把标签属性透传给 React 组件，所有交互状态都在 AbiAssistant 组件内。
 */
export class AbiAssistantElement extends HTMLElement {
  static get observedAttributes() {
    return ['share-code', 'base', 'open', 'theme']
  }

  private root: Root | null = null

  connectedCallback() {
    this.style.display = 'contents'
    this.render()
  }

  disconnectedCallback() {
    this.root?.unmount()
    this.root = null
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render()
  }

  private render() {
    const shareCode = this.getAttribute('share-code') || ''
    if (!shareCode) {
      console.warn('[abi-assistant] 缺少 share-code 属性，悬浮窗不会渲染')
      return
    }

    // 未传 base 时退回宿主同源；请求层通过 APP_CONFIG 读取网关地址
    const apiBase = (this.getAttribute('base') || window.location.origin).replace(/\/$/, '')
    window.APP_CONFIG = { ...(window.APP_CONFIG || {}), VITE_BASE_API: apiBase }

    this.root ??= createRoot(this)
    this.root.render(
      createElement(AbiAssistant, {
        shareCode,
        apiBase,
        defaultOpen: this.hasAttribute('open'),
        // 预设主题风格；非法/缺省值在 normalizeThemeId 内回退蓝色系
        theme: normalizeThemeId(this.getAttribute('theme')),
      }),
    )
  }
}
