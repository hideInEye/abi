// 与 chat main.tsx 同序：全局样式先于组件样式，构建期由 scopeGlobalCss 收进 .abi-cw-root
import './chat/index.css'
import ChatWidget from './chat/components/chat-widget/ChatWidget'
import { DEFAULT_THEME, type DeepPartial, type ThemeConfig, type ThemeId } from './theme'

export interface AbiAssistantProps {
  shareCode: string
  apiBase: string
  /** 预设主题风格（背景/标题栏/字体/图表的基准）：blue / light / dark，缺省蓝色系 */
  theme?: ThemeId
  /** 是否在悬浮窗头部显示“外观自定义”入口按钮（打开定制抽屉） */
  themeSwitch?: boolean
  /** 宿主注入的初始自定义配置（优先级低于接口下发与访客本地自定义） */
  initialThemeConfig?: DeepPartial<ThemeConfig>
  /** 点击面板关闭按钮时回调；SDK 不自带悬浮球/开关，显示与隐藏由宿主系统控制 */
  onClose?: () => void
  /** 第三方在平台创建的 API-Key，分享页所有请求随 x-api-key 头携带 */
  apiKey?: string
  /** 与 apiKey 配对的 secretKey，分享页所有请求随 secrectKey 头携带 */
  secretKey?: string
}

/** 纯弹窗：直接渲染对话面板，不含悬浮球等触发入口；打开按钮与显示/隐藏由宿主系统自行控制 */
export default function AbiAssistant({ shareCode, apiBase, theme = DEFAULT_THEME, themeSwitch = false, initialThemeConfig, onClose, apiKey, secretKey }: AbiAssistantProps) {
  return <ChatWidget apiBase={apiBase} mode="float" onClose={onClose} shareCode={shareCode} theme={theme} showThemeSwitch={themeSwitch} initialThemeConfig={initialThemeConfig} apiKey={apiKey} secretKey={secretKey} />
}
