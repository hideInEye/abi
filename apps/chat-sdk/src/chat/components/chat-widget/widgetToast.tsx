import { useEffect, useRef, useState, type ReactNode } from 'react'

export type WidgetToastKind = 'success' | 'error' | 'warning' | 'info'

/* 语义图标（线宽同悬浮窗头部风格）：尺寸/存在感对齐 antd message，窗内也一眼可见 */
const TOAST_ICONS: Record<WidgetToastKind, ReactNode> = {
  success: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="8.5 12.5 11 15 15.5 9.5" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <line x1="9.5" y1="9.5" x2="14.5" y2="14.5" />
      <line x1="14.5" y1="9.5" x2="9.5" y2="14.5" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4 2.8 19.5h18.4Z" />
      <line x1="12" y1="10" x2="12" y2="14" />
      <circle cx="12" cy="16.8" r="0.4" fill="currentColor" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16" />
      <circle cx="12" cy="8" r="0.4" fill="currentColor" />
    </svg>
  ),
}

interface WidgetToast {
  kind: WidgetToastKind
  text: string
  /** 触发序号：同文案连续提示也能重播入场动画 */
  key: number
}

/* 模块级推送口：图表卡等子组件无需层层传 props 即可在窗内提示；宿主挂载后指向唯一 host */
let pushToast: ((t: WidgetToast) => void) | null = null

/** 悬浮窗内提示（替代 body 级 antd message：静态 message 挂在文档流顶层，会被悬浮面板遮挡） */
export function showWidgetToast(kind: WidgetToastKind, text: string) {
  pushToast?.({ kind, text, key: Date.now() })
}

/** 通知条宿主：挂载在面板内标题栏下方，3s 自动消失；不占布局、不吃指针事件 */
export function WidgetToastHost() {
  const [toast, setToast] = useState<WidgetToast | null>(null)
  const timerRef = useRef<number>()

  useEffect(() => {
    pushToast = (t) => {
      setToast(t)
      window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setToast(null), 3000)
    }
    return () => {
      pushToast = null
      window.clearTimeout(timerRef.current)
    }
  }, [])

  if (!toast) return null
  return (
    <div key={toast.key} className={`abi-cw-toast abi-cw-toast-${toast.kind}`} role="status">
      {TOAST_ICONS[toast.kind]}
      <span>{toast.text}</span>
    </div>
  )
}
