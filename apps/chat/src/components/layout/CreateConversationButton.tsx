import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'

import { TASK_DETAIL_ROUTE } from '@/constant/layout'

interface CreateConversationButtonProps {
  collapsed: boolean
  onCreated?: () => void
  onToggleCollapse: () => void
}

/** SVG: sidebar panel icon with chevron (matches reference) */
function CollapseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <polyline points="15 9 12 12 15 15" />
    </svg>
  )
}

function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <polyline points="12 9 15 12 12 15" />
    </svg>
  )
}

export function CreateConversationButton({ collapsed, onCreated, onToggleCollapse }: CreateConversationButtonProps) {
  const navigate = useNavigate()

  const handleCreateNewChat = useCallback(() => {
    onCreated?.()
    navigate({
      to: TASK_DETAIL_ROUTE,
      params: { taskId: 'new' },
    })
  }, [navigate, onCreated])

  return (
    <div className="shrink-0 flex items-center gap-2 mx-4 mb-3">
      <button
        type="button"
        className="new-chat-primary-btn"
        onClick={handleCreateNewChat}
        style={{ padding: collapsed ? '10px 0' : '10px 18px' }}
      >
        <PlusOutlined style={{ fontSize: 14, fontWeight: 600 }} />
        {!collapsed && '新建对话'}
      </button>
      <button
        type="button"
        className="collapse-sidebar-btn"
        onClick={onToggleCollapse}
        title={collapsed ? '展开侧边栏' : '收起侧边栏'}
      >
        {collapsed ? <ExpandIcon /> : <CollapseIcon />}
      </button>
    </div>
  )
}
