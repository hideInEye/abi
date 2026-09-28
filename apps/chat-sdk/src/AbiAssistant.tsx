import { useEffect, useState } from 'react'

// 与 chat main.tsx 同序：全局样式先于组件样式，构建期由 scopeGlobalCss 收进 .abi-cw-root
import './chat/index.css'
import ChatWidget from './chat/components/chat-widget/ChatWidget'
import { DEFAULT_THEME, type ThemeId } from './theme'
import './launcher.css'

export interface AbiAssistantProps {
  shareCode: string
  apiBase: string
  /** 初始是否展开面板；未展开时只显示右下角悬浮球 */
  defaultOpen?: boolean
  /** 预设主题风格：blue / light / dark，缺省现状蓝色系 */
  theme?: ThemeId
}

const LauncherIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
)

/** 悬浮球 + 分享页对话面板：面板关闭后退回悬浮球，可再次唤起 */
export default function AbiAssistant({ shareCode, apiBase, defaultOpen = false, theme = DEFAULT_THEME }: AbiAssistantProps) {
  const [open, setOpen] = useState(defaultOpen)

  // 宿主动态改 open 属性时同步；shareCode 切换后面板内部按新分享码重新校验
  useEffect(() => setOpen(defaultOpen), [defaultOpen])

  if (open) {
    return <ChatWidget apiBase={apiBase} mode="float" onClose={() => setOpen(false)} shareCode={shareCode} theme={theme} />
  }

  return (
    <button type="button" className="abi-cw-launcher" onClick={() => setOpen(true)} aria-label="打开 AI 助手" title="AI 助手">
      {LauncherIcon}
    </button>
  )
}
