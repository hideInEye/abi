import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import AbiAssistant from './AbiAssistant'
import { normalizeThemeConfig, normalizeThemeId, type DeepPartial, type ThemeConfig } from './theme'

export const TAG_NAME = 'abi-assistant'

/**
 * <abi-assistant> 标签与 React 之间的桥：浏览器要求自定义元素必须是 HTMLElement 子类，
 * 这里只负责把标签属性透传给 React 组件（纯弹窗，不自带悬浮球）。
 * 面板关闭按钮会向外派发 close 事件，宿主系统自行决定如何隐藏。
 */
export class AbiAssistantElement extends HTMLElement {
  static get observedAttributes() {
    return ['share-code', 'base', 'theme', 'theme-switch', 'theme-config', 'api-key', 'secret-key']
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

    // 宿主可选直接传入初始自定义配置（JSON 串）；解析失败/非法字段经 normalizeThemeConfig 兜底为 undefined
    const themeConfigAttr = this.getAttribute('theme-config')
    let initialThemeConfig: DeepPartial<ThemeConfig> | undefined
    if (themeConfigAttr) {
      try {
        initialThemeConfig = normalizeThemeConfig(JSON.parse(themeConfigAttr))
      } catch {
        console.warn('[abi-assistant] theme-config 属性不是合法 JSON，已忽略')
      }
    }

    this.root ??= createRoot(this)
    this.root.render(
      createElement(AbiAssistant, {
        shareCode,
        apiBase,
        // 预设主题风格（背景/标题栏/字体/图表的基准）；非法/缺省值在 normalizeThemeId 内回退蓝色系
        theme: normalizeThemeId(this.getAttribute('theme')),
        // 带 theme-switch 属性时在悬浮窗头部显示“外观自定义”入口按钮（打开定制抽屉）
        themeSwitch: this.hasAttribute('theme-switch'),
        // 宿主注入的初始自定义配置（优先级低于接口下发与访客本地自定义）
        initialThemeConfig,
        // 第三方在平台创建的 API-Key 密钥对，分享页所有请求随 x-api-key / secrectKey 头携带
        apiKey: this.getAttribute('api-key') || undefined,
        secretKey: this.getAttribute('secret-key') || undefined,
        // 关闭按钮向外派发 close 事件，由宿主系统决定隐藏/移除
        onClose: () => this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true })),
      }),
    )
  }
}
