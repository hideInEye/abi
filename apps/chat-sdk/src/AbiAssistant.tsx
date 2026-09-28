// 与 chat main.tsx 同序：全局样式先于组件样式，构建期由 scopeGlobalCss 收进 .abi-cw-root
import './chat/index.css'
import ChatWidget from './chat/components/chat-widget/ChatWidget'
import { DEFAULT_THEME, type ThemeId } from './theme'

export interface AbiAssistantProps {
  shareCode: string
  apiBase: string
  /** 预设主题风格：blue / dark，缺省蓝色系 */
  theme?: ThemeId
  /** 是否在悬浮窗头部显示主题切换按钮（蓝色系 / 黑色系） */
  themeSwitch?: boolean
  /** 点击面板关闭按钮时回调；SDK 不自带悬浮球/开关，显示与隐藏由宿主系统控制 */
  onClose?: () => void
}

/** 纯弹窗：直接渲染对话面板，不含悬浮球等触发入口；打开按钮与显示/隐藏由宿主系统自行控制 */
export default function AbiAssistant({ shareCode, apiBase, theme = DEFAULT_THEME, themeSwitch = false, onClose }: AbiAssistantProps) {
  return <ChatWidget apiBase={apiBase} mode="float" onClose={onClose} shareCode={shareCode} theme={theme} showThemeSwitch={themeSwitch} />
}
