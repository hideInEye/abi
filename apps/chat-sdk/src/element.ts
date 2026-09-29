import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import AbiAssistant from './AbiAssistant'
import { normalizeThemeId } from './theme'

export const TAG_NAME = 'abi-assistant'

/**
 * <abi-assistant> 标签与 React 之间的桥：浏览器要求自定义元素必须是 HTMLElement 子类，
 * 这里只负责把标签属性透传给 React 组件（纯弹窗，不自带悬浮球）。
 * 面板关闭按钮会向外派发 close 事件，宿主系统自行决定如何隐藏。
 */
export class AbiAssistantElement extends HTMLElement {
  static get observedAttributes() {
    return ['share-code', 'base', 'theme', 'theme-switch']
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
        // 预设主题风格；非法/缺省值在 normalizeThemeId 内回退蓝色系
        theme: normalizeThemeId(this.getAttribute('theme')),
        // 带 theme-switch 属性时在悬浮窗头部显示主题切换按钮
        themeSwitch: this.hasAttribute('theme-switch'),
        // 关闭按钮向外派发 close 事件，由宿主系统决定隐藏/移除
        onClose: () => this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true })),
      }),
    )
  }
}
