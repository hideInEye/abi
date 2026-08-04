import { useSidebarCollapse } from './SidebarCollapseContext'

interface SidebarCollapseButtonProps {
  className?: string
}

function CollapseIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <polyline points="15 9 12 12 15 15" />
    </svg>
  )
}

function ExpandIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <polyline points="12 9 15 12 12 15" />
    </svg>
  )
}

/** 各内容页共用的系统侧栏控制入口，图标和可访问文案保持一致。 */
export function SidebarCollapseButton({ className }: SidebarCollapseButtonProps) {
  const { collapsed, toggleSidebar } = useSidebarCollapse()
  const label = collapsed ? '展开侧边栏' : '收起侧边栏'
  const classes = ['collapse-sidebar-btn', className].filter(Boolean).join(' ')

  return (
    <button type="button" className={classes} title={label} aria-label={label} aria-controls="chat-workbench-sidebar" aria-expanded={!collapsed} onClick={toggleSidebar}>
      {collapsed ? <ExpandIcon /> : <CollapseIcon />}
    </button>
  )
}
