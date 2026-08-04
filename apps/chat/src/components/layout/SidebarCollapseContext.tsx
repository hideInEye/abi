import { createContext, useContext } from 'react'
import type { PropsWithChildren } from 'react'

export interface SidebarCollapseContextValue {
  /** 系统侧栏当前是否处于收起状态。 */
  collapsed: boolean
  /** 用户主动切换侧栏展开/收起。 */
  toggleSidebar: () => void
  /** 业务场景只需要收起侧栏时使用；重复调用不会反向展开。 */
  collapseSidebar: () => void
}

const SidebarCollapseContext = createContext<SidebarCollapseContextValue | null>(null)

interface SidebarCollapseProviderProps extends PropsWithChildren {
  value: SidebarCollapseContextValue
}

/**
 * 只负责向工作台子页面透传顶层侧栏控制能力，不在 Context 内复制布局状态。
 */
export function SidebarCollapseProvider({ children, value }: SidebarCollapseProviderProps) {
  return <SidebarCollapseContext.Provider value={value}>{children}</SidebarCollapseContext.Provider>
}

export function useSidebarCollapse(): SidebarCollapseContextValue {
  const context = useContext(SidebarCollapseContext)

  if (!context) {
    throw new Error('useSidebarCollapse must be used within SidebarCollapseProvider')
  }

  return context
}
